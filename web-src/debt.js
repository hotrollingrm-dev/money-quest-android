/* MONEY QUEST — Smart Debt engine (pure functions, no DOM).
   Money is computed in integer satang to avoid floating-point drift; results come back in baht (2 dp).
   Every simulation returns `assumptions` so the UI can say what it assumed. Nothing here mutates the
   user's real data except applyPayment / recordStatement, which the UI calls only after confirmation. */
(function (root) {
"use strict";
const M = typeof module !== "undefined" ? require("./engine.js") : root.MQ;
const { ymd, parse, addDays, diffDays, monthKey, addMonths, daysInMonth, clampDay, uid } = M;

/* ── satang-safe money ── */
const st = x => Math.round((+x || 0) * 100);           // baht → satang (int)
const bt = s => Math.round(s) / 100;                    // satang → baht
const pct = (s, p) => Math.round(s * p / 100);          // p% of satang
const sumS = a => a.reduce((s, x) => s + x, 0);
const monthsBetween = (a, b) => { const [y1, m1] = a.split("-").map(Number), [y2, m2] = b.split("-").map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const TYPES = { card: "บัตรเครดิต", cash: "บัตรกดเงินสด", personal: "สินเชื่อส่วนบุคคล", bnpl: "ผ่อนรายเดือน (Shopee ฯลฯ)", home: "สินเชื่อบ้าน", car: "สินเชื่อรถ", other: "หนี้อื่น ๆ" };
const REFS = ["MRR", "MLR", "MOR"];
/** revolving (card, cash card) · bnpl (pay-later account made of installments) · flat (hire purchase) · loan (reducing balance) */
function kindOf(d) {
  if (d.type === "bnpl") return "bnpl";
  if (d.type === "card" || d.type === "cash" || d.method === "card") return "revolving";
  if (d.method === "flat") return "flat";
  return "loan";
}
const live = (s, today) => s.debts.filter(d => d.status !== "closed" && !(d.closedAt && d.closedAt <= today));

/* ═════════ reference rates & rate schedules ═════════ */
/** Reference rate (MRR/MLR/MOR) of a bank in force on `date`. History is append-only. */
function refRateAt(state, bank, ref, date) {
  const rows = (state.refRates || []).filter(r => r.bank === bank && r.ref === ref && r.effective <= date && r.confirmed !== false)
    .sort((a, b) => a.effective.localeCompare(b.effective) || a.createdAt - b.createdAt);
  return rows.length ? rows[rows.length - 1] : null;
}
/** Contract rate on `date`: picks the schedule step in force (step-up / step-down), then fixed or ref ± margin. */
function rateAt(state, d, date) {
  const steps = (d.rates && d.rates.length ? d.rates : [{ from: "1900-01-01", kind: "fixed", rate: +d.apr || 0 }]).slice().sort((a, b) => a.from.localeCompare(b.from));
  let s = steps[0]; for (const x of steps) if (x.from <= date) s = x;
  if (s.kind === "float") {
    const r = refRateAt(state, d.refBank || d.lender, s.ref, date);
    if (!r) return { rate: null, step: s, missing: `ยังไม่มีค่า ${s.ref} ของ ${d.refBank || d.lender || "ธนาคาร"}` };
    return { rate: Math.round((+r.rate + +s.margin) * 10000) / 10000, step: s, ref: r };
  }
  return { rate: +s.rate, step: s };
}
/** Dates inside (from, to] where the contract rate may change (schedule steps + ref-rate effective dates). */
function rateBreaks(state, d, from, to) {
  const out = new Set();
  for (const s of d.rates || []) if (s.from > from && s.from <= to) out.add(s.from);
  for (const r of state.refRates || []) if (r.bank === (d.refBank || d.lender) && r.effective > from && r.effective <= to) out.add(r.effective);
  return [...out].sort();
}
/** Interest in satang on `bal` from date a (exclusive) to b (inclusive), splitting at every rate change. */
function accrue(state, d, balS, a, b) {
  let total = 0, cur = a; const pts = [...rateBreaks(state, d, a, b), b]; const notes = [];
  for (const p of pts) {
    if (p <= cur) continue;
    const { rate, missing } = rateAt(state, d, addDays(cur, 1));
    if (rate == null) { notes.push(missing); cur = p; continue; }
    if (d.dayCount === "30360") total += balS * rate / 100 * 30 / 360 * (diffDays(cur, p) / Math.max(1, diffDays(a, b)));
    else {
      // actual days; "actact" uses 366 for days falling in leap years
      let x = cur; while (x < p) { const y = parse(x).getFullYear(); const yEnd = `${y}-12-31`; const seg = Math.min(diffDays(x, p), diffDays(x, yEnd) + (yEnd < p ? 1 : 0)) || diffDays(x, p);
        const basis = d.dayCount === "actact" && isLeap(y) ? 366 : 365; total += balS * rate / 100 * seg / basis; x = addDays(x, seg); }
    }
    cur = p;
  }
  return { interest: Math.round(total), notes };
}

/* ═════════ loans: amortization, prepayment ═════════ */
const nextDue = (dueDay, after) => { let mk = monthKey(after), d = clampDay(mk, dueDay); if (d <= after) d = clampDay(addMonths(mk, 1), dueDay); return d; };
function lastPaid(state, d) {
  const ps = (state.debtPayments || []).filter(p => p.debtId === d.id && !p.deletedAt).sort((a, b) => a.date.localeCompare(b.date));
  return ps.length ? ps[ps.length - 1].date : null;
}
const annuity = (balS, ratePct, n) => { if (n <= 0) return balS; const r = ratePct / 1200; return r ? Math.round(balS * r / (1 - Math.pow(1 + r, -n))) : Math.ceil(balS / n); };
function paidCount(state, d) { return (state.debtPayments || []).filter(p => p.debtId === d.id && !p.deletedAt && p.kind !== "extra").length + (+d.paidBefore || 0); }

/**
 * Month-by-month schedule from the current balance.
 * opts: from (accrual start, default last payment / today), extras [{date, amount}], monthlyExtra, extraFrom,
 *       mode "term" (keep installment, finish sooner) | "pay" (keep end date, lower installment), max.
 */
function amortize(state, d, opts = {}) {
  const today = opts.today || ymd(new Date());
  if (kindOf(d) === "flat") return flatSchedule(state, d, opts);
  let bal = st(d.balance), prev = opts.from || lastPaid(state, d) || today;
  let pay = st(opts.pay != null ? opts.pay : d.monthlyPay);
  const mode = opts.mode || (d.prepay && d.prepay.mode) || "term";
  const termLeft0 = +d.termMonths ? Math.max(1, +d.termMonths - paidCount(state, d)) : null;
  const extras = (opts.extras || []).map(e => ({ date: e.date, s: st(e.amount) })).sort((a, b) => a.date.localeCompare(b.date));
  const mx = st(opts.monthlyExtra || 0), feePct = d.prepay ? +d.prepay.feePct || 0 : 0, feeUntil = d.prepay ? d.prepay.feeUntil || "" : "";
  const rows = [], warnings = new Set(), notes = new Set();
  let n = 0, totI = 0, totP = 0, totX = 0, totFee = 0;
  while (bal > 0 && n < (opts.max || 600)) {
    n++;
    const due = nextDue(+d.dueDay || 1, prev);
    const ac = accrue(state, d, bal, prev, due); ac.notes.forEach(x => notes.add(x));
    const interest = ac.interest;
    let p = pay;
    if (p <= interest && bal > 0) { warnings.add("ค่างวดไม่พอจ่ายดอกเบี้ย ยอดหนี้จะไม่ลด"); }
    p = Math.min(p, bal + interest);
    const principal = Math.max(0, p - interest);
    bal -= principal; totI += Math.min(p, interest); totP += p;
    // extra principal (lump sums in this period + monthly extra)
    let x = 0; for (const e of extras) if (e.date > prev && e.date <= due) x += e.s;
    if (mx && (!opts.extraFrom || due >= opts.extraFrom)) x += mx;
    x = Math.min(x, bal);
    let fee = 0; if (x > 0 && feePct && (!feeUntil || due <= feeUntil)) fee = pct(x, feePct);
    bal -= x; totX += x; totFee += fee;
    const { rate } = rateAt(state, d, due), applied = rateAt(state, d, addDays(prev, 1)).rate;
    rows.push({ n, date: due, rate: applied, pay: bt(p), interest: bt(Math.min(p, interest)), principal: bt(principal), extra: bt(x), fee: bt(fee), balance: bt(bal) });
    if (x > 0 && mode === "pay" && termLeft0) { const left = Math.max(1, termLeft0 - n); pay = annuity(bal, rate || 0, left); }
    if (warnings.size && principal === 0 && x === 0) break;
    prev = due;
  }
  return { rows, months: bal > 0 ? Infinity : rows.length, payoff: bal > 0 ? null : (rows.length ? rows[rows.length - 1].date : today),
    totalInterest: bt(totI), totalPaid: bt(totP + totX + totFee), totalExtra: bt(totX), totalFee: bt(totFee),
    warnings: [...warnings], notes: [...notes],
    assumptions: [
      `ดอกเบี้ยคิดตามจำนวนวันจริงระหว่างงวด ฐาน ${d.dayCount === "30360" ? "30/360" : d.dayCount === "actact" ? "365/366 (ปีอธิกสุรทิน 366)" : "365 วัน"}`,
      "จ่ายตรงวันครบกำหนดทุกงวด", "ดอกเบี้ยลอยตัวใช้ค่าอ้างอิงล่าสุดที่บันทึกไว้ต่อไปเรื่อย ๆ",
      mode === "pay" ? "เงินโปะลดค่างวด (ระยะเวลาคงเดิม)" : "เงินโปะลดระยะเวลาผ่อน (ค่างวดคงเดิม)",
      feePct ? `ค่าธรรมเนียมโปะ ${feePct}%${feeUntil ? ` ถึง ${feeUntil}` : ""} ไม่ตัดเงินต้น` : "ไม่มีค่าธรรมเนียมโปะ (ตามที่ตั้งไว้)"] };
}
/** Hire-purchase (flat rate): interest fixed at contract start, spread evenly. Never treat as reducing balance. */
function flatInstallment(d) {
  const P = st(d.principal), n = +d.termMonths || 1, I = Math.round(P * (+d.apr / 100) * n / 12);
  return { installment: bt(Math.ceil((P + I) / n)), interestPer: bt(Math.round(I / n)), principalPer: bt(Math.round(P / n)), totalInterest: bt(I) };
}
function flatSchedule(state, d, opts = {}) {
  const f = flatInstallment(d), today = opts.today || ymd(new Date());
  let bal = st(d.balance), prev = opts.from || lastPaid(state, d) || today; const rows = []; let n = 0, ti = 0;
  while (bal > 0 && n < 600) { n++; const due = nextDue(+d.dueDay || 1, prev); const p = Math.min(bal, st(f.installment)); const i = Math.min(p, st(f.interestPer));
    bal -= p; ti += i; rows.push({ n, date: due, rate: +d.apr, pay: bt(p), interest: bt(i), principal: bt(p - i), extra: 0, fee: 0, balance: bt(bal) }); prev = due; }
  return { rows, months: rows.length, payoff: rows.length ? rows[rows.length - 1].date : today, totalInterest: bt(ti), totalPaid: bt(sumS(rows.map(r => st(r.pay)))), totalExtra: 0, totalFee: 0, warnings: [], notes: [],
    assumptions: ["เช่าซื้อคิดดอกเบี้ยแบบคงที่ (flat) ตลอดสัญญา", "ยอดคงเหลือนับรวมดอกเบี้ยที่ยังไม่ถึงงวด", "ส่วนลดเมื่อปิดก่อนกำหนดขึ้นกับสัญญา ไม่ได้คำนวณ"] };
}
/** Compare a prepayment plan against the current plan. */
function prepaySim(state, d, plan = {}, today = ymd(new Date())) {
  const base = amortize(state, d, { today });
  const firstDate = plan.date || nextDue(+d.dueDay || 1, today);
  const extras = plan.lump ? [{ date: firstDate, amount: plan.lump }] : [];
  const sim = amortize(state, d, { today, extras, monthlyExtra: plan.monthly || 0, mode: plan.mode, extraFrom: plan.monthlyFrom });
  const feeNow = plan.lump && d.prepay && +d.prepay.feePct && (!d.prepay.feeUntil || firstDate <= d.prepay.feeUntil) ? bt(pct(st(plan.lump), +d.prepay.feePct)) : 0;
  return {
    base, sim, cashNeeded: bt(st(plan.lump || 0) + st(feeNow)), feeNow,
    newPrincipal: bt(Math.max(0, st(d.balance) - st(plan.lump || 0))),
    interestBefore: base.totalInterest, interestAfter: sim.totalInterest,
    interestSaved: bt(st(base.totalInterest) - st(sim.totalInterest) - st(sim.totalFee)),
    monthsSaved: isFinite(base.months) && isFinite(sim.months) ? base.months - sim.months : null,
    payoffBefore: base.payoff, payoffAfter: sim.payoff,
    newPay: sim.rows.length > 1 ? sim.rows[1].pay : null,
    blocked: d.prepay && d.prepay.allowed === false ? "สัญญานี้ไม่อนุญาตให้โปะ / ต้องติดต่อธนาคารก่อน" : null
  };
}
function loanProgress(state, d, today = ymd(new Date())) {
  const pays = (state.debtPayments || []).filter(p => p.debtId === d.id && !p.deletedAt);
  const orig = st(d.principal || d.balance), bal = st(d.balance);
  const am = amortize(state, d, { today });
  return { principal: bt(orig), paidPrincipal: bt(Math.max(0, orig - bal)), balance: bt(bal), interestPaid: bt(sumS(pays.map(p => st(p.interest)))) + (+d.interestPaidBefore || 0),
    projectedInterest: am.totalInterest, pct: orig ? Math.max(0, Math.min(1, (orig - bal) / orig)) : 0,
    paidCount: paidCount(state, d), monthsLeft: am.months, payoff: am.payoff, rate: rateAt(state, d, today), am };
}

/* ═════════ credit cards: cycles, statements, installments ═════════ */
/** The statement whose due date falls in month mk. Due ≤ statement day ⇒ due is the next month. */
function cycleFor(d, mk) {
  const sd = +d.statementDay || 1, dd = +d.dueDay || 1, nextMonthDue = dd <= sd;
  const stMonth = nextMonthDue ? addMonths(mk, -1) : mk;
  return { stMonth, stDate: clampDay(stMonth, sd), due: clampDay(mk, dd), nextSt: clampDay(addMonths(stMonth, 1), sd) };
}
/** Monthly amount of an installment plan. 0% → (price−down)/n; flat → add flat interest; reducing → annuity. */
function instMonthly(it) {
  if (+it.monthly) return st(it.monthly);
  const P = st(it.price) - st(it.down), n = +it.n || 1;
  if (it.kind === "flat") return Math.ceil((P + Math.round(P * (+it.apr || 0) / 100 * n / 12)) / n);
  if (it.kind === "reducing") return annuity(P, +it.apr || 0, n);
  return Math.ceil(P / n);
}
/** How many installments have been billed through statement month mk. */
function instBilled(it, mk) { return Math.max(0, Math.min(+it.n, monthsBetween(it.firstMonth, mk) + 1)); }
function instInfo(it, mk) {
  const n = +it.n || 1, m = instMonthly(it), billed = it.closedAt ? n : instBilled(it, mk), left = n - billed;
  const total = m * n, lastAdj = total - (st(it.price) - st(it.down)); // 0% rounding remainder (≥0)
  return { n, monthly: bt(m), billed, left, remaining: bt(Math.max(0, m * left - (it.kind === "zero" || !it.kind ? Math.max(0, left ? lastAdj : 0) : 0))),
    endMonth: addMonths(it.firstMonth, n - 1), done: left <= 0, interestTotal: it.kind && it.kind !== "zero" ? bt(total - (st(it.price) - st(it.down))) : 0 };
}
const instsOf = (state, debtId) => (state.installments || []).filter(i => i.debtId === debtId && !i.deletedAt);
const instDueIn = (state, debtId, stMonth) => sumS(instsOf(state, debtId).filter(i => !i.closedAt && monthsBetween(i.firstMonth, stMonth) >= 0 && monthsBetween(i.firstMonth, stMonth) < +i.n).map(instMonthly));
const recurringOn = (state, debtId) => sumS((state.expenses || []).filter(e => e.active !== false && e.payDebtId === debtId).map(e => st(e.amount)));
/** Minimum due. Uses the user's rule; if the bank rule was never entered it is flagged as an assumption. */
function minDue(d, amountS, instS) {
  const revolving = Math.max(0, amountS - instS);
  const pctPart = pct(revolving, +d.minPct || 0), floor = st(d.minAmount || 0);
  const m = Math.min(amountS, instS + Math.max(pctPart, Math.min(floor, revolving)));
  return { min: m, assumed: !d.minKnown, rule: `${+d.minPct || 0}% ของยอดหมุนเวียน${+d.minAmount ? ` ขั้นต่ำ ${bt(floor)} บาท` : ""} + ยอดผ่อนเต็มงวด` };
}
const paidBetween = (state, id, a, b) => sumS((state.debtPayments || []).filter(p => p.debtId === id && !p.deletedAt && p.date > a && p.date <= b).map(p => st(p.amount)));
/** Average new spending per statement (statement − installments) from the last 3 confirmed statements. */
function spendPattern(state, d) {
  const sts = (state.cardStatements || []).filter(s => s.debtId === d.id && !s.deletedAt).sort((a, b) => b.stDate.localeCompare(a.stDate)).slice(0, 3);
  if (!sts.length) return null;
  return Math.round(sumS(sts.map(s => Math.max(0, st(s.newSpend != null ? s.newSpend : s.amount) - (s.newSpend != null ? 0 : instDueIn(state, d.id, monthKey(s.stDate)))))) / sts.length);
}
/** The bill a revolving account must pay in month mk: confirmed statement or a labelled estimate. */
function cardBill(state, d, mk, today = ymd(new Date())) {
  const c = cycleFor(d, mk);
  const stmt = (state.cardStatements || []).find(s => s.debtId === d.id && !s.deletedAt && monthKey(s.stDate) === c.stMonth);
  const inst = instDueIn(state, d.id, c.stMonth), rec = recurringOn(state, d.id);
  let amount, source, parts;
  if (stmt) { amount = st(stmt.amount); source = "confirmed"; parts = { installments: inst, statement: amount }; }
  else if (c.stDate <= today) { amount = st(d.balance) + paidBetween(state, d.id, c.stDate, today); source = "unrecorded"; parts = { installments: inst, balance: amount }; }
  else {
    const isNext = c.stDate <= cycleFor(d, monthKey(today)).nextSt || monthsBetween(monthKey(today), c.stMonth) <= 0;
    const pattern = spendPattern(state, d);
    const spend = isNext ? Math.max(st(d.unbilled), rec) : (pattern != null ? pattern : rec);
    const carry = d.payPlan === "full" || !isNext ? 0 : 0; // carried revolving balance is unknown until the statement; shown separately
    amount = inst + spend + carry; source = "estimated"; parts = { installments: inst, spend, recurring: rec, pattern };
  }
  const md = stmt && +stmt.min ? { min: st(stmt.min), assumed: false } : minDue(d, amount, Math.min(inst, amount));
  const pp = d.payPlan || "min";
  const plan = pp === "min" ? md.min : pp === "custom" ? Math.min(amount, Math.max(md.min, st(d.payCustom))) : amount;
  const paid = paidBetween(state, d.id, c.stDate, c.nextSt);
  const status = amount <= 0 ? "none" : paid >= plan ? "paid" : today > c.due ? (paid >= md.min ? "partial" : "overdue") : source === "confirmed" ? "confirmed" : "estimated";
  return { debt: d, mk, ...c, source, amount: bt(amount), min: bt(md.min), minAssumed: md.assumed, plan: bt(plan), paid: bt(paid), left: bt(Math.max(0, plan - paid)),
    installments: bt(inst), parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v == null ? null : bt(v)])), status, daysToDue: diffDays(today, c.due) };
}
/** Pay-later account (Shopee etc.): bill for month mk = installments due that month. */
function bnplBill(state, d, mk, today = ymd(new Date())) {
  const due = clampDay(mk, +d.dueDay || 1), inst = instDueIn(state, d.id, mk);
  const paid = paidBetween(state, d.id, clampDay(addMonths(mk, -1), +d.dueDay || 1), due) + sumS((state.debtPayments || []).filter(p => p.debtId === d.id && !p.deletedAt && monthKey(p.date) === mk && p.date > due).map(p => st(p.amount)));
  const status = inst <= 0 ? "none" : paid >= inst ? "paid" : today > due ? "overdue" : "confirmed";
  return { debt: d, mk, due, source: "confirmed", amount: bt(inst), min: bt(inst), plan: bt(inst), paid: bt(paid), left: bt(Math.max(0, inst - paid)), installments: bt(inst), status, daysToDue: diffDays(today, due) };
}
/** Pay-later balance = installments not billed yet + whatever of this month's bill is still unpaid. */
function bnplOutstanding(state, d, mk, today) {
  const b = bnplBill(state, d, mk, today);
  return sumS(instsOf(state, d.id).map(i => st(instInfo(i, mk).remaining))) + Math.max(0, st(b.amount) - st(b.paid));
}
function utilization(state, d, today = ymd(new Date())) {
  const used = st(d.balance) + st(d.unbilled) + sumS(instsOf(state, d.id).map(i => st(instInfo(i, cycleFor(d, monthKey(today)).stMonth).remaining)));
  const lim = st(d.limit); return { used: bt(used), limit: bt(lim), available: bt(Math.max(0, lim - used)), pct: lim ? used / lim : 0 };
}
/** Record a statement (actual data). Keeps history; sets the billed balance. */
function recordStatement(state, debtId, s) {
  const d = state.debts.find(x => x.id === debtId); if (!d) throw new Error("debt not found");
  state.cardStatements = state.cardStatements || [];
  const dup = state.cardStatements.find(x => x.debtId === debtId && !x.deletedAt && monthKey(x.stDate) === monthKey(s.stDate));
  if (dup) dup.deletedAt = Date.now(); // replaced, still kept for audit
  const sm = monthKey(s.stDate), dueDate = s.dueDate || (+d.dueDay <= +d.statementDay ? clampDay(addMonths(sm, 1), +d.dueDay) : clampDay(sm, +d.dueDay));
  const row = { id: uid(), debtId, stDate: s.stDate, dueDate,
    amount: +s.amount, min: s.min != null && s.min !== "" ? +s.min : null, newSpend: s.newSpend != null && s.newSpend !== "" ? +s.newSpend : null, createdAt: Date.now(), replaced: dup ? dup.id : null };
  state.cardStatements.push(row);
  d.balance = +s.amount; d.unbilled = 0;
  return row;
}

/* ═════════ payments (actual data) ═════════ */
/** Preview only — splits interest/principal. kind: "regular" | "extra". */
function previewPayment(state, d, amount, date, kind = "regular") {
  const a = st(amount), k = kindOf(d), before = st(d.balance);
  if (k === "revolving" || k === "bnpl") return { amount: bt(a), interest: 0, principal: bt(a), fee: 0, before: bt(before), after: bt(Math.max(0, before - a)), date, kind, note: "ดอกเบี้ยบัตรคิดใน statement แล้ว เงินที่จ่ายลดยอดค้างทั้งหมด" };
  if (k === "flat") { const f = flatInstallment(d); const i = kind === "extra" ? 0 : Math.min(a, st(f.interestPer)); return { amount: bt(a), interest: bt(i), principal: bt(a - i), fee: 0, before: bt(before), after: bt(Math.max(0, before - a)), date, kind }; }
  const last = lastPaid(state, d) || d.startDate || addDays(date, -30);
  if (kind === "extra") {
    const fee = d.prepay && +d.prepay.feePct && (!d.prepay.feeUntil || date <= d.prepay.feeUntil) ? pct(a, +d.prepay.feePct) : 0;
    return { amount: bt(a), interest: 0, principal: bt(a), fee: bt(fee), before: bt(before), after: bt(Math.max(0, before - a)), date, kind, days: 0 };
  }
  const { interest, notes } = accrue(state, d, before, last, date);
  const i = Math.min(a, interest), p = a - i;
  return { amount: bt(a), interest: bt(i), principal: bt(p), unpaidInterest: bt(Math.max(0, interest - a)), fee: 0, before: bt(before), after: bt(Math.max(0, before - p)), date, kind, days: diffDays(last, date), notes,
    warn: interest > a ? "ยอดจ่ายน้อยกว่าดอกเบี้ยที่เกิดขึ้น" : null };
}
/** Same debt, same date, same amount within the last 10 minutes → probably a double tap. */
function isDuplicate(state, debtId, date, amount) {
  return (state.debtPayments || []).some(p => p.debtId === debtId && !p.deletedAt && p.date === date && st(p.amount) === st(amount) && Date.now() - (p.confirmedAt || 0) < 6e5);
}
function applyPayment(state, debtId, pv) {
  const d = state.debts.find(x => x.id === debtId); if (!d) throw new Error("debt not found");
  const p = { id: uid(), debtId, date: pv.date, month: monthKey(pv.date), amount: pv.amount, interest: pv.interest, principal: pv.principal, fee: pv.fee || 0, kind: pv.kind || "regular", before: pv.before, after: pv.after, confirmedAt: Date.now() };
  state.debtPayments.push(p);
  if (kindOf(d) !== "bnpl") d.balance = pv.after;
  if (kindOf(d) !== "bnpl" && +d.balance <= 0 && !d.closedAt && kindOf(d) !== "revolving") d.closedAt = pv.date;
  return p;
}
/** Soft-delete a payment and roll the balance back; history keeps the row. */
function deletePayment(state, payId) {
  const p = state.debtPayments.find(x => x.id === payId); if (!p || p.deletedAt) return null;
  const d = state.debts.find(x => x.id === p.debtId);
  p.deletedAt = Date.now();
  if (d && kindOf(d) !== "bnpl") { d.balance = bt(st(d.balance) + st(p.principal)); if (d.closedAt && +d.balance > 0) d.closedAt = null; }
  return p;
}

/* ═════════ month schedule (feeds Available-to-Spend, calendar, reminders) ═════════ */
/** One row per account for month mk. Card installments are inside the card bill — never counted twice. */
function debtSchedule(state, mk, today = ymd(new Date())) {
  return state.debts.filter(d => d.status !== "closed" && (!d.closedAt || d.closedAt >= `${mk}-01`)).map(d => {
    const k = kindOf(d);
    if (k === "revolving") { const b = cardBill(state, d, mk, today); return { debt: d, due: b.due, planned: b.status === "paid" ? b.paid : b.plan, paidAmt: b.paid, status: b.status === "paid" ? "paid" : b.status === "overdue" ? "overdue" : b.amount <= 0 ? "closed" : "planned", source: b.source, bill: b }; }
    if (k === "bnpl") { const b = bnplBill(state, d, mk, today); return { debt: d, due: b.due, planned: b.status === "paid" ? b.paid : b.plan, paidAmt: b.paid, status: b.status === "paid" ? "paid" : b.status === "overdue" ? "overdue" : b.amount <= 0 ? "closed" : "planned", source: "confirmed", bill: b }; }
    const due = clampDay(mk, +d.dueDay || 1);
    const paid = sumS((state.debtPayments || []).filter(p => p.debtId === d.id && !p.deletedAt && p.month === mk).map(p => st(p.amount)));
    const reg = k === "flat" ? st(flatInstallment(d).installment) : st(d.monthlyPay);
    const planned = paid ? Math.max(paid, 0) : Math.min(reg, st(d.balance) + Math.round(st(d.balance) * ((rateAt(state, d, due).rate || 0) / 1200)));
    const status = paid >= reg && paid ? "paid" : +d.balance <= 0 ? "closed" : today > due ? "overdue" : "planned";
    return { debt: d, due, planned: bt(planned), paidAmt: bt(paid), status, source: "confirmed" };
  });
}

/* ═════════ forecast (this month → 12 months) ═════════ */
function forecast(state, months = 12, today = ymd(new Date())) {
  const mk0 = monthKey(today), loanAm = {};
  for (const d of live(state, today)) if (kindOf(d) === "loan" || kindOf(d) === "flat") loanAm[d.id] = amortize(state, d, { today });
  const out = [];
  for (let i = 0; i < months; i++) {
    const mk = addMonths(mk0, i); const row = { mk, confirmed: 0, estimated: 0, installments: 0, loans: 0, paid: 0, items: [] };
    for (const d of live(state, today)) {
      const k = kindOf(d);
      if (k === "revolving") { const b = cardBill(state, d, mk, today); if (b.amount <= 0) continue;
        const v = st(b.plan); row.items.push({ id: d.id, name: d.name, type: d.type, due: b.due, amount: b.plan, inst: b.installments, source: b.source, status: b.status });
        if (b.source === "confirmed" || b.source === "unrecorded") row.confirmed += v; else { row.installments += Math.min(v, st(b.installments)); row.estimated += Math.max(0, v - st(b.installments)); }
        row.paid += st(b.paid); }
      else if (k === "bnpl") { const b = bnplBill(state, d, mk, today); if (b.amount <= 0) continue; row.installments += st(b.amount); row.paid += st(b.paid);
        row.items.push({ id: d.id, name: d.name, type: d.type, due: b.due, amount: b.amount, inst: b.amount, source: "confirmed", status: b.status }); }
      else { const r = loanAm[d.id].rows.find(x => monthKey(x.date) === mk) || (i === 0 ? null : null);
        const sch = i === 0 ? debtSchedule(state, mk, today).find(x => x.debt.id === d.id) : null;
        const amt = sch ? st(sch.planned) : r ? st(r.pay) : 0; if (!amt) continue;
        row.loans += amt; if (sch) row.paid += st(sch.paidAmt);
        row.items.push({ id: d.id, name: d.name, type: d.type, due: sch ? sch.due : r.date, amount: bt(amt), source: "confirmed", status: sch ? sch.status : "planned" }); }
    }
    row.total = bt(row.confirmed + row.estimated + row.installments + row.loans);
    for (const k of ["confirmed", "estimated", "installments", "loans", "paid"]) row[k] = bt(row[k]);
    row.left = Math.max(0, Math.round((row.total - row.paid) * 100) / 100);
    out.push(row);
  }
  return out;
}

/* ═════════ revolving simulator: full vs minimum vs custom ═════════ */
function simulateCard(d, opts = {}) {
  const apr = opts.apr != null ? +opts.apr : +d.apr || 0, minPct = opts.minPct != null ? +opts.minPct : +d.minPct || 0, minAmt = st(opts.minAmount != null ? opts.minAmount : d.minAmount || 0);
  const start = st(opts.balance != null ? opts.balance : d.balance);
  const run = mode => {
    let bal = start, m = 0, paid = 0, interest = 0; const first = [];
    if (mode === "full") return { mode, months: start > 0 ? 1 : 0, totalPaid: bt(start), interest: 0, firstPay: bt(start), never: false };
    while (bal > 0 && m < 600) {
      m++;
      let pay = Math.max(pct(bal, minPct), Math.min(minAmt, bal));
      if (mode === "custom") pay = Math.max(pay, st(opts.custom));
      pay = Math.min(pay, bal); if (m === 1) first.push(pay);
      bal -= pay; paid += pay;
      const i = Math.round(bal * apr / 1200); bal += i; interest += i;
      if (m > 1 && i >= pay) return { mode, months: Infinity, totalPaid: null, interest: null, firstPay: bt(first[0]), never: true };
    }
    return { mode, months: bal > 0 ? Infinity : m, totalPaid: bt(paid), interest: bt(interest), firstPay: bt(first[0] || 0), never: bal > 0 };
  };
  const full = run("full"), min = run("min"), custom = opts.custom ? run("custom") : null;
  return { full, min, custom, savedVsMin: custom && !min.never && !custom.never ? bt(st(min.interest) - st(custom.interest)) : null,
    assumptions: [`ดอกเบี้ย ${apr}% ต่อปี คิดรายเดือนจากยอดคงเหลือหลังชำระ (ประมาณ — ธนาคารจริงคิดรายวันตั้งแต่วันที่ทำรายการ)`,
      `ขั้นต่ำ ${minPct}% ของยอดคงเหลือ${minAmt ? ` ไม่ต่ำกว่า ${bt(minAmt)} บาท` : ""}${d.minKnown ? " (ตามที่กรอกจากเงื่อนไขบัตร)" : " — ยังไม่ได้ยืนยันเงื่อนไขจริงของบัตร"}`,
      "ไม่มีการรูดเพิ่มระหว่างทดลอง", "จ่ายเต็มจำนวนภายในวันครบกำหนด = ไม่เสียดอกเบี้ย"] };
}

/* ═════════ strategies: snowball · avalanche · hybrid ═════════ */
function accountsFor(state, today) {
  return live(state, today).map(d => {
    const k = kindOf(d);
    if (k === "bnpl") return null; // 0% instalments: paying early saves nothing
    if (k === "revolving") {
      const bal = st(d.balance) + st(d.unbilled); if (bal <= 0) return null;
      return { id: d.id, name: d.name, type: d.type, k, bal, apr: +d.apr || 0, minPct: +d.minPct || 0, minAmt: st(d.minAmount || 0), pay: null, feePct: 0, feeUntil: "", canPrepay: true };
    }
    const bal = st(d.balance); if (bal <= 0) return null;
    const rate = k === "flat" ? 0 : (rateAt(state, d, today).rate || 0);
    const pay = k === "flat" ? st(flatInstallment(d).installment) : st(d.monthlyPay);
    return { id: d.id, name: d.name, type: d.type, k, bal, apr: k === "flat" ? +d.apr || 0 : rate, pay, feePct: d.prepay ? +d.prepay.feePct || 0 : 0, feeUntil: d.prepay ? d.prepay.feeUntil || "" : "", canPrepay: !(d.prepay && d.prepay.allowed === false) && k !== "flat" };
  }).filter(Boolean);
}
function hybridScore(a, extraS, mIndexDate) {
  const feeActive = a.feePct && (!a.feeUntil || mIndexDate <= a.feeUntil);
  const eff = a.apr - (feeActive ? a.feePct : 0);
  const quick = extraS > 0 && a.bal <= extraS * 3 ? 3 : 0;               // can be closed within ~3 months → frees its minimum
  const minPay = a.k === "revolving" ? Math.max(pct(a.bal, a.minPct), a.minAmt) : a.pay;
  const flow = a.bal ? Math.min(2, minPay / a.bal * 12) : 0;              // big payment vs balance → cash flow relief
  return { score: eff + quick + flow, eff, quick, flow, feeActive };
}
function runStrategy(state, extra, strategy, today = ymd(new Date())) {
  const acc = accountsFor(state, today).map(a => ({ ...a, interest: 0, fees: 0, paidOff: null }));
  const extraS = st(extra);
  const minOf = a => a.k === "revolving" ? Math.min(a.bal, Math.max(pct(a.bal, a.minPct), Math.min(a.minAmt, a.bal))) : Math.min(a.bal, a.pay);
  const budget = sumS(acc.map(minOf)) + extraS;
  let m = 0, totI = 0, totFee = 0; const firstTarget = [];
  while (acc.some(a => a.bal > 0) && m < 600) {
    m++; const date = addDays(today, m * 30);
    for (const a of acc) if (a.bal > 0) { const i = Math.round(a.bal * a.apr / 1200); a.bal += i; a.interest += i; totI += i; }
    let pool = budget;
    for (const a of acc) if (a.bal > 0) { const p = Math.min(minOf(a), pool); a.bal -= p; pool -= p; if (a.bal <= 0) { a.bal = 0; a.paidOff = m; } }
    if (strategy !== "none" && pool > 0) {
      const cand = acc.filter(a => a.bal > 0 && a.canPrepay);
      cand.sort((x, y) => strategy === "snowball" ? x.bal - y.bal : strategy === "avalanche" ? y.apr - x.apr || x.bal - y.bal : hybridScore(y, extraS, date).score - hybridScore(x, extraS, date).score || x.bal - y.bal);
      if (m === 1) firstTarget.push(...cand.slice(0, 1).map(a => a.id));
      for (const a of cand) { if (pool <= 0) break; let x = Math.min(pool, a.bal);
        const f = a.feePct && (!a.feeUntil || date <= a.feeUntil) ? pct(x, a.feePct) : 0;
        a.bal -= x; pool -= x; a.fees += f; totFee += f; if (a.bal <= 0) { a.bal = 0; a.paidOff = m; } }
    }
    if (m > 24 && acc.every(a => a.bal <= 0 || a.paidOff == null) && m % 12 === 0) { /* keep going */ }
  }
  const done = acc.every(a => a.bal <= 0);
  return { strategy, extra, months: done ? m : Infinity, totalInterest: bt(totI), totalFees: bt(totFee), cost: bt(totI + totFee),
    debtFree: done ? addMonths(monthKey(today), m) : null, firstTarget: firstTarget[0] || null,
    order: acc.filter(a => a.paidOff).sort((a, b) => a.paidOff - b.paidOff).map(a => ({ id: a.id, name: a.name, month: a.paidOff, when: addMonths(monthKey(today), a.paidOff), interest: bt(a.interest) })) };
}
function explainHybrid(state, extra, today = ymd(new Date())) {
  const acc = accountsFor(state, today); const extraS = st(extra);
  const ranked = acc.filter(a => a.canPrepay).map(a => ({ a, h: hybridScore(a, extraS, today) })).sort((x, y) => y.h.score - x.h.score || x.a.bal - y.a.bal);
  const top = ranked[0]; if (!top) return null;
  const why = [`ดอกเบี้ย ${top.a.apr}% ต่อปี${top.h.feeActive ? ` (หักค่าธรรมเนียมโปะ ${top.a.feePct}% แล้วเหลือคุ้ม ${top.h.eff.toFixed(2)}%)` : ""}`];
  if (top.h.quick) why.push(`ยอดเหลือ ${bt(top.a.bal).toLocaleString()} บาท ปิดได้ภายใน ~3 เดือน แล้วเงินขั้นต่ำจะกลับมาช่วยก้อนอื่น`);
  if (top.h.flow > 1) why.push("ค่างวดสูงเมื่อเทียบกับยอดหนี้ ปิดแล้วเงินเหลือใช้เพิ่มชัดเจน");
  const skipped = acc.filter(a => !a.canPrepay).map(a => `${a.name}: ${a.k === "flat" ? "เช่าซื้อ flat rate โปะแล้วไม่ลดดอกตามสัดส่วน" : "สัญญาไม่ให้โปะ"}`);
  const fee = acc.filter(a => a.feePct && (!a.feeUntil || today <= a.feeUntil)).map(a => `${a.name}: มีค่าธรรมเนียมโปะ ${a.feePct}%${a.feeUntil ? ` ถึง ${a.feeUntil}` : ""}`);
  return { first: top.a, reasons: why, skipped, fee, ranked: ranked.map(r => ({ id: r.a.id, name: r.a.name, apr: r.a.apr, bal: bt(r.a.bal), score: Math.round(r.h.score * 100) / 100 })) };
}
function compareAll(state, extra, today = ymd(new Date())) {
  const none = runStrategy(state, 0, "none", today);
  const r = { none, snowball: runStrategy(state, extra, "snowball", today), avalanche: runStrategy(state, extra, "avalanche", today), hybrid: runStrategy(state, extra, "hybrid", today) };
  for (const k of ["snowball", "avalanche", "hybrid"]) r[k].saved = isFinite(none.months) ? bt(st(none.cost) - st(r[k].cost)) : null, r[k].monthsSaved = isFinite(none.months) && isFinite(r[k].months) ? none.months - r[k].months : null;
  const cands = ["hybrid", "avalanche", "snowball"].filter(k => isFinite(r[k].months));
  const best = cands.sort((a, b) => st(r[a].cost) - st(r[b].cost) || r[a].months - r[b].months)[0] || null;
  let rec = best, reason = best ? `ดอกเบี้ย+ค่าธรรมเนียมรวมต่ำสุด (${r[best].cost.toLocaleString()} บาท)` : "ด้วยยอดชำระนี้ยังปิดหนี้ไม่หมด ลองเพิ่มเงินโปะต่อเดือน";
  if (best && best !== "snowball" && r.snowball.order[0] && r[best].order[0] && r.snowball.order[0].month + 3 <= r[best].order[0].month && st(r.snowball.cost) - st(r[best].cost) < st(r[best].cost) * 0.02) {
    rec = "snowball"; reason = `ดอกเบี้ยต่างกันไม่ถึง 2% แต่ปิดก้อนแรกได้เร็วกว่า ${r[best].order[0].month - r.snowball.order[0].month} เดือน ช่วยให้มีกำลังใจ`; }
  return { ...r, recommend: rec, reason, hybridWhy: explainHybrid(state, extra, today) };
}

/* ═════════ overview ═════════ */
function overview(state, today = ymd(new Date())) {
  const mk = monthKey(today), ds = debtSchedule(state, mk, today), L = live(state, today);
  const byType = {}; let out = 0, interestM = 0, wNum = 0, wDen = 0, origin = 0;
  for (const d of L) {
    const k = kindOf(d); let amt;
    if (k === "revolving") amt = st(d.balance) + st(d.unbilled) + sumS(instsOf(state, d.id).map(i => st(instInfo(i, cycleFor(d, mk).stMonth).remaining)));
    else if (k === "bnpl") amt = bnplOutstanding(state, d, mk, today);
    else amt = st(d.balance);
    out += amt; byType[d.type] = (byType[d.type] || 0) + amt;
    const rate = k === "revolving" ? +d.apr || 0 : k === "bnpl" ? 0 : k === "flat" ? +d.apr || 0 : rateAt(state, d, today).rate || 0;
    const interestBase = k === "revolving" ? (d.payPlan === "full" ? 0 : st(d.balance)) : k === "loan" ? st(d.balance) : 0;
    interestM += Math.round(interestBase * rate / 1200) + (k === "flat" ? st(flatInstallment(d).interestPer) : 0);
    wNum += amt * rate; wDen += amt;
    origin += k === "loan" || k === "flat" ? Math.max(st(d.principal || d.balance), st(d.balance)) : amt;
  }
  const paidPrincipal = sumS((state.debtPayments || []).filter(p => !p.deletedAt).map(p => st(p.principal)));
  const dueM = sumS(ds.map(x => st(x.planned))), paidM = sumS(ds.map(x => st(x.paidAmt)));
  const next = ds.filter(x => x.status === "planned" || x.status === "overdue").sort((a, b) => a.due.localeCompare(b.due))[0] || null;
  const plan = runStrategy(state, +state.debtPlanExtra || 0, state.debtStrategy || "hybrid", today);
  const loansPrincipalOrig = sumS(L.filter(d => kindOf(d) === "loan" || kindOf(d) === "flat").map(d => st(d.principal || d.balance)));
  const loansBal = sumS(L.filter(d => kindOf(d) === "loan" || kindOf(d) === "flat").map(d => st(d.balance)));
  return {
    total: bt(out), monthDue: bt(dueM), monthPaid: bt(paidM), monthLeft: bt(Math.max(0, dueM - paidM)), interestMonth: bt(interestM),
    weightedApr: wDen ? Math.round(wNum / wDen * 100) / 100 : 0, count: L.length, next, rows: ds,
    byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, bt(v)])),
    debtFree: plan.debtFree, planMonths: plan.months,
    progress: loansPrincipalOrig ? (loansPrincipalOrig - loansBal) / loansPrincipalOrig : (paidPrincipal + out ? paidPrincipal / (paidPrincipal + out) : 0)
  };
}

/* ═════════ alerts (only facts the data supports) ═════════ */
function alerts(state, today = ymd(new Date()), days = 5) {
  const out = [], mk = monthKey(today);
  for (const r of debtSchedule(state, mk, today).concat(debtSchedule(state, addMonths(mk, 1), today))) {
    const n = diffDays(today, r.due);
    if (r.status === "overdue") out.push({ kind: "overdue", level: "bad", id: r.debt.id, title: `${r.debt.name} เลยกำหนดชำระ`, sub: `ครบกำหนด ${r.due} · ค้าง ${(r.planned - r.paidAmt).toLocaleString()} บาท` });
    else if (r.status === "planned" && n >= 0 && n <= days) out.push({ kind: "due", level: "warn", id: r.debt.id, title: `${r.debt.name} ครบกำหนดใน ${n} วัน`, sub: `${r.planned.toLocaleString()} บาท${r.source === "estimated" ? " (ประมาณ)" : ""}`, due: r.due });
  }
  for (const d of live(state, today)) {
    if (kindOf(d) === "revolving" && +d.limit) { const u = utilization(state, d, today); if (u.pct >= 0.8) out.push({ kind: "limit", level: "warn", id: d.id, title: `${d.name} ใช้วงเงินไป ${Math.round(u.pct * 100)}%`, sub: `เหลือ ${u.available.toLocaleString()} บาท` }); }
    for (const it of instsOf(state, d.id)) { const i = instInfo(it, mk); if (!i.done && i.left <= 1) out.push({ kind: "instEnd", level: "good", id: d.id, title: `${it.name} เหลืองวดสุดท้าย`, sub: `ผ่อนหมด ${i.endMonth}` }); }
    if (kindOf(d) === "loan") for (const r of state.refRates || []) if (r.bank === (d.refBank || d.lender) && r.confirmed === false) out.push({ kind: "rate", level: "warn", id: d.id, title: `มีอัตรา ${r.ref} ใหม่ ${r.rate}% รอยืนยัน`, sub: `มีผล ${r.effective}` });
    if (kindOf(d) === "loan" && (d.rates || []).some(s => s.from > today && diffDays(today, s.from) <= 30)) out.push({ kind: "step", level: "warn", id: d.id, title: `${d.name} ดอกเบี้ยเปลี่ยนขั้นเร็ว ๆ นี้`, sub: (d.rates.find(s => s.from > today) || {}).from });
  }
  const seen = new Set(); return out.filter(a => { const k = a.kind + a.id + (a.due || ""); if (seen.has(k)) return false; seen.add(k); return true; });
}

const D = { TYPES, REFS, st, bt, kindOf, refRateAt, rateAt, accrue, amortize, flatInstallment, flatSchedule, prepaySim, loanProgress, annuity,
  cycleFor, bnplOutstanding, instMonthly, instInfo, instsOf, cardBill, bnplBill, utilization, recordStatement, minDue, spendPattern,
  previewPayment, applyPayment, deletePayment, isDuplicate, debtSchedule, forecast, simulateCard, runStrategy, compareAll, explainHybrid, overview, alerts };
// The new engine replaces the old debt functions everywhere (Available-to-Spend calls MQ.debtSchedule).
Object.assign(M, { D, DEBT_TYPES: TYPES, debtSchedule, previewPayment, applyPayment, flatInstallment });
if (typeof module !== "undefined") module.exports = D;
})(this);
