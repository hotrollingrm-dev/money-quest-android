/* MONEY QUEST — data schema + calculation engine.
   Pure functions only: no DOM, no storage. Every money figure comes with `steps`
   (label · formula · value) so the UI can show where a number came from. */
(function (root) {
"use strict";

/* ───────── dates ───────── */
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d || 1); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const monthKey = s => s.slice(0, 7);
const addMonths = (mk, n) => { const [y, m] = mk.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const daysInMonth = mk => { const [y, m] = mk.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const clampDay = (mk, day) => `${mk}-${pad(Math.min(day, daysInMonth(mk)))}`;
const beYear = ad => ad + 543;
const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = a => a.reduce((s, x) => s + (+x || 0), 0);
const uid = () => Math.random().toString(36).slice(2, 10);

/* ───────── schema ───────── */
const OT_FIELDS = [
  { k: "h1",    label: "OT ×1",            mult: 1,   kind: "time" },
  { k: "h15",   label: "OT ×1.5",          mult: 1.5, kind: "time" },
  { k: "h3",    label: "OT ×3",            mult: 3,   kind: "time" },
  { k: "h15p",  label: "OT ×1.5 นักขัตฤกษ์", mult: 1.5, kind: "time" },
  { k: "h2p",   label: "OT ×2 นักขัตฤกษ์",   mult: 2,   kind: "time" },
  { k: "other", label: "OT อื่น ๆ",          mult: null, kind: "time" },
  { k: "meal",  label: "ค่าอาหาร",           unit: 50,  kind: "money" },
  { k: "mealOt",label: "ค่าอาหาร OT",        unit: 35,  kind: "money" },
  { k: "shift", label: "ค่ากะ",              unit: 120, kind: "money" }
];

function defaultState() {
  const now = new Date();
  return {
    v: 1,
    meta: { createdAt: Date.now(), updatedAt: 0 },
    profile: { name: "", team: "C", payday: 25, theme: "light", lang: "th" },
    pay: { salary: 0, living: 0, position: 0, rent: 0, env: 0, diligence: 0, otherMult: 1,
           mealRate: 50, mealOtRate: 35, shiftRate: 120, pvdRate: 0, loanDeduct: 0,
           withholdingMode: "auto", projectOT: true },
    tax: { year: beYear(now.getFullYear()), bonusYear: 0, extraYear: 0,
           d: { spouse: 0, child30: 0, child60: 0, parents: 0, lifeIns: 0, healthIns: 0, parentHealthIns: 0,
                pensionIns: 0, rmf: 0, ssf: 0, thaiEsg: 0, homeInterest: 0, donation: 0, donationEdu: 0, other: 0 } },
    payslips: {},           // "2026-11": { withheld, bonus, extra }   actual figures typed from the payslip (optional)
    ot: {},                 // "2026-10": { values:{h1:{h,m}|null,...,meal:{v}|null}, source:{k:"scan"|"edit"}, at, history:[] }
    shift: { mode: "roster", times: { D: ["08:00", "20:15"], N: ["20:00", "08:15"] }, overrides: {},
             custom: { seq: ["D","D","D","D","H","H","N","N","N","N","H","H"], anchor: ymd(now) } },
    debts: [],              // {id,lender,name,type,method,principal,balance,apr,termMonths,monthlyPay,minPct,minAmount,dueDay,startDate,createdAt,closedAt}
    debtPayments: [],       // {id,debtId,date,amount,interest,principal,month,confirmedAt}
    expenses: [],           // {id,name,cat,kind:"fixed"|"variable",amount,dueDay,active}
    spend: [],              // {id,date,amount,cat,note,itemId}
    goals: [],              // {id,name,icon,target,have,monthly,deadline,priority,isEmergency,contributions:[{id,date,amount}],doneAt}
    budget: { savingsMonthly: 0 },
    planner: { appts: [], todos: [] },
    slips: {}, owner: { names: [], accounts: [] }, slipRules: {},
    journey: { weights: { debt: 35, emergency: 25, goals: 30, habits: 10 }, claimed: {}, badges: {} },
    audit: []
  };
}

/* ───────── OT (UACJ slip: 9 summary cells) ───────── */
const hourlyBase = pay => (+pay.salary + +pay.living + +pay.position + +pay.rent) / 30 / 8;
const toHours = v => v ? (+v.h || 0) + (+v.m || 0) / 60 : 0;

function otCalc(values, pay) {
  const rate = hourlyBase(pay);
  const steps = [{ label: "เรตต่อชั่วโมง", formula: `(${pay.salary}+${pay.living}+${pay.position}+${pay.rent}) ÷ 30 ÷ 8`, value: r2(rate) }];
  const lines = [];
  for (const f of OT_FIELDS) {
    const v = values ? values[f.k] : null;
    if (f.kind === "time") {
      const mult = f.mult == null ? (+pay.otherMult || 1) : f.mult;
      const hrs = toHours(v);
      const amount = r2(rate * hrs * mult);
      lines.push({ k: f.k, label: f.label, hours: hrs, mult, amount, empty: v == null });
      if (hrs) steps.push({ label: f.label, formula: `${r2(rate)} × ${r2(hrs)} ชม. × ${mult}`, value: amount });
    } else {
      const amount = v ? +v.v || 0 : 0;
      const unit = f.k === "meal" ? pay.mealRate : f.k === "mealOt" ? pay.mealOtRate : pay.shiftRate;
      lines.push({ k: f.k, label: f.label, amount, days: unit ? amount / unit : 0, unit, empty: v == null, divisible: !amount || amount % unit === 0 });
      if (amount) steps.push({ label: f.label, formula: `${amount} บาท (= ${r2(amount / unit)} วัน × ${unit})`, value: amount });
    }
  }
  const otPay = r2(sum(lines.filter(l => l.mult != null).map(l => l.amount)));
  const allowances = r2(sum(lines.filter(l => l.unit != null).map(l => l.amount)));
  const otHours = r2(sum(lines.filter(l => l.mult != null).map(l => l.hours)));
  return { rate: r2(rate), lines, otPay, allowances, otHours, total: r2(otPay + allowances), steps };
}

/** Pay period for an OT record key: "2026-10" = 16 Sep – 15 Oct. */
function otPeriod(mk) { const prev = addMonths(mk, -1); return { from: `${prev}-16`, to: `${mk}-15` }; }
function periodKeyFor(date) { const d = parse(date); return d.getDate() >= 16 ? addMonths(monthKey(date), 1) : monthKey(date); }

/* ───────── Thai personal income tax (by Buddhist-era tax year) ───────── */
const BRACKETS = [[150000, 0], [300000, .05], [500000, .10], [750000, .15], [1000000, .20], [2000000, .25], [5000000, .30], [Infinity, .35]];
const TAX_RULES = {
  base: {
    brackets: BRACKETS,
    expenseRate: .5, expenseCap: 100000,
    personal: 60000, spouse: 60000, child: 30000, child2018: 60000, parent: 30000, parentMax: 4,
    lifeCap: 100000, healthCap: 25000, lifeHealthCap: 100000, parentHealthCap: 15000,
    pvdRate: .15, pensionRate: .15, pensionCap: 200000, rmfRate: .30, rmfCap: 500000, ssfRate: .30, ssfCap: 200000,
    retireGroupCap: 500000, thaiEsgRate: .30, thaiEsgCap: 300000, homeInterestCap: 100000, donationRate: .10,
    ssoRate: .05, ssoCap: 15000
  },
  2568: { ssoCap: 15000 },
  2569: { ssoCap: 17500 }, 2570: { ssoCap: 17500 }, 2571: { ssoCap: 17500 },
  2572: { ssoCap: 20000 }, 2573: { ssoCap: 20000 }, 2574: { ssoCap: 20000 },
  2575: { ssoCap: 23000 }
};
function rulesFor(be) {
  const known = Object.keys(TAX_RULES).filter(k => k !== "base").map(Number).sort((a, b) => a - b);
  const pick = known.filter(y => y <= be).pop() ?? known[0];
  return Object.assign({}, TAX_RULES.base, TAX_RULES[pick] || {}, { year: be, basedOn: pick });
}
function progressiveTax(net, brackets = BRACKETS) {
  let tax = 0, prev = 0; const rows = [];
  for (const [top, rate] of brackets) {
    if (net <= prev) break;
    const slice = Math.min(net, top) - prev;
    const t = slice * rate; tax += t;
    rows.push({ from: prev, to: Math.min(net, top), rate, tax: r2(t) });
    prev = top;
  }
  return { tax: r2(tax), rows };
}
const ssoMonth = (wage, rules) => r2(Math.min(Math.max(wage, 0), rules.ssoCap) * rules.ssoRate);

/* fixed monthly wages (taxable, before OT) */
const fixedWages = pay => +pay.salary + +pay.living + +pay.position + +pay.rent + +pay.env + +pay.diligence;

/** Payroll for calendar month mk (its OT record has the same key). */
function payroll(state, mk, opts = {}) {
  const pay = state.pay, rules = rulesFor(beYear(+mk.slice(0, 4)));
  const ot = state.ot[mk] ? otCalc(state.ot[mk].values, pay) : null;
  const slip = state.payslips[mk] || {};
  const fixed = fixedWages(pay);
  const bonus = +slip.bonus || 0, extra = +slip.extra || 0;
  const gross = r2(fixed + (ot ? ot.total : 0) + bonus + extra);
  const sso = ssoMonth(fixed + (ot ? ot.total : 0), rules);
  const pvd = r2(+pay.salary * (+pay.pvdRate || 0));
  let withheld, wSource;
  if (slip.withheld != null && slip.withheld !== "") { withheld = +slip.withheld; wSource = "slip"; }
  else if (opts.noTax) { withheld = 0; wSource = "none"; }
  else { const yt = annualTax(state, +mk.slice(0, 4), { noRecurse: true }); withheld = r2(yt.liability / 12); wSource = "estimate"; }
  const loan = +pay.loanDeduct || 0;
  const net = r2(gross - sso - pvd - withheld - loan);
  const steps = [
    { label: "ค่าจ้างคงที่", formula: "เงินเดือน+ค่าครองชีพ+ค่าตำแหน่ง+ค่าเช่าบ้าน+ค่าสภาพแวดล้อม+เบี้ยขยัน", value: fixed },
    { label: "OT + เบี้ยเลี้ยง", formula: ot ? `รอบ ${mk}` : "ยังไม่มีบันทึก OT รอบนี้", value: ot ? ot.total : 0 },
    { label: "โบนัส/รายได้อื่น", formula: "จากสลิป", value: bonus + extra },
    { label: "รายได้รวม (Gross)", formula: "ผลรวมข้างบน", value: gross },
    { label: "ประกันสังคม", formula: `min(ค่าจ้าง, ${rules.ssoCap}) × 5%`, value: -sso },
    { label: "กองทุนสำรองฯ", formula: `เงินเดือน × ${(pay.pvdRate || 0) * 100}%`, value: -pvd },
    { label: "ภาษีหัก ณ ที่จ่าย", formula: wSource === "slip" ? "ตามสลิป" : "ภาษีทั้งปีโดยประมาณ ÷ 12", value: -withheld },
    { label: "หักเงินกู้บริษัท", formula: "ตั้งค่า", value: -loan },
    { label: "รับสุทธิ (Net Payroll)", formula: "Gross − รายการหัก", value: net }
  ];
  return { mk, fixed, ot, otTotal: ot ? ot.total : 0, bonus, extra, gross, sso, pvd, withheld, wSource, loan, net, steps };
}

/** Annual tax for AD year: actual OT records + projection for missing future months. */
function annualTax(state, adYear, opts = {}) {
  const be = beYear(adYear), rules = rulesFor(be), pay = state.pay, d = state.tax.d;
  const today = opts.today || ymd(new Date());
  const recorded = Object.keys(state.ot).filter(k => k.startsWith(adYear + "-"));
  const otOf = k => otCalc(state.ot[k].values, pay).total;
  const recent = Object.keys(state.ot).sort().slice(-6);
  const avgOT = recent.length ? sum(recent.map(otOf)) / recent.length : 0;
  let otYear = 0, projected = 0, wages = 0, ssoYear = 0;
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const mk = `${adYear}-${pad(m)}`;
    let o = 0, src = "none";
    if (state.ot[mk]) { o = otOf(mk); src = "actual"; }
    else if (pay.projectOT && mk >= monthKey(today)) { o = avgOT; src = "projected"; projected += o; }
    otYear += o;
    const w = fixedWages(pay) + o; wages += w;
    ssoYear += ssoMonth(w, rules);
    months.push({ mk, ot: r2(o), src });
  }
  const slips = Object.entries(state.payslips).filter(([k]) => k.startsWith(adYear + "-"));
  const bonus = (+state.tax.bonusYear || 0) + sum(slips.map(([, s]) => +s.bonus || 0));
  const extra = (+state.tax.extraYear || 0) + sum(slips.map(([, s]) => +s.extra || 0));
  const gross = r2(wages + bonus + extra);
  const expense = Math.min(gross * rules.expenseRate, rules.expenseCap);
  const salaryYear = +pay.salary * 12;
  const pvd = Math.min(salaryYear * (+pay.pvdRate || 0), gross * rules.pvdRate);
  const life = Math.min(+d.lifeIns, rules.lifeCap), health = Math.min(+d.healthIns, rules.healthCap);
  const lifeHealth = Math.min(life + health, rules.lifeHealthCap);
  const pension = Math.min(+d.pensionIns, gross * rules.pensionRate, rules.pensionCap);
  const rmf = Math.min(+d.rmf, gross * rules.rmfRate, rules.rmfCap);
  const ssf = Math.min(+d.ssf, gross * rules.ssfRate, rules.ssfCap);
  const retireGroup = Math.min(pvd + pension + rmf + ssf, rules.retireGroupCap);
  const thaiEsg = Math.min(+d.thaiEsg, gross * rules.thaiEsgRate, rules.thaiEsgCap);
  const allowances = {
    personal: rules.personal,
    spouse: d.spouse ? rules.spouse : 0,
    children: (+d.child30 || 0) * rules.child + (+d.child60 || 0) * rules.child2018,
    parents: Math.min(+d.parents || 0, rules.parentMax) * rules.parent,
    sso: r2(ssoYear),
    lifeHealth, parentHealth: Math.min(+d.parentHealthIns, rules.parentHealthCap),
    retireGroup: r2(retireGroup), thaiEsg: r2(thaiEsg),
    homeInterest: Math.min(+d.homeInterest, rules.homeInterestCap),
    other: +d.other || 0
  };
  const allowTotal = sum(Object.values(allowances));
  const beforeDon = Math.max(0, gross - expense - allowTotal);
  const donEdu = Math.min(2 * (+d.donationEdu || 0), beforeDon * rules.donationRate);
  const donGen = Math.min(+d.donation || 0, (beforeDon - donEdu) * rules.donationRate);
  const net = Math.max(0, r2(beforeDon - donEdu - donGen));
  const pt = progressiveTax(net, rules.brackets);
  const withheldActual = sum(slips.map(([, s]) => (s.withheld != null && s.withheld !== "") ? +s.withheld : 0));
  const monthsWithSlip = slips.filter(([, s]) => s.withheld != null && s.withheld !== "").length;
  const withheldEst = r2(withheldActual + (12 - monthsWithSlip) * (pt.tax / 12));
  const out = {
    year: be, rulesYear: rules.basedOn, gross, otYear: r2(otYear), projectedOT: r2(projected), months,
    expense: r2(expense), allowances, allowTotal: r2(allowTotal), donations: r2(donEdu + donGen),
    net, liability: pt.tax, rows: pt.rows, effective: gross ? pt.tax / gross : 0,
    marginal: (pt.rows[pt.rows.length - 1] || { rate: 0 }).rate,
    withheldActual: r2(withheldActual), withheldEst,
    refundOrDue: r2(withheldEst - pt.tax),           // + = refund, − = pay more
    takeHome: r2(gross - pt.tax - ssoYear - salaryYear * (+pay.pvdRate || 0) - (+pay.loanDeduct || 0) * 12),
    steps: [
      { label: "เงินได้พึงประเมินทั้งปี", formula: `ค่าจ้าง×12 + OT (${projected ? "รวมประมาณการ" : "ตามจริง"}) + โบนัส + อื่น ๆ`, value: gross },
      { label: "หักค่าใช้จ่าย", formula: `min(50%, ${fmtN(rules.expenseCap)})`, value: -r2(expense) },
      { label: "หักค่าลดหย่อน", formula: "ส่วนตัว+ครอบครัว+ประกันสังคม+ประกัน/กองทุน+อื่น ๆ", value: -r2(allowTotal) },
      { label: "หักเงินบริจาค", formula: "ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน", value: -r2(donEdu + donGen) },
      { label: "เงินได้สุทธิ", formula: "ผลลัพธ์", value: net },
      { label: "ภาษีตามขั้นบันได", formula: pt.rows.filter(r => r.rate).map(r => `${fmtN(r.to - r.from)}×${r.rate * 100}%`).join(" + ") || "ไม่ถึงเกณฑ์", value: pt.tax }
    ]
  };
  return out;
}
const fmtN = n => Math.round(n).toLocaleString("en-US");

/** OT simulator: extra OT hours at a multiplier → extra gross, extra tax, extra net (annual effect / month). */
function otSimulate(state, adYear, extraHoursPerMonth, mult = 1.5) {
  const base = annualTax(state, adYear);
  const extraMonth = r2(hourlyBase(state.pay) * extraHoursPerMonth * mult);
  const s2 = JSON.parse(JSON.stringify(state));
  s2.tax.extraYear = (+s2.tax.extraYear || 0) + extraMonth * 12;
  const sim = annualTax(s2, adYear);
  const taxDelta = r2(sim.liability - base.liability);
  return { extraMonth, extraYear: r2(extraMonth * 12), taxDeltaYear: taxDelta, netExtraMonth: r2(extraMonth - taxDelta / 12), marginal: sim.marginal };
}

/* ───────── debts ───────── */
const DEBT_TYPES = { card: "บัตรเครดิต", cash: "บัตรกดเงินสด", personal: "สินเชื่อส่วนบุคคล", car: "สินเชื่อรถยนต์", home: "สินเชื่อบ้าน", other: "หนี้อื่น ๆ" };
const DEFAULT_METHOD = { card: "card", cash: "card", personal: "reducing", car: "flat", home: "reducing", other: "reducing" };

function flatInstallment(debt) {
  const n = +debt.termMonths || 1;
  const interestTotal = +debt.principal * (+debt.apr / 100) * (n / 12);
  return { installment: r2((+debt.principal + interestTotal) / n), interestPer: r2(interestTotal / n), principalPer: r2(+debt.principal / n) };
}
function debtDue(debt, balance = +debt.balance) {
  if (balance <= 0) return 0;
  if (debt.method === "flat") return Math.min(balance, flatInstallment(debt).installment);
  if (debt.method === "card") {
    const min = Math.max(balance * (+debt.minPct || 8) / 100, +debt.minAmount || 0);
    return r2(Math.min(balance, Math.max(min, +debt.monthlyPay || 0)));
  }
  return r2(Math.min(balance * (1 + debt.apr / 1200), +debt.monthlyPay || 0));
}
function lastPaidDate(state, debt) {
  const ps = state.debtPayments.filter(p => p.debtId === debt.id).sort((a, b) => a.date.localeCompare(b.date));
  return ps.length ? ps[ps.length - 1].date : (debt.startDate || null);
}
/** Preview a payment: split interest / principal. Nothing changes until the user confirms → applyPayment. */
function previewPayment(state, debt, amount, date) {
  amount = +amount; let interest;
  if (debt.method === "flat") interest = Math.min(amount, flatInstallment(debt).interestPer);
  else {
    const last = lastPaidDate(state, debt);
    const days = last ? Math.max(1, Math.min(62, diffDays(last, date))) : 30;
    interest = r2(+debt.balance * (+debt.apr / 100) * days / 365);
    interest = Math.min(interest, amount);
  }
  const principal = r2(amount - interest);
  const newBalance = debt.method === "flat" ? r2(Math.max(0, +debt.balance - amount)) : r2(Math.max(0, +debt.balance - principal));
  return { amount, interest: r2(interest), principal, before: +debt.balance, after: newBalance, date };
}
function applyPayment(state, debtId, pv) {
  const debt = state.debts.find(x => x.id === debtId);
  if (!debt) throw new Error("debt not found");
  const p = { id: uid(), debtId, date: pv.date, month: monthKey(pv.date), amount: pv.amount, interest: pv.interest, principal: pv.principal, before: pv.before, after: pv.after, confirmedAt: Date.now() };
  state.debtPayments.push(p);
  debt.balance = pv.after;
  if (debt.balance <= 0 && !debt.closedAt) debt.closedAt = pv.date;
  return p;
}
/** Status of each debt's payment for month mk. */
function debtSchedule(state, mk, today = ymd(new Date())) {
  return state.debts.filter(d => !d.closedAt || d.closedAt >= `${mk}-01`).map(d => {
    const paid = state.debtPayments.filter(p => p.debtId === d.id && p.month === mk);
    const paidAmt = sum(paid.map(p => p.amount));
    const due = clampDay(mk, +d.dueDay || 1);
    const planned = paid.length ? Math.max(paidAmt, 0) : debtDue(d);
    const status = paid.length ? "paid" : (+d.balance <= 0 ? "closed" : today > due ? "overdue" : "planned");
    return { debt: d, due, planned: r2(planned), paidAmt: r2(paidAmt), status };
  });
}
/** Simulate payoff. strategy: "none" | "snowball" | "avalanche"; extra: extra baht per month. */
function simulatePayoff(debts, extra = 0, strategy = "avalanche") {
  const live = debts.filter(d => +d.balance > 0).map(d => ({ id: d.id, name: d.name, method: d.method, apr: +d.apr, bal: +d.balance, pay: debtDue(d), minPct: +d.minPct || 8, minAmount: +d.minAmount || 0, fixedPay: d.method === "flat" ? flatInstallment(d).installment : null, monthlyPay: +d.monthlyPay || 0, interestPaid: 0, paidOffAt: null }));
  let month = 0, totalInterest = 0, lastTotal = Infinity;
  const budget = sum(live.map(d => d.pay)) + extra;
  while (live.some(d => d.bal > 0.005) && month < 600) {
    month++;
    let pool = budget;
    for (const d of live) {
      if (d.bal <= 0) continue;
      if (d.method !== "flat") { const i = d.bal * d.apr / 1200; d.bal += i; d.interestPaid += i; totalInterest += i; }
      let due = d.method === "flat" ? d.fixedPay : d.method === "card" ? Math.max(d.bal * d.minPct / 100, d.minAmount, d.monthlyPay) : d.monthlyPay;
      due = Math.min(d.bal, due, pool);
      d.bal -= due; pool -= due;
      if (d.bal <= 0.005) { d.bal = 0; d.paidOffAt = month; }
    }
    if (strategy !== "none" && pool > 0) {
      const order = live.filter(d => d.bal > 0 && d.method !== "flat").sort((a, b) => strategy === "snowball" ? a.bal - b.bal : b.apr - a.apr || a.bal - b.bal);
      for (const d of order) { if (pool <= 0) break; const x = Math.min(pool, d.bal); d.bal -= x; pool -= x; if (d.bal <= 0.005) { d.bal = 0; d.paidOffAt = month; } }
    }
    const tb = sum(live.map(d => d.bal));
    if (month % 12 === 0) { if (tb >= lastTotal - 0.01) { month = Infinity; break; } lastTotal = tb; } // payments never cover interest
  }
  return { months: month, totalInterest: r2(totalInterest), perDebt: live.map(d => ({ id: d.id, name: d.name, paidOffAt: d.paidOffAt, interest: r2(d.interestPaid) })) };
}
function compareStrategies(debts, extras = [0, 500, 1000, 2000]) {
  const base = simulatePayoff(debts, 0, "none");
  return extras.map(x => {
    const sb = simulatePayoff(debts, x, "snowball"), av = simulatePayoff(debts, x, "avalanche");
    return { extra: x, snowball: sb, avalanche: av, monthsSaved: isFinite(base.months) ? base.months - av.months : null, interestSaved: r2(base.totalInterest - av.totalInterest) };
  });
}

/* ───────── expenses & available to spend ───────── */
const EXP_CATS = { home: "ค่าบ้าน", water: "ค่าน้ำ", power: "ค่าไฟ", net: "อินเทอร์เน็ต", food: "ค่าอาหาร", fuel: "ค่าน้ำมัน", phone: "ค่าโทรศัพท์", sub: "ค่าสมาชิก", travel: "ค่าเดินทาง", ins: "ประกันภัย", family: "ครอบครัว", other: "อื่น ๆ" };

function expenseMonth(state, mk) {
  const items = state.expenses.filter(e => e.active !== false);
  const logs = state.spend.filter(s => monthKey(s.date) === mk);
  const fixed = items.filter(e => e.kind === "fixed").map(e => {
    const paid = sum(logs.filter(l => l.itemId === e.id).map(l => l.amount));
    return { item: e, planned: +e.amount, paid: r2(paid), committed: r2(Math.max(+e.amount, paid)), due: clampDay(mk, +e.dueDay || 1), status: paid >= +e.amount ? "paid" : "planned" };
  });
  const varItems = items.filter(e => e.kind === "variable").map(e => {
    const spent = sum(logs.filter(l => l.itemId === e.id).map(l => l.amount));
    return { item: e, budget: +e.amount, spent: r2(spent), left: r2(+e.amount - spent) };
  });
  const fixedIds = new Set(items.filter(e => e.kind === "fixed").map(e => e.id));
  const variableLogs = logs.filter(l => !fixedIds.has(l.itemId));
  const byCat = {};
  for (const l of logs) byCat[l.cat || "other"] = r2((byCat[l.cat || "other"] || 0) + +l.amount);
  return {
    fixed, varItems, logs,
    fixedCommitted: r2(sum(fixed.map(f => f.committed))), fixedPaid: r2(sum(fixed.map(f => f.paid))),
    varBudget: r2(sum(varItems.map(v => v.budget))), varSpent: r2(sum(variableLogs.map(l => l.amount))),
    total: r2(sum(logs.map(l => l.amount))), byCat
  };
}

function goalSaved(g) { return r2((+g.have || 0) + sum((g.contributions || []).map(c => c.amount))); }
function goalInfo(g, today = ymd(new Date())) {
  const saved = goalSaved(g), target = +g.target || 0, remaining = r2(Math.max(0, target - saved));
  const pct = target ? Math.min(1, saved / target) : 0;
  const monthsLeft = g.deadline ? Math.max(1, (parse(g.deadline).getFullYear() - parse(today).getFullYear()) * 12 + parse(g.deadline).getMonth() - parse(today).getMonth()) : null;
  const suggested = monthsLeft ? r2(remaining / monthsLeft) : null;
  const monthsNeeded = +g.monthly > 0 ? Math.ceil(remaining / +g.monthly) : null;
  const eta = monthsNeeded != null ? addMonths(monthKey(today), monthsNeeded) : null;
  return { saved, target, remaining, pct, monthsLeft, suggested, monthsNeeded, eta, onTrack: suggested == null || +g.monthly >= suggested };
}
const goalContribMonth = (g, mk) => r2(sum((g.contributions || []).filter(c => monthKey(c.date) === mk).map(c => c.amount)));

function nextPayday(state, today) {
  const pd = +state.profile.payday || 25; const mk = monthKey(today);
  let d = clampDay(mk, pd); if (d < today) d = clampDay(addMonths(mk, 1), pd); return d;
}

/** The headline number. No double counting:
 *  · fixed items count max(planned, paid) once · debt payments live only in debtPayments
 *  · goal/savings money is an allocation (max(planned, actually moved)), never an expense. */
function available(state, mk, today = ymd(new Date())) {
  const pr = payroll(state, mk);
  const ex = expenseMonth(state, mk);
  const ds = debtSchedule(state, mk, today);
  const debtCommitted = r2(sum(ds.map(x => x.planned)));
  const debtPaid = r2(sum(ds.map(x => x.paidAmt)));
  const activeGoals = state.goals.filter(g => !g.doneAt || monthKey(g.doneAt) >= mk);
  const goalAlloc = r2(sum(activeGoals.map(g => Math.max(+g.monthly || 0, goalContribMonth(g, mk)))));
  const goalMoved = r2(sum(state.goals.map(g => goalContribMonth(g, mk))));
  const savings = r2(+state.budget.savingsMonthly || 0);
  const free = r2(pr.net - ex.fixedCommitted - debtCommitted - savings - goalAlloc - ex.varBudget);
  const safe = r2(pr.net - ex.fixedCommitted - debtCommitted - savings - goalAlloc - ex.varSpent);
  const inMonth = monthKey(today) === mk;
  const pd = nextPayday(state, today);
  const daysLeft = inMonth ? Math.max(1, diffDays(today, pd)) : daysInMonth(mk);
  const daily = r2(Math.max(0, safe) / daysLeft);
  const intended = r2(sum(ex.fixed.filter(f => f.status !== "paid").map(f => f.planned - f.paid)) + sum(ds.filter(x => x.status === "planned" || x.status === "overdue").map(x => x.planned)));
  const notDue = r2(sum(ex.fixed.filter(f => f.status !== "paid" && f.due > today).map(f => f.planned - f.paid)) + sum(ds.filter(x => x.status === "planned" && x.due > today).map(x => x.planned)));
  return {
    mk, net: pr.net, gross: pr.gross, payroll: pr, fixed: ex.fixedCommitted, debt: debtCommitted, savings, goals: goalAlloc,
    varBudget: ex.varBudget, varSpent: ex.varSpent, free, safe, daily, daysLeft, payday: pd,
    paid: r2(ex.fixedPaid + debtPaid + ex.varSpent + goalMoved), intended, notDue, expense: ex, debtRows: ds,
    overBudget: ex.varSpent > ex.varBudget,
    steps: [
      { label: "รับสุทธิ", formula: "Net Payroll เดือนนี้", value: pr.net },
      { label: "ค่าใช้จ่ายคงที่", formula: "Σ max(ที่ตั้งไว้, ที่จ่ายจริง)", value: -ex.fixedCommitted },
      { label: "ผ่อนหนี้", formula: "Σ งวดเดือนนี้ (จ่ายแล้ว/ที่ต้องจ่าย)", value: -debtCommitted },
      { label: "เงินออม", formula: "ตั้งค่าออมรายเดือน", value: -savings },
      { label: "จัดสรรเป้าหมาย", formula: "Σ max(ตั้งใจ, โอนจริง)", value: -goalAlloc },
      { label: "ใช้จ่ายผันแปรแล้ว", formula: "รายการที่ไม่ใช่ค่าใช้จ่ายคงที่", value: -ex.varSpent },
      { label: "เงินเหลือใช้จริง", formula: "ผลลัพธ์", value: safe },
      { label: "ใช้ได้ต่อวัน", formula: `${fmtN(Math.max(0, safe))} ÷ ${daysLeft} วัน ถึงเงินเดือน`, value: daily }
    ]
  };
}

/* ───────── journey ───────── */
const CHECKPOINTS = [
  { id: "base",  name: "Base Camp",    sub: "เริ่มจัดการการเงิน" },
  { id: "cp1",   name: "Checkpoint 1", sub: "เริ่มลดหนี้" },
  { id: "cp2",   name: "Checkpoint 2", sub: "ปลดหนี้ดอกเบี้ยสูง" },
  { id: "cp3",   name: "Checkpoint 3", sub: "สร้างเงินสำรอง" },
  { id: "cp4",   name: "Checkpoint 4", sub: "ซื้อสิ่งที่อยากได้" },
  { id: "summit",name: "Summit",       sub: "ถึงเป้าหมายการเงิน" }
];
function journeyProgress(state, today = ymd(new Date())) {
  const w = Object.assign({ debt: 35, emergency: 25, goals: 30, habits: 10 }, state.journey.weights);
  const debts = state.debts;
  const orig = sum(debts.map(d => +d.principal || +d.balance)), bal = sum(debts.map(d => Math.max(0, +d.balance)));
  const hasDebt = debts.length > 0;
  const debtPct = hasDebt && orig ? Math.max(0, 1 - bal / orig) : 1;
  const em = state.goals.find(g => g.isEmergency);
  const emPct = em ? goalInfo(em, today).pct : 0;
  const others = state.goals.filter(g => !g.isEmergency);
  const gw = sum(others.map(g => 4 - (+g.priority || 2)));
  const goalsPct = others.length ? sum(others.map(g => goalInfo(g, today).pct * (4 - (+g.priority || 2)))) / gw : 0;
  const mk = monthKey(today);
  const last3 = [addMonths(mk, -1), addMonths(mk, -2), addMonths(mk, -3)];
  const offered = last3.length * MISSIONS.length;
  const done = Object.keys(state.journey.claimed).filter(k => last3.includes(k.split("@")[1])).length;
  const habitsPct = offered ? done / offered : 0;
  const parts = [
    { k: "debt", label: hasDebt ? "ลดหนี้" : "ไม่มีหนี้", pct: debtPct, weight: hasDebt ? w.debt : 0 },
    { k: "emergency", label: "เงินสำรองฉุกเฉิน", pct: emPct, weight: w.emergency },
    { k: "goals", label: "เป้าหมายของฉัน", pct: goalsPct, weight: others.length ? w.goals : 0 },
    { k: "habits", label: "ภารกิจ 3 เดือน", pct: habitsPct, weight: w.habits }
  ];
  const tw = sum(parts.map(p => p.weight));
  const overall = tw ? sum(parts.map(p => p.pct * p.weight)) / tw : 0;
  const setup = +state.pay.salary > 0 && (state.expenses.length > 0 || state.goals.length > 0);
  const anyPaid = state.debtPayments.length > 0;
  const highOpen = debts.filter(d => +d.apr >= 15 && +d.balance > 0).length;
  const reached = {
    base: setup,
    cp1: setup && (!hasDebt || anyPaid),
    cp2: setup && (!hasDebt || (anyPaid && highOpen === 0)),
    cp3: setup && emPct >= 1,
    cp4: setup && others.some(g => goalInfo(g, today).pct >= 1),
    summit: setup && overall >= .95 && highOpen === 0 && emPct >= 1
  };
  let stage = 0; CHECKPOINTS.forEach((c, i) => { if (reached[c.id] && i === stage) stage = i + 1; });
  const next = CHECKPOINTS[stage] || null;
  return { overall, parts, reached, stage: Math.max(0, stage - 1), next, hasDebt };
}

const MISSIONS = [
  { id: "save2k", title: "เก็บเงินเข้าเป้าหมาย 2,000 บาท", xp: 120, live: true,
    eval: (s, mk) => { const v = sum(s.goals.map(g => goalContribMonth(g, mk))); return { value: v, target: 2000 }; } },
  { id: "debtOnTime", title: "จ่ายหนี้ทุกงวดตรงเวลา", xp: 150, live: false,
    eval: (s, mk) => { const rows = s.debts.length ? debtSchedule(s, mk, `${mk}-${pad(daysInMonth(mk))}`) : [];
      if (!rows.length) return { value: 0, target: 1, na: true };
      const ok = rows.filter(r => r.status === "paid" && s.debtPayments.some(p => p.debtId === r.debt.id && p.month === mk && p.date <= r.due)).length + rows.filter(r => r.status === "closed").length;
      return { value: ok, target: rows.length }; } },
  { id: "cut500", title: "ใช้จ่ายผันแปรน้อยกว่าเดือนก่อน 500 บาท", xp: 100, live: false,
    eval: (s, mk) => { const a = expenseMonth(s, addMonths(mk, -1)).varSpent, b = expenseMonth(s, mk).varSpent;
      if (!a) return { value: 0, target: 500, na: true }; return { value: r2(a - b), target: 500 }; } },
  { id: "noNewDebt", title: "ไม่สร้างหนี้ใหม่ทั้งเดือน", xp: 80, live: false,
    eval: (s, mk) => ({ value: s.debts.some(d => d.createdAt && monthKey(ymd(new Date(d.createdAt))) === mk) ? 0 : 1, target: 1 }) },
  { id: "otSave", title: "เอาเงิน OT 10% เข้าเป้าหมาย", xp: 100, live: true,
    eval: (s, mk) => { const ot = s.ot[mk] ? otCalc(s.ot[mk].values, s.pay).otPay : 0; if (!ot) return { value: 0, target: 1, na: true };
      return { value: sum(s.goals.map(g => goalContribMonth(g, mk))), target: r2(ot * .1) }; } },
  { id: "streak3", title: "ออมต่อเนื่อง 3 เดือน", xp: 200, live: true,
    eval: (s, mk) => { let n = 0; for (let i = 0; i < 3; i++) if (sum(s.goals.map(g => goalContribMonth(g, addMonths(mk, -i)))) > 0) n++; return { value: n, target: 3 }; } }
];
/** Missions for a month. `final` = month is over (or live mission already met). */
function missionsFor(state, mk, today = ymd(new Date())) {
  const over = monthKey(today) > mk;
  const started = state.meta && state.meta.createdAt ? monthKey(ymd(new Date(state.meta.createdAt))) : "0000-00";
  return MISSIONS.map(m => {
    const r = mk < started ? { value: 0, target: 1, na: true } : m.eval(state, mk); const met = !r.na && r.value >= r.target;
    const key = `${m.id}@${mk}`;
    const claimable = met && (m.live || over) && !state.journey.claimed[key];
    return { ...m, key, ...r, met, claimed: !!state.journey.claimed[key], claimable, waiting: met && !m.live && !over, pct: r.na ? 0 : Math.min(1, Math.max(0, r.value / r.target)) };
  });
}
function claimMission(state, mk, id, today = ymd(new Date())) {
  const m = missionsFor(state, mk, today).find(x => x.id === id);
  if (!m || !m.claimable) return false;           // dedupe: one claim per mission per month
  state.journey.claimed[m.key] = { xp: m.xp, at: Date.now() };
  return m.xp;
}
const BADGES = [
  { id: "first10k", name: "First 10K", desc: "เก็บเงินรวมครบ 10,000", xp: 150, test: s => sum(s.goals.map(goalSaved)) >= 10000 },
  { id: "debtSlayer", name: "Debt Slayer", desc: "ปิดหนี้ได้ 1 บัญชี", xp: 250, test: s => s.debts.some(d => d.closedAt) },
  { id: "moneyMaster", name: "Money Master", desc: "ทำภารกิจครบ 15 ครั้ง", xp: 300, test: s => Object.keys(s.journey.claimed).length >= 15 },
  { id: "saver", name: "Savings Champion", desc: "ออมต่อเนื่อง 3 เดือน", xp: 200, test: s => Object.keys(s.journey.claimed).some(k => k.startsWith("streak3@")) },
  { id: "summit", name: "Summit Explorer", desc: "ขึ้นถึงยอดเขา", xp: 500, test: s => journeyProgress(s).reached.summit }
];
/** Award newly earned badges once. Returns the list awarded this call. */
function awardBadges(state) {
  const got = [];
  for (const b of BADGES) if (!state.journey.badges[b.id] && b.test(state)) { state.journey.badges[b.id] = { at: Date.now(), xp: b.xp }; got.push(b); }
  return got;
}
function xpTotal(state) { return sum(Object.values(state.journey.claimed).map(c => c.xp)) + sum(Object.values(state.journey.badges).map(b => b.xp)); }
function level(xp) { let lv = 1, need = 300, acc = 0; while (xp >= acc + need) { acc += need; lv++; need = Math.round(need * 1.25); } return { lv, into: xp - acc, need }; }

/* ───────── reminders (in-app) ───────── */
function apptOccurrences(appt, from, to) {
  const out = []; if (!appt.date) return out;
  const step = { daily: 1, weekly: 7 }[appt.repeat];
  if (!appt.repeat || appt.repeat === "none") { if (appt.date >= from && appt.date <= to) out.push(appt.date); return out; }
  let d = appt.date, guard = 0;
  while (d <= to && guard++ < 1000) {
    if (d >= from) out.push(d);
    if (step) d = addDays(d, step);
    else if (appt.repeat === "monthly") { const dd = parse(appt.date).getDate(); const nk = addMonths(monthKey(d), 1); d = clampDay(nk, dd); }
    else if (appt.repeat === "yearly") { const p = parse(d); d = `${p.getFullYear() + 1}-${appt.date.slice(5)}`; }
    else break;
  }
  return out;
}

const API = { pad, ymd, parse, addDays, diffDays, monthKey, addMonths, daysInMonth, clampDay, beYear, r2, sum, uid,
  OT_FIELDS, defaultState, hourlyBase, toHours, otCalc, otPeriod, periodKeyFor,
  TAX_RULES, rulesFor, progressiveTax, ssoMonth, payroll, annualTax, otSimulate,
  DEBT_TYPES, DEFAULT_METHOD, flatInstallment, debtDue, previewPayment, applyPayment, debtSchedule, simulatePayoff, compareStrategies,
  EXP_CATS, expenseMonth, goalSaved, goalInfo, goalContribMonth, nextPayday, available,
  CHECKPOINTS, journeyProgress, MISSIONS, missionsFor, claimMission, BADGES, awardBadges, xpTotal, level, apptOccurrences };
if (typeof module !== "undefined") module.exports = API; else root.MQ = API;
})(this);
