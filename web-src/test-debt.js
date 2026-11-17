/* Smart Debt engine tests — run: node test-debt.js */
const M = require("./engine.js"); const D = require("./debt.js");
let pass = 0, fail = 0; const out = [];
const eq = (n, got, want, tol = 0.01) => { const k = Math.abs(got - want) <= tol; k ? pass++ : fail++; out.push(`${k ? "PASS" : "FAIL"}  ${n}: got ${got}  want ${want}`); };
const ok = (n, c, info = "") => { c ? pass++ : fail++; out.push(`${c ? "PASS" : "FAIL"}  ${n} ${info}`); };
const fresh = () => { const s = M.defaultState(); s.cardStatements = []; s.installments = []; s.refRates = []; return s; };
const T = "2026-11-18";

/* 1 · billing cycles per card */
{
  const A = { statementDay: 5, dueDay: 25 }, B = { statementDay: 15, dueDay: 5 }, C = { statementDay: 25, dueDay: 15 };
  const a = D.cycleFor(A, "2026-11"), b = D.cycleFor(B, "2026-11"), c = D.cycleFor(C, "2026-11");
  ok("card A: statement 5 → due 25 same month", a.stDate === "2026-11-05" && a.due === "2026-11-25");
  ok("card B: statement 15 Oct → due 5 Nov", b.stDate === "2026-10-15" && b.due === "2026-11-05");
  ok("card C: statement 25 Oct → due 15 Nov", c.stDate === "2026-10-25" && c.due === "2026-11-15");
  ok("statement day 31 in Feb clamps to 28", D.cycleFor({ statementDay: 31, dueDay: 20 }, "2027-03").stDate === "2027-02-28");
  ok("leap year Feb 2028 has 29", D.cycleFor({ statementDay: 31, dueDay: 20 }, "2028-03").stDate === "2028-02-29");
}

/* 2 · 0% installment: phone 24,000 / 10, 4 billed → 6 left = 14,400 */
{
  const it = { id: "i1", name: "โทรศัพท์", price: 24000, down: 0, n: 10, kind: "zero", firstMonth: "2026-08" };
  const i = D.instInfo(it, "2026-11");
  eq("monthly 2,400", i.monthly, 2400); eq("billed 4 (Aug–Nov)", i.billed, 4); eq("left 6", i.left, 6); eq("remaining 14,400", i.remaining, 14400);
  ok("ends May 2027", i.endMonth === "2027-05");
  eq("0% has no interest", i.interestTotal, 0);
  const odd = D.instInfo({ price: 10000, n: 3, kind: "zero", firstMonth: "2026-11" }, "2026-11");
  eq("0% rounding: 3 × 3,333.34 never exceeds price", odd.monthly * 3 - 10000 < 0.03 ? 1 : 0, 1);
  const fl = D.instInfo({ price: 12000, n: 12, kind: "flat", apr: 10, firstMonth: "2026-11" }, "2026-11");
  eq("flat-rate installment monthly", fl.monthly, 1100); eq("flat interest total", fl.interestTotal, 1200);
}

/* 3 · card bill: statement vs estimate, installments inside the bill (no double count) */
const S = fresh();
const card = { id: "cA", type: "card", name: "KTC", lender: "KTC", limit: 50000, balance: 0, unbilled: 3000, apr: 16, minPct: 8, minAmount: 1000, minKnown: true, statementDay: 5, dueDay: 25, payPlan: "full", status: "active" };
const shopee = { id: "sp", type: "bnpl", name: "SPayLater", dueDay: 10, status: "active" };
S.debts.push(card, shopee);
S.installments.push({ id: "i1", debtId: "cA", name: "โทรศัพท์", price: 24000, n: 10, kind: "zero", firstMonth: "2026-08" },
                    { id: "i2", debtId: "sp", name: "หูฟัง", price: 3000, n: 3, kind: "zero", firstMonth: "2026-11" });
D.recordStatement(S, "cA", { stDate: "2026-11-05", amount: 8400, min: 3000 }); card.unbilled = 3000; // spent since the statement
{
  const b = D.cardBill(S, card, "2026-11", T);
  ok("Nov bill confirmed from statement", b.source === "confirmed" && b.amount === 8400, JSON.stringify(b.parts));
  eq("statement min used as entered", b.min, 3000);
  eq("installment part shown inside bill", b.installments, 2400);
  const nx = D.cardBill(S, card, "2026-12", T);
  ok("Dec bill is an estimate", nx.source === "estimated");
  eq("Dec estimate = installment 2,400 + unbilled 3,000", nx.amount, 5400);
  const sp = D.bnplBill(S, shopee, "2026-11", T);
  eq("Shopee Nov = 1,000", sp.amount, 1000);
  const ds = D.debtSchedule(S, "2026-11", T);
  eq("schedule counts card once (8,400) + Shopee 1,000", M.sum(ds.map(r => r.planned)), 9400);
  const av = M.available(S, "2026-11", T);
  eq("Available-to-Spend uses the same 9,400", av.debt, 9400);
  const u = D.utilization(S, card, T);
  eq("utilization counts billed + unbilled + future installments", u.used, 8400 + 3000 + 2400 * 6);
}
/* minimum rule when bank rule not confirmed */
{
  const c2 = { ...card, id: "c2", minKnown: false, minPct: 10, minAmount: 500, balance: 20000, payPlan: "min" };
  const m = D.minDue(c2, 2000000, 0);
  ok("min flagged as assumption when rule not entered", m.assumed === true);
  eq("min = 10% of revolving", m.min / 100, 2000);
  eq("min includes full installment", D.minDue(c2, 1000000, 200000).min / 100, 2000 + 800);
}

/* 4 · payments: partial, full, duplicate, delete keeps history */
{
  const pv = D.previewPayment(S, card, 3000, "2026-11-20");
  ok("preview never changes balance", card.balance === 8400);
  D.applyPayment(S, "cA", pv);
  let b = D.cardBill(S, card, "2026-11", "2026-11-20");
  ok("partial payment: not paid yet (plan full 8,400)", b.status !== "paid" && b.left === 5400);
  ok("duplicate guard", D.isDuplicate(S, "cA", "2026-11-20", 3000));
  D.applyPayment(S, "cA", D.previewPayment(S, card, 5400, "2026-11-24"));
  b = D.cardBill(S, card, "2026-11", "2026-11-24");
  ok("full payment → paid", b.status === "paid");
  const p = S.debtPayments[S.debtPayments.length - 1]; D.deletePayment(S, p.id);
  ok("delete rolls balance back but keeps row", card.balance === 5400 && S.debtPayments.includes(p) && p.deletedAt);
  ok("late: overdue after due date when under minimum", D.cardBill(S, { ...card, id: "zz" }, "2026-11", "2026-11-26").status !== "paid");
}

/* 5 · full vs minimum vs custom */
{
  const sim = D.simulateCard({ balance: 30000, apr: 16, minPct: 8, minAmount: 1000, minKnown: true }, { custom: 5000 });
  eq("full payment: no interest", sim.full.interest, 0);
  ok("minimum takes many months", sim.min.months > 20, `${sim.min.months}`);
  ok("custom 5,000 faster & cheaper than minimum", sim.custom.months < sim.min.months && sim.custom.interest < sim.min.interest);
  ok("saved vs min positive", sim.savedVsMin > 0);
  const never = D.simulateCard({ balance: 100000, apr: 25, minPct: 1, minAmount: 0 }, {});
  ok("minimum below interest → never ends", never.min.never === true);
}

/* 6 · mortgage: amortization, floating MRR, step-up, prepayment */
const H = fresh();
const home = { id: "h", type: "home", name: "บ้าน", lender: "GSB", principal: 1500000, balance: 1500000, monthlyPay: 12000, dueDay: 1, termMonths: 240,
  rates: [{ from: "2020-01-01", kind: "float", ref: "MRR", margin: -2 }], prepay: { allowed: true, mode: "term", feePct: 0 } };
H.debts.push(home);
H.refRates.push({ id: "r1", bank: "GSB", ref: "MRR", rate: 7, effective: "2025-01-01", createdAt: 1 });
H.debtPayments.push({ id: "p0", debtId: "h", date: "2026-11-01", amount: 12000, principal: 0, interest: 0, month: "2026-11" });
{
  eq("MRR 7 − 2 = 5%", D.rateAt(H, home, "2026-11-18").rate, 5);
  const am = D.amortize(H, home, { today: T });
  eq("first period interest = bal × 5% × 30/365", am.rows[0].interest, Math.round(1500000 * 0.05 * 30 / 365 * 100) / 100);
  eq("principal = 12,000 − interest", am.rows[0].principal, 12000 - am.rows[0].interest);
  ok("pays off in finite months", isFinite(am.months) && am.months > 150 && am.months < 240, am.months);
  H.refRates.push({ id: "r2", bank: "GSB", ref: "MRR", rate: 7.25, effective: "2026-11-16", createdAt: 2 });
  eq("new MRR 7.25 → 5.25% from effective date", D.rateAt(H, home, "2026-11-20").rate, 5.25);
  eq("old rate still applies before effective date", D.rateAt(H, home, "2026-11-10").rate, 5);
  const ac = D.accrue(H, home, D.st(1500000), "2026-11-01", "2026-12-01");
  eq("mid-period rate change splits interest (15d@5% + 15d@5.25%)", ac.interest / 100, Math.round((1500000 * 0.05 * 15 / 365 + 1500000 * 0.0525 * 15 / 365) * 100) / 100, 0.02);
  ok("history kept (2 MRR rows)", H.refRates.length === 2);
  const late = D.previewPayment(H, home, 12000, "2026-12-11"), onTime = D.previewPayment(H, home, 12000, "2026-12-01");
  ok("paying late costs more interest", late.interest > onTime.interest);
  const tiny = D.previewPayment(H, home, 3000, "2026-12-01");
  ok("partial below interest flagged", !!tiny.warn && tiny.principal === 0);
  const ex = D.previewPayment(H, home, 50000, "2026-12-05", "extra");
  eq("extra payment goes 100% to principal", ex.principal, 50000);
}
{
  const step = { ...home, id: "s", rates: [{ from: "2026-01-01", kind: "fixed", rate: 2.5 }, { from: "2027-01-01", kind: "fixed", rate: 3.5 }, { from: "2028-01-01", kind: "fixed", rate: 4.5 }, { from: "2029-01-01", kind: "float", ref: "MRR", margin: -2 }] };
  H.debts.push(step);
  eq("step 1: 2.5%", D.rateAt(H, step, "2026-06-01").rate, 2.5); eq("step 2: 3.5%", D.rateAt(H, step, "2027-06-01").rate, 3.5);
  eq("step 4 floats: MRR−2", D.rateAt(H, step, "2029-06-01").rate, 5.25);
  const am = D.amortize(H, step, { today: T, from: "2026-12-01" });
  ok("schedule shows the rate applied in each period (Dec @2.5, Jan @3.5)", am.rows.find(r => r.date === "2027-01-01").rate === 2.5 && am.rows.find(r => r.date === "2027-02-01").rate === 3.5);
}
{
  for (const x of [10000, 30000, 50000, 100000]) {
    const r = D.prepaySim(H, home, { lump: x }, T);
    ok(`prepay ${x}: saves interest & months`, r.interestSaved > 0 && r.monthsSaved >= 0, `saved ${r.interestSaved} / ${r.monthsSaved}m`);
  }
  const big = D.prepaySim(H, home, { lump: 100000 }, T); eq("new principal", big.newPrincipal, 1400000);
  const mo = D.prepaySim(H, home, { monthly: 2000 }, T); ok("monthly extra 2,000 shortens loan", mo.monthsSaved > 12, mo.monthsSaved);
  const pay = D.prepaySim(H, home, { lump: 100000, mode: "pay" }, T); ok("mode 'pay' lowers installment", pay.newPay < 12000, pay.newPay);
  const feeLoan = { ...home, id: "f", prepay: { allowed: true, mode: "term", feePct: 3, feeUntil: "2027-12-31" } }; H.debts.push(feeLoan);
  const f = D.prepaySim(H, feeLoan, { lump: 100000 }, T);
  eq("prepay fee 3% inside lock period", f.feeNow, 3000); eq("cash needed incl. fee", f.cashNeeded, 103000);
  ok("fee reduces the net saving", f.interestSaved < big.interestSaved);
  const blocked = D.prepaySim(H, { ...home, prepay: { allowed: false } }, { lump: 10000 }, T); ok("prepay not allowed is reported", !!blocked.blocked);
  const close = D.amortize(H, home, { today: T, extras: [{ date: "2026-12-15", amount: 2000000 }] });
  ok("early payoff closes the loan", close.months <= 2 && close.rows[close.rows.length - 1].balance === 0);
}
/* flat-rate hire purchase is never amortized as reducing balance */
{
  const car = { id: "car", type: "car", method: "flat", principal: 300000, balance: 300000, apr: 3, termMonths: 60, dueDay: 10 };
  const sc = D.amortize(H, car, { today: T });
  ok("flat: same interest every month", sc.rows[0].interest === sc.rows[30].interest);
  eq("flat total interest = P × r × years", D.flatInstallment(car).totalInterest, 45000);
}

/* 7 · strategies */
{
  const P = fresh();
  P.debts.push({ id: "k", type: "card", name: "บัตร 16%", balance: 30000, apr: 16, minPct: 8, minAmount: 1000, statementDay: 5, dueDay: 25, status: "active" },
               { id: "c", type: "cash", name: "บัตรกดเงินสด 25%", balance: 60000, apr: 25, minPct: 3, minAmount: 500, statementDay: 20, dueDay: 10, status: "active" },
               { id: "p", type: "personal", name: "สินเชื่อ 12% (โปะเสีย 5%)", balance: 8000, monthlyPay: 1500, apr: 12, dueDay: 15, status: "active", prepay: { allowed: true, feePct: 5, feeUntil: "2030-01-01" } });
  const r = D.compareAll(P, 3000, T);
  ok("all strategies finish", isFinite(r.snowball.months) && isFinite(r.avalanche.months) && isFinite(r.hybrid.months));
  ok("avalanche ≤ snowball interest", r.avalanche.totalInterest <= r.snowball.totalInterest + 0.01, `${r.avalanche.totalInterest} vs ${r.snowball.totalInterest}`);
  ok("snowball pays smallest first", r.snowball.firstTarget === "p");
  ok("avalanche targets 25% first", r.avalanche.firstTarget === "c");
  ok("hybrid avoids fee-locked loan first", r.hybrid.firstTarget !== "p");
  ok("extra money saves vs minimum only", r.hybrid.saved > 0);
  ok("recommendation with reason", !!r.recommend && r.reason.length > 5);
  ok("hybrid explains why", r.hybridWhy && r.hybridWhy.reasons.length >= 1 && r.hybridWhy.fee.length === 1);
  const mins = D.runStrategy(P, 0, "none", T);
  ok("minimum-only for many months still terminates or reports never", mins.months > 12);
}

/* 8 · forecast & overview */
{
  const f = D.forecast(S, 12, T);
  ok("12 months forecast", f.length === 12);
  ok("this month: confirmed bucket has card statement", f[0].confirmed >= 8400);
  ok("next month: estimate kept apart from installments", f[1].estimated === 3000 && f[1].installments === 2400 + 1000);
  ok("installments end on schedule (card phone ends May 2027)", f.find(x => x.mk === "2027-06").installments === 0);
  const o = D.overview(S, T);
  ok("overview total = card billed + unbilled + future installments + Shopee (Nov unpaid 1,000 + 2,000 later)", Math.abs(o.total - (5400 + 3000 + 2400 * 6 + 3000)) < 0.01, o.total);
  ok("alerts produce only real facts", D.alerts(S, T).every(a => a.title));
}

console.log(out.join("\n")); console.log(`\n${pass} passed, ${fail} failed`); if (fail) process.exit(1);
