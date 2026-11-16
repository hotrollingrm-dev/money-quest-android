/* Calculation tests on a mock dataset — run: node test.js */
const M = require("./engine.js");
let pass = 0, fail = 0; const out = [];
const eq = (name, got, want, tol = 0.01) => { const ok = Math.abs(got - want) <= tol; ok ? pass++ : fail++; out.push(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got}  want ${want}`); };
const ok = (name, cond, info = "") => { cond ? pass++ : fail++; out.push(`${cond ? "PASS" : "FAIL"}  ${name} ${info}`); };

/* ── mock data (sample, never shipped as user data) ── */
const S = M.defaultState(); S.meta.createdAt = new Date(2026, 0, 1).getTime();
Object.assign(S.pay, { salary: 18000, living: 1500, position: 0, rent: 1500, env: 500, diligence: 700, pvdRate: 0.03, otherMult: 2 });
S.profile.payday = 25;
S.ot["2026-10"] = { values: { h1: null, h15: { h: 20, m: 30 }, h3: { h: 12, m: 0 }, h15p: null, h2p: { h: 8, m: 0 }, other: null, meal: { v: 1100 }, mealOt: { v: 350 }, shift: { v: 1320 } } };
S.ot["2026-11"] = { values: { h1: null, h15: { h: 16, m: 0 }, h3: null, h15p: null, h2p: null, other: { h: 2, m: 0 }, meal: { v: 1000 }, mealOt: { v: 280 }, shift: { v: 1200 } } };

/* 1. OT formula (OT Scan / Cal_OT.xlsx) */
const rate = (18000 + 1500 + 0 + 1500) / 30 / 8; // 87.5
eq("hourly base", M.hourlyBase(S.pay), 87.5);
const ot = M.otCalc(S.ot["2026-10"].values, S.pay);
eq("OT x1.5 20:30", ot.lines.find(l => l.k === "h15").amount, M.r2(87.5 * 20.5 * 1.5));
eq("OT total pay", ot.otPay, M.r2(87.5 * (20.5 * 1.5 + 12 * 3 + 8 * 2)));
eq("allowances", ot.allowances, 1100 + 350 + 1320);
ok("meal divisible by 50", ot.lines.find(l => l.k === "meal").divisible);
eq("other uses custom multiplier", M.otCalc(S.ot["2026-11"].values, S.pay).lines.find(l => l.k === "other").amount, 87.5 * 2 * 2);
ok("pay period 2026-10 = 16 Sep–15 Oct", JSON.stringify(M.otPeriod("2026-10")) === JSON.stringify({ from: "2026-09-16", to: "2026-10-15" }));
ok("period key of 2026-10-20 is 2026-11", M.periodKeyFor("2026-10-20") === "2026-11");

/* 2. Tax engine */
eq("progressive 400,000 → 17,500", M.progressiveTax(400000).tax, 17500);
eq("progressive 150,000 → 0", M.progressiveTax(150000).tax, 0);
eq("progressive 1,040,000 → 125,000 (KTC table)", M.progressiveTax(1040000).tax, 125000);
eq("SSO 2569 cap 17,500 → 875", M.ssoMonth(25000, M.rulesFor(2569)), 875);
eq("SSO 2568 cap 15,000 → 750", M.ssoMonth(25000, M.rulesFor(2568)), 750);
eq("SSO below cap 16,000 → 800", M.ssoMonth(16000, M.rulesFor(2569)), 800);
ok("2576 falls back to latest rule (2575 cap 23,000)", M.rulesFor(2576).ssoCap === 23000);
// hand-check one annual case: no OT, salary 50,000 flat, 2569
const T = M.defaultState(); T.pay.salary = 50000; T.pay.projectOT = false;
const tt = M.annualTax(T, 2026, { today: "2026-11-17" });
// gross 600,000; expense 100,000; personal 60,000; sso 875×12 = 10,500 → net 429,500 → 7,500 + 12,950 = 20,450
eq("annual gross", tt.gross, 600000); eq("annual net income", tt.net, 429500); eq("annual tax", tt.liability, 20450);
ok("top rate is not applied to all income", tt.liability < 600000 * tt.marginal, `(${tt.liability} < ${600000 * tt.marginal})`);
// deductions caps
const D = JSON.parse(JSON.stringify(T)); Object.assign(D.tax.d, { lifeIns: 90000, healthIns: 30000, donation: 50000 });
const td = M.annualTax(D, 2026, { today: "2026-11-17" });
eq("life+health capped at 100,000", td.allowances.lifeHealth, 100000);
ok("donation capped at 10%", td.donations <= (600000 - 100000 - td.allowTotal) * 0.1 + 0.01, `(${td.donations})`);

/* 3. Payroll */
const pr = M.payroll(S, "2026-10");
const fixed = 18000 + 1500 + 1500 + 500 + 700;
eq("gross = fixed + OT + allowances", pr.gross, M.r2(fixed + ot.total));
eq("SSO capped", pr.sso, 875);
eq("PVD 3% of salary", pr.pvd, 540);
eq("net = gross − sso − pvd − withheld", pr.net, M.r2(pr.gross - 875 - 540 - pr.withheld));
S.payslips["2026-10"] = { withheld: 312.5 };
eq("payslip withholding overrides estimate", M.payroll(S, "2026-10").withheld, 312.5);

/* 4. Debts */
const card = { id: "c1", name: "บัตร A", type: "card", method: "card", principal: 30000, balance: 30000, apr: 16, minPct: 8, minAmount: 1000, monthlyPay: 0, dueDay: 5, startDate: "2026-09-05" };
const car = { id: "v1", name: "รถ", type: "car", method: "flat", principal: 300000, balance: 0, apr: 3, termMonths: 60, dueDay: 10, startDate: "2025-01-10" };
const fi = M.flatInstallment(car); car.balance = M.r2(fi.installment * 40);
const loan = { id: "p1", name: "สินเชื่อ", type: "personal", method: "reducing", principal: 50000, balance: 50000, apr: 22, monthlyPay: 2500, dueDay: 20, startDate: "2026-10-20" };
S.debts.push(card, car, loan);
eq("flat installment 300k 3% 60m", fi.installment, M.r2((300000 + 300000 * 0.03 * 5) / 60));
eq("card min 8%", M.debtDue(card), 2400);
const pv = M.previewPayment(S, card, 3000, "2026-10-05");
eq("card interest 30 days @16%", pv.interest, M.r2(30000 * 0.16 * 30 / 365));
ok("preview does not change balance", card.balance === 30000);
M.applyPayment(S, "c1", pv);
eq("balance after confirmed payment", card.balance, M.r2(30000 - (3000 - pv.interest)));
const pv2 = M.previewPayment(S, car, fi.installment, "2026-10-10");
eq("flat interest per installment", pv2.interest, fi.interestPer);
const sched = M.debtSchedule(S, "2026-10", "2026-10-25");
ok("card paid this month", sched.find(r => r.debt.id === "c1").status === "paid");
ok("loan overdue (due 20th, today 25th, unpaid)", sched.find(r => r.debt.id === "p1").status === "overdue");
const cmp = M.compareStrategies([{ ...card }, { ...loan }, { ...car }], [0, 1000]);
ok("avalanche saves interest vs no extra", cmp[1].avalanche.totalInterest < cmp[0].avalanche.totalInterest);
ok("avalanche ≤ snowball interest", cmp[1].avalanche.totalInterest <= cmp[1].snowball.totalInterest + 0.01, `${cmp[1].avalanche.totalInterest} vs ${cmp[1].snowball.totalInterest}`);
ok("extra 1,000 finishes sooner", cmp[1].avalanche.months < cmp[0].avalanche.months);
const never = M.simulatePayoff([{ id: "x", method: "reducing", apr: 30, balance: 100000, monthlyPay: 1000 }], 0, "none");
ok("payment below interest → never paid off", never.months === Infinity);

/* 5. Expenses, goals, available-to-spend (no double counting) */
S.expenses.push({ id: "e1", name: "ค่าห้อง", cat: "home", kind: "fixed", amount: 4000, dueDay: 1 },
                { id: "e2", name: "ค่าไฟ", cat: "power", kind: "fixed", amount: 800, dueDay: 15 },
                { id: "e3", name: "อาหาร", cat: "food", kind: "variable", amount: 6000 });
S.spend.push({ id: "s1", date: "2026-10-01", amount: 4000, cat: "home", itemId: "e1" },
             { id: "s2", date: "2026-10-15", amount: 950, cat: "power", itemId: "e2" },     // over plan by 150
             { id: "s3", date: "2026-10-03", amount: 320, cat: "food", itemId: "e3" },
             { id: "s4", date: "2026-10-04", amount: 180, cat: "travel" });               // unbudgeted
S.goals.push({ id: "g1", name: "เงินสำรอง", target: 30000, have: 5000, monthly: 2000, isEmergency: true, priority: 1, contributions: [{ id: "c", date: "2026-10-26", amount: 2500 }] },
             { id: "g2", name: "กล้อง", target: 25000, have: 0, monthly: 1500, priority: 2, deadline: "2027-06-01", contributions: [] });
S.budget.savingsMonthly = 1000;
const ex = M.expenseMonth(S, "2026-10");
eq("fixed committed uses max(plan, paid)", ex.fixedCommitted, 4000 + 950);
eq("variable spent excludes fixed bills", ex.varSpent, 320 + 180);
const av = M.available(S, "2026-10", "2026-10-26");
const debtThisMonth = M.r2(M.sum(av.debtRows.map(r => r.planned)));
eq("goal allocation = max(monthly, moved)", av.goals, 2500 + 1500);
eq("safe = net − fixed − debt − savings − goals − variable spent", av.safe, M.r2(av.net - 4950 - debtThisMonth - 1000 - 4000 - 500));
eq("free = net − … − variable budget", av.free, M.r2(av.net - 4950 - debtThisMonth - 1000 - 4000 - 6000));
ok("paying a fixed bill does not lower safe twice", (() => { const S2 = JSON.parse(JSON.stringify(S)); S2.spend.push({ id: "s5", date: "2026-10-26", amount: 0.01, cat: "home", itemId: "e1" }); return Math.abs(M.available(S2, "2026-10", "2026-10-26").safe - av.safe) < 0.02; })());
ok("goal contribution is not counted as spending", av.expense.total === 4000 + 950 + 320 + 180);
eq("daily = safe ÷ days to payday (26 Oct → 25 Nov = 30)", av.daily, M.r2(Math.max(0, av.safe) / 30));
const gi = M.goalInfo(S.goals[1], "2026-11-17");
eq("goal suggested monthly to deadline (7 months)", gi.suggested, M.r2(25000 / 7));

/* 6. Journey / missions — no double rewards */
const mk = "2026-10";
const ms = M.missionsFor(S, mk, "2026-11-02");
const save = ms.find(m => m.id === "save2k");
ok("save2k met (2,500 ≥ 2,000)", save.met && save.claimable);
const xp1 = M.claimMission(S, mk, "save2k", "2026-11-02");
const xp2 = M.claimMission(S, mk, "save2k", "2026-11-02");
ok("mission pays once", xp1 === 120 && xp2 === false);
const b1 = M.awardBadges(S).map(b => b.id), b2 = M.awardBadges(S);
ok("badges awarded once", b2.length === 0, `(first: ${b1.join(",") || "none"})`);
const jp = M.journeyProgress(S, "2026-11-17");
ok("overall progress between 0 and 1", jp.overall > 0 && jp.overall < 1, `(${(jp.overall * 100).toFixed(1)}%)`);
ok("Base Camp reached with salary + expenses", jp.reached.base);
ok("Checkpoint 2 not reached while 16-22% debts open", !jp.reached.cp2);
eq("XP total", M.xpTotal(S), 120 + M.sum(Object.values(S.journey.badges).map(b => b.xp)));

/* 7. Reminders */
ok("monthly repeat clamps to month end", M.apptOccurrences({ date: "2026-01-31", repeat: "monthly" }, "2026-02-01", "2026-03-31").join() === "2026-02-28,2026-03-31");
ok("weekly repeat", M.apptOccurrences({ date: "2026-11-02", repeat: "weekly" }, "2026-11-01", "2026-11-30").length === 5);

ok("missions before first use are not claimable", (() => { const Z = M.defaultState(); Z.meta.createdAt = new Date(2026, 10, 10).getTime(); return !M.missionsFor(Z, "2026-10", "2026-11-17").some(m => m.claimable); })());
console.log(out.join("\n")); console.log(`\n${pass} passed, ${fail} failed`);
console.log("\nSample: Oct payroll", JSON.stringify({ gross: pr.gross, sso: pr.sso, pvd: pr.pvd, withheld: pr.withheld, net: pr.net }));
console.log("Sample: available", JSON.stringify({ net: av.net, fixed: av.fixed, debt: av.debt, savings: av.savings, goals: av.goals, varSpent: av.varSpent, safe: av.safe, daily: av.daily }));
console.log("Sample: strategies +1000", JSON.stringify({ snowball: [cmp[1].snowball.months, cmp[1].snowball.totalInterest], avalanche: [cmp[1].avalanche.months, cmp[1].avalanche.totalInterest], baseline: [cmp[0].avalanche.months, cmp[0].avalanche.totalInterest] }));
process.exit(fail ? 1 : 0);
