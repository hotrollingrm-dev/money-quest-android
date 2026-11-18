/* MONEY QUEST — Smart Debt screens. All numbers come from MQ.D (debt.js); this file only draws and collects input. */
const D = E.D;
const LENDERS = {
  KBANK: ["กสิกรไทย", "#138F2D"], SCB: ["ไทยพาณิชย์", "#4E2A84"], KTB: ["กรุงไทย", "#1BA5E1"], BBL: ["กรุงเทพ", "#1E3D8F"], BAY: ["กรุงศรี", "#F2B700"],
  KTC: ["KTC", "#E2231A"], TTB: ["ทีทีบี", "#0050F0"], UOB: ["UOB", "#0B2F6B"], CARDX: ["CardX", "#2B1F5C"], AEON: ["อิออน", "#B6006D"],
  GSB: ["ออมสิน", "#EB198D"], GHB: ["ธอส.", "#F37021"], BAAC: ["ธ.ก.ส.", "#00733C"], KKP: ["เกียรตินาคินภัทร", "#5B3E8C"], TISCO: ["ทิสโก้", "#173F7A"],
  LHB: ["แลนด์ แอนด์ เฮ้าส์", "#6E8B3D"], SHOPEE: ["Shopee", "#EE4D2D"], LAZADA: ["Lazada", "#0F146D"], OTHER: ["อื่น ๆ", "#6E7A57"]
};
const lname = k => (LENDERS[k] || [k || ""])[0], lcol = (k, d) => (d && d.color) || (LENDERS[k] || [0, "#6E7A57"])[1];
const DSUB = [["home", "ภาพรวม", "chart"], ["cards", "บัตร", "card"], ["inst", "ผ่อนรายการ", "cart"], ["loans", "สินเชื่อ", "house"], ["plan", "แผนปลดหนี้", "peak"], ["prepay", "ทดลองโปะ", "target"]];
const STATUS_TAG = { paid: ["g", "จ่ายแล้ว"], overdue: ["r", "เลยกำหนด"], confirmed: ["k", "ยอดจริง"], estimated: ["y", "ประมาณ"], unrecorded: ["y", "ยังไม่ใส่ statement"], partial: ["y", "จ่ายบางส่วน"], planned: ["y", "รอจ่าย"], closed: ["g", "ปิดแล้ว"], none: ["", "ไม่มียอด"] };
const tagOf = (s, src) => { const [c, l] = STATUS_TAG[s === "planned" && src ? src : s] || ["", s]; return `<span class="tag ${c}">${l}</span>`; };
const typeArt = { card: "card", cash: "atm", personal: "people", bnpl: "cart", home: "house", car: "car", other: "doc" };
const dsS = () => { S.installments = S.installments || []; S.cardStatements = S.cardStatements || []; S.refRates = S.refRates || []; };
const pctTxt = x => `${Math.round(x * 100)}%`;
function ratePill(d, td) {
  const r = D.rateAt(S, d, td), s = r.step;
  if (s && s.kind === "float") return r.rate == null ? `<span class="tag r">${esc(r.missing)}</span>` : `<span class="tag l">${s.ref} ${s.margin >= 0 ? "+" : "−"} ${Math.abs(s.margin)}% = ${r.rate}%</span>`;
  return `<span class="tag">${r.rate ?? 0}% คงที่</span>`;
}

function mDebt() {
  dsS(); const sub = view.debt || "home";
  return `${tchips(DSUB, sub, "dxTab")}${({ home: dxHome, cards: dxCards, inst: dxInst, loans: dxLoans, plan: dxPlan, prepay: dxPrepay }[sub] || dxHome)()}`;
}

/* ── 1. overview ── */
function dxHome() {
  const td = today(), o = D.overview(S, td), fc = D.forecast(S, view.dxFc || 6, td), al = D.alerts(S, td);
  const has = S.debts.some(d => d.status !== "closed");
  const tiles = [["card", "บัตรเครดิต", (o.byType.card || 0)], ["atm", "บัตรกดเงินสด / ส่วนบุคคล", (o.byType.cash || 0) + (o.byType.personal || 0)], ["house", "สินเชื่อบ้าน", o.byType.home || 0], ["cart", "Shopee / ผ่อนรายเดือน", o.byType.bnpl || 0]];
  if (o.byType.car) tiles.push(["car", "สินเชื่อรถ", o.byType.car]);
  const q = [["card", "เพิ่มบัตร", "dxCardForm"], ["cart", "เพิ่มรายการผ่อน", "dxInstForm"], ["receipt", "เพิ่ม Shopee", "dxBnplForm"], ["house", "เพิ่มสินเชื่อ", "dxLoanForm"], ["check", "บันทึกจ่าย", "dxPayPick"], ["target", "ทดลองโปะ", "dxTabGo:prepay"], ["peak", "แผนปลดหนี้", "dxTabGo:plan"], ["doc", "ใส่ statement", "dxStmtPick"]];
  const mx = Math.max(1, ...fc.map(m => m.total));
  const chart = `<div class="fcast">${fc.map(m => `<div class="fc"><div class="fcb">${[["loans", "#78B536"], ["confirmed", "#4C5A35"], ["installments", "#F2B21B"], ["estimated", "#C9D6A3"]].map(([k, c]) => m[k] ? `<i style="height:${m[k] / mx * 100}%;background:${c}" title="${k}"></i>` : "").join("")}</div><b>${m.total >= 1000 ? fmt(m.total / 1000, 1) + "k" : fmt(m.total)}</b><small>${mShort(m.mk).split(" ")[0]}</small></div>`).join("")}</div>
    <div class="legend" style="margin-top:8px"><span><i style="background:#4C5A35"></i>ยอด statement จริง</span><span><i style="background:#F2B21B"></i>ผ่อนรายเดือน</span><span><i style="background:#78B536"></i>ค่างวดสินเชื่อ</span><span><i style="background:#C9D6A3"></i>ประมาณการ</span></div>`;
  const rows = o.rows.filter(r => r.planned > 0 || r.status === "overdue").sort((a, b) => a.due.localeCompare(b.due));
  return `${has ? `<div class="card dhero">
      <div class="between"><span><small class="muted">หนี้คงเหลือทั้งหมด</small><span class="money" style="display:block;font-size:34px;line-height:1.1">${baht(o.total)}</span></span>${art("piggy", 54)}</div>
      <div class="kv" style="margin-top:12px"><div><small>เดือนนี้ต้องจ่าย</small><b>${baht(o.monthDue)}</b><small>จ่ายแล้ว ${baht(o.monthPaid)} · เหลือ ${baht(o.monthLeft)}</small></div>
        <div><small>${o.next && o.next.status === "overdue" ? "เลยกำหนด!" : "ครบกำหนดถัดไป"}</small><b style="${o.next && o.next.status === "overdue" ? "color:var(--bad)" : ""}">${o.next ? dShort(o.next.due) : "—"}</b><small>${o.next ? esc(o.next.debt.name) + " " + baht(o.next.planned) : "ไม่มีรายการค้าง"}</small></div>
        <div><small>คาดว่าปลดหนี้หมด</small><b>${o.debtFree ? mLabel(o.debtFree) : "ยังปิดไม่ได้"}</b><small>ตามแผน ${({ hybrid: "อัจฉริยะ", avalanche: "ดอกสูงก่อน", snowball: "ก้อนเล็กก่อน" })[S.debtStrategy || "hybrid"]}${+S.debtPlanExtra ? ` + โปะ ${fmt(S.debtPlanExtra)}/ด.` : ""}</small></div>
        <div><small>ดอกเบี้ยต่อเดือน (ประมาณ)</small><b>${baht(o.interestMonth)}</b><small>ดอกเบี้ยเฉลี่ยถ่วงน้ำหนัก ${o.weightedApr}%</small></div></div>
      <div class="pbar" style="margin-top:12px"><i style="width:${Math.min(100, o.progress * 100)}%"></i></div><small class="muted">ปลดหนี้ไปแล้ว ${pctTxt(o.progress)} · ${o.count} บัญชี</small></div>
    <div class="metrics">${tiles.map(([i, l, v]) => metric(i, l, v)).join("")}</div>` : `<div class="card empty">${miloSVG("idle", { cls: "mini" })}<b>ยังไม่มีหนี้ในระบบ</b>เริ่มจากเพิ่มบัตรเครดิต Shopee หรือสินเชื่อบ้าน ด้วยปุ่มด้านล่าง</div>`}
    <div class="quick q8">${q.map(([i, l, a]) => `<button data-act="${a.split(":")[0]}" ${a.includes(":") ? `data-k="${a.split(":")[1]}"` : ""}>${art(i, 46)}<span>${l}</span></button>`).join("")}</div>
    ${al.length ? `<div class="card"><b class="row" style="gap:8px">${art("bell", 30)} แจ้งเตือนหนี้</b><div class="list" style="margin-top:6px">${al.slice(0, 6).map(a => `<div class="li"><span class="dot" style="background:var(--${a.level === "bad" ? "bad" : a.level === "good" ? "good" : "sun-deep"})"></span><div class="t"><b>${esc(a.title)}</b><small>${esc(a.sub || "")}</small></div></div>`).join("")}</div></div>` : ""}
    ${rows.length ? `<div class="sec-h"><h2>ต้องจ่ายเดือนนี้</h2></div><div class="card"><div class="list">${rows.map(r => `<div class="li"><div class="ic">${art(typeArt[r.debt.type] || "doc", 40)}</div><div class="t"><b>${esc(r.debt.name)}</b><small>ครบ ${dShort(r.due)}${r.bill && r.bill.installments ? ` · รวมผ่อน ${baht(r.bill.installments)}` : ""}</small></div><div class="v">${baht(r.planned)}<small>${tagOf(r.status, r.source)}</small></div>${r.status !== "paid" ? `<button class="b3 sq" data-act="dxPay" data-id="${r.debt.id}" aria-label="บันทึกจ่าย">${art("check", 28, "flat")}</button>` : ""}</div>`).join("")}</div>
      <p class="sub" style="margin-top:8px">ยอดผ่อนที่อยู่ในบัตรนับรวมในยอดบัตรครั้งเดียว ไม่หักซ้ำในเงินเหลือใช้</p></div>` : ""}
    ${has ? `<div class="sec-h"><h2>ภาระหนี้ล่วงหน้า</h2><span class="seg">${[3, 6, 12].map(n => `<button data-act="dxFc" data-n="${n}" aria-pressed="${(view.dxFc || 6) === n}">${n} ด.</button>`).join("")}</span></div><div class="card">${chart}</div>` : ""}
    ${dxHistory()}`;
}
function dxHistory(id) {
  const ps = S.debtPayments.filter(p => !p.deletedAt && (!id || p.debtId === id)).sort((a, b) => b.date.localeCompare(a.date) || b.confirmedAt - a.confirmedAt).slice(0, id ? 20 : 8);
  if (!ps.length) return "";
  return `<div class="sec-h"><h2>ประวัติการจ่าย</h2></div><div class="card"><div class="list">${ps.map(p => { const d = S.debts.find(x => x.id === p.debtId); return `<div class="li"><div class="ic">${art(p.kind === "extra" ? "target" : "check", 38)}</div><div class="t"><b>${esc(d ? d.name : "หนี้ที่ลบแล้ว")}${p.kind === "extra" ? " · โปะ" : ""}</b><small>${dShort(p.date)}${+p.interest ? ` · ดอก ${baht(p.interest, 2)} · ต้น ${baht(p.principal)}` : ""}${+p.fee ? ` · ค่าธรรมเนียม ${baht(p.fee)}` : ""}</small></div><div class="v">${baht(p.amount)}<small>เหลือ ${baht(p.after)}</small></div><button class="icon-btn" data-act="dxPayDel" data-id="${p.id}" aria-label="ลบรายการนี้">${art("trash", 26, "flat")}</button></div>`; }).join("")}</div></div>`;
}

/* ── 2. credit cards ── */
function cardFace(d, td) {
  const mk = E.monthKey(td), u = D.utilization(S, d, td), c = D.cycleFor(d, mk), b = D.cardBill(S, d, E.monthKey(c.due >= td ? c.due : E.addMonths(mk, 1) + "-01") , td);
  const col = lcol(d.lender, d);
  return `<button class="ccard ${d.status === "locked" ? "locked" : ""}" style="--cc:${col}" data-act="dxCard" data-id="${d.id}">
    <span class="cc-top"><b>${esc(lname(d.lender))}</b><span>${d.type === "cash" ? "บัตรกดเงินสด" : "บัตรเครดิต"}${d.status === "locked" ? " · ล็อก" : ""}</span></span>
    <span class="cc-name">${esc(d.name)}</span>
    <span class="cc-chip"></span>
    <span class="cc-due"><small>ต้องจ่ายรอบนี้ · ครบ ${dShort(b.due)}</small><b>${baht(b.plan)}</b>${b.source !== "confirmed" ? `<em>${b.source === "estimated" ? "ประมาณ" : "ยังไม่ใส่ statement"}</em>` : ""}</span>
    <span class="cc-lim"><span>ใช้ ${baht(u.used)} / ${baht(u.limit)}</span><span>${+d.limit ? pctTxt(u.pct) : ""}</span></span>
    <span class="cc-bar"><i style="width:${Math.min(100, u.pct * 100)}%;background:${u.pct >= .8 ? "#FF6B57" : "#fff"}"></i></span>
    <span class="cc-cyc">ตัดรอบวันที่ ${d.statementDay || "?"} · ครบกำหนดวันที่ ${d.dueDay || "?"}</span></button>`;
}
function dxCards() {
  const td = today(), cards = S.debts.filter(d => D.kindOf(d) === "revolving" && d.status !== "closed");
  return `<div class="sec-h"><h2>บัตรของฉัน</h2><button data-act="dxCardForm">+ เพิ่มบัตร</button></div>
    ${cards.length ? `<div class="cgrid">${cards.map(d => cardFace(d, td)).join("")}</div>` : `<div class="card empty">${art("card", 56)}<b>ยังไม่มีบัตร</b>กด “เพิ่มบัตร” แล้วใส่วงเงิน วันตัดรอบ และวันครบกำหนด</div>`}
    ${S.debts.some(d => D.kindOf(d) === "revolving" && d.status === "closed") ? `<p class="sub">บัตรที่ปิดแล้ว: ${S.debts.filter(d => D.kindOf(d) === "revolving" && d.status === "closed").map(d => esc(d.name)).join(", ")}</p>` : ""}`;
}
function sheetCard(id) {
  const d = S.debts.find(x => x.id === id); if (!d) return; const td = today(), mk = E.monthKey(td);
  const c = D.cycleFor(d, mk), dueMk = c.due >= td ? mk : E.addMonths(mk, 1), b = D.cardBill(S, d, dueMk, td), u = D.utilization(S, d, td);
  const lastSt = (S.cardStatements || []).filter(s => s.debtId === id && !s.deletedAt).sort((a, b2) => b2.stDate.localeCompare(a.stDate))[0];
  const insts = D.instsOf(S, id), futureInst = E.sum(insts.map(i => D.instInfo(i, D.cycleFor(d, dueMk).stMonth).remaining));
  const sim = D.simulateCard(d, { custom: view.dxCustom || Math.max(b.min * 2, 1000), balance: Math.max(+d.balance, 0) });
  const col = s => !s || s.never ? "ไม่มีวันหมด" : `${s.months} เดือน`;
  openSheet(`<div class="grab"></div>${cardFace(d, td)}
    <div class="four">
      <div><small>1 · ยอดใช้จ่ายที่ยังไม่เรียกเก็บ</small><b>${baht(d.unbilled || 0)}</b><button class="link" data-act="dxUnbilled" data-id="${id}">แก้</button></div>
      <div><small>2 · statement ล่าสุด</small><b>${lastSt ? baht(lastSt.amount) : "—"}</b><small>${lastSt ? dShort(lastSt.stDate) : "ยังไม่ได้ใส่"}</small></div>
      <div><small>3 · ต้องจ่ายรอบนี้ (ครบ ${dShort(b.due)})</small><b>${baht(b.plan)}</b><small>ขั้นต่ำ ${baht(b.min)}${b.minAssumed ? " (สมมติ)" : ""} · จ่ายแล้ว ${baht(b.paid)}</small></div>
      <div><small>4 · ยอดผ่อนที่เหลือในอนาคต</small><b>${baht(futureInst)}</b><small>${insts.filter(i => !D.instInfo(i, dueMk).done).length} รายการ</small></div></div>
    <div class="acts" style="flex-wrap:wrap"><button class="btn primary" data-act="dxPay" data-id="${id}">${art("check", 26, "flat")} บันทึกจ่าย</button><button class="btn ghost" data-act="dxStmt" data-id="${id}">${art("doc", 26, "flat")} ใส่ statement</button>
      <button class="btn ghost" data-act="dxInstForm" data-id="" data-debt="${id}">${art("cart", 26, "flat")} เพิ่มผ่อน</button><button class="btn ghost" data-act="dxCardForm" data-id="${id}">${art("edit", 26, "flat")} แก้ไขบัตร</button></div>
    ${insts.length ? `<h4 style="margin:16px 0 6px">รายการผ่อนในบัตร</h4>${insts.map(i => instRow(i, dueMk)).join("")}` : ""}
    <h4 style="margin:18px 0 6px">จ่ายเต็ม vs ขั้นต่ำ vs กำหนดเอง</h4>
    <div class="f"><label>ทดลองจ่ายเดือนละ (บาท)</label><input type="number" min="0" step="100" value="${view.dxCustom || Math.max(Math.round(b.min * 2), 1000)}" data-dx-input="custom"></div>
    <div class="cmp3"><div><small>จ่ายเต็ม</small><b>${baht(sim.full.totalPaid)}</b><span>ดอกเบี้ย ${baht(0)}</span><span>${col(sim.full)}</span></div>
      <div><small>จ่ายขั้นต่ำ</small><b>${sim.min.never ? "—" : baht(sim.min.totalPaid)}</b><span>ดอกเบี้ย ${sim.min.never ? "ไม่จบ" : baht(sim.min.interest)}</span><span>${col(sim.min)}</span></div>
      <div class="hl"><small>กำหนดเอง</small><b>${sim.custom && !sim.custom.never ? baht(sim.custom.totalPaid) : "—"}</b><span>ดอกเบี้ย ${sim.custom && !sim.custom.never ? baht(sim.custom.interest) : "—"}</span><span>${col(sim.custom)}</span></div></div>
    ${sim.savedVsMin != null ? `<div class="warnbox" style="margin-top:10px;background:var(--mint);color:var(--olive-deep)">จ่ายเดือนละ ${baht(view.dxCustom || Math.max(Math.round(b.min * 2), 1000))} ประหยัดดอกเบี้ยกว่าจ่ายขั้นต่ำ ${baht(sim.savedVsMin)}</div>` : ""}
    <details class="assume"><summary>สมมติฐานที่ใช้คำนวณ</summary><ul>${sim.assumptions.map(a => `<li>${esc(a)}</li>`).join("")}</ul></details>
    ${dxHistory(id)}`);
}

/* ── 3. installments (card 0% + Shopee) ── */
function instRow(it, mk) {
  const i = D.instInfo(it, mk), acc = S.debts.find(x => x.id === it.debtId);
  return `<button class="instrow" data-act="dxInstForm" data-id="${it.id}"><span class="row" style="gap:10px;align-items:center">${art(acc && acc.type === "bnpl" ? "cart" : "card", 40)}<span style="flex:1;min-width:0;text-align:left"><b>${esc(it.name)}</b><small>${esc(acc ? acc.name : "")} · ${it.kind === "flat" ? `ดอก ${it.apr}% (คงที่)` : it.kind === "reducing" ? `ลดต้นลดดอก ${it.apr}%` : "0%"} · ${baht(i.monthly, i.monthly % 1 ? 2 : 0)}/ด.</small></span>
    <span class="v"><b>${i.done ? "ครบแล้ว" : baht(i.remaining)}</b><small>${i.done ? "" : `เหลือ ${i.left} งวด`}</small></span></span>
    <span class="dots">${Array.from({ length: Math.min(i.n, 36) }, (_, k) => `<i class="${k < i.billed ? "on" : ""}"></i>`).join("")}</span>
    <small class="muted">จ่ายแล้ว ${i.billed}/${i.n} งวด · หมด ${mLabel(i.endMonth)}</small></button>`;
}
function dxInst() {
  const mk = E.monthKey(today()), acc = S.debts.filter(d => (D.kindOf(d) === "revolving" || D.kindOf(d) === "bnpl") && d.status !== "closed");
  const groups = acc.map(a => ({ a, items: D.instsOf(S, a.id) })).filter(g => g.items.length || g.a.type === "bnpl");
  const all = groups.flatMap(g => g.items), live = all.filter(i => !D.instInfo(i, mk).done);
  return `<div class="metrics">${metric("cart", "รายการที่ยังผ่อน", live.length + " รายการ")}${metric("coin", "ผ่อนต่อเดือน", E.sum(live.map(i => D.instInfo(i, mk).monthly)))}${metric("receipt", "ยอดผ่อนคงเหลือ", E.sum(all.map(i => D.instInfo(i, mk).remaining)))}${metric("cal", "หมดก้อนสุดท้าย", live.length ? mLabel(live.map(i => D.instInfo(i, mk).endMonth).sort().pop()) : "—")}</div>
    <div class="row" style="gap:10px;margin-bottom:12px"><button class="btn primary" data-act="dxInstForm" data-id="">${art("plus", 24, "flat")} เพิ่มรายการผ่อน</button><button class="btn ghost" data-act="dxBnplForm" data-id="">${art("cart", 24, "flat")} เพิ่มบัญชี Shopee</button></div>
    ${groups.length ? groups.map(g => `<div class="sec-h"><h2>${esc(g.a.name)}</h2>${g.a.type === "bnpl" ? `<button data-act="dxBnplForm" data-id="${g.a.id}">แก้ไข</button>` : ""}</div><div class="stack">${g.items.map(i => instRow(i, mk)).join("") || `<div class="card empty">ยังไม่มีรายการผ่อนใน ${esc(g.a.name)}</div>`}</div>`).join("")
      : `<div class="card empty">${art("cart", 56)}<b>ยังไม่มีรายการผ่อน</b>เพิ่มบัตรหรือบัญชี Shopee ก่อน แล้วเพิ่มรายการผ่อน 0% / มีดอกเบี้ย</div>`}`;
}

/* ── 4. loans ── */
function dxLoans() {
  const td = today(), loans = S.debts.filter(d => (D.kindOf(d) === "loan" || D.kindOf(d) === "flat") && d.status !== "closed");
  const grp = t => loans.filter(d => t === "home" ? d.type === "home" : t === "car" ? d.type === "car" : d.type !== "home" && d.type !== "car");
  const card = d => { const p = D.loanProgress(S, d, td); return `<button class="card loanc" data-act="dxLoan" data-id="${d.id}">
      <span class="row" style="gap:12px">${art(typeArt[d.type] || "doc", 50)}<span style="flex:1;min-width:0;text-align:left"><b style="font-size:17px">${esc(d.name)}</b><small class="muted" style="display:block">${esc(lname(d.lender))} · ${ratePill(d, td)}</small></span>${ring(p.pct)}</span>
      <span class="kv" style="margin-top:12px"><span><small>เงินต้นคงเหลือ</small><b>${baht(p.balance)}</b></span><span><small>ค่างวด</small><b>${baht(d.method === "flat" ? D.flatInstallment(d).installment : d.monthlyPay)}</b></span><span><small>คาดว่าผ่อนหมด</small><b>${p.payoff ? mLabel(E.monthKey(p.payoff)) : "ไม่หมด"}</b></span><span><small>ดอกเบี้ยที่จะจ่ายอีก</small><b>${baht(p.projectedInterest)}</b></span></span></button>`; };
  return `<div class="row" style="gap:10px;margin-bottom:12px"><button class="btn primary" data-act="dxLoanForm" data-id="" data-type="home">${art("house", 24, "flat")} เพิ่มสินเชื่อบ้าน</button><button class="btn ghost" data-act="dxLoanForm" data-id="" data-type="personal">${art("people", 24, "flat")} สินเชื่ออื่น</button></div>
    ${[["home", "สินเชื่อบ้าน"], ["car", "สินเชื่อรถ"], ["other", "สินเชื่อส่วนบุคคล / อื่น ๆ"]].map(([t, l]) => grp(t).length ? `<div class="sec-h"><h2>${l}</h2></div><div class="stack">${grp(t).map(card).join("")}</div>` : "").join("")
      || `<div class="card empty">${art("house", 56)}<b>ยังไม่มีสินเชื่อ</b>เพิ่มสินเชื่อบ้าน ใส่ยอดคงเหลือ ค่างวด และอัตราดอกเบี้ย (คงที่ หรือ MRR ± ส่วนต่าง)</div>`}`;
}
function ring(p, s = 58) { const r = 24, C = 2 * Math.PI * r; return `<svg width="${s}" height="${s}" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="${r}" fill="none" stroke="#EEF2DE" stroke-width="8"/><circle cx="30" cy="30" r="${r}" fill="none" stroke="#78B536" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C * p} ${C}" transform="rotate(-90 30 30)"/><text x="30" y="35" text-anchor="middle" font-size="14" font-weight="800" fill="#2C3820" font-family="NST,sans-serif">${Math.round(p * 100)}%</text></svg>`; }
function sheetLoan(id) {
  const d = S.debts.find(x => x.id === id); if (!d) return; const td = today(), p = D.loanProgress(S, d, td), am = p.am;
  const bank = d.refBank || d.lender, refs = (S.refRates || []).filter(r => r.bank === bank).sort((a, b) => b.effective.localeCompare(a.effective));
  const tot = Math.max(1, p.paidPrincipal + p.balance + p.interestPaid + p.projectedInterest);
  const showN = view.dxAmAll ? am.rows.length : 18;
  openSheet(`<div class="grab"></div><div class="row" style="gap:12px">${art(typeArt[d.type] || "doc", 54)}<div style="flex:1"><h3 style="margin:0">${esc(d.name)}</h3><small class="muted">${esc(lname(d.lender))} · ${E.DEBT_TYPES[d.type] || ""} · ${ratePill(d, td)}</small></div>${ring(p.pct, 64)}</div>
    <div class="kv" style="margin-top:12px"><div><small>เงินต้นเริ่มต้น</small><b>${baht(p.principal)}</b></div><div><small>ชำระเงินต้นแล้ว</small><b>${baht(p.paidPrincipal)}</b></div><div><small>เงินต้นคงเหลือ</small><b>${baht(p.balance)}</b></div>
      <div><small>ดอกเบี้ยที่จ่ายแล้ว</small><b>${baht(p.interestPaid)}</b></div><div><small>ดอกเบี้ยประมาณการในอนาคต</small><b>${baht(p.projectedInterest)}</b></div><div><small>งวด จ่ายแล้ว / เหลือ</small><b>${p.paidCount} / ${isFinite(p.monthsLeft) ? p.monthsLeft : "∞"}</b></div></div>
    <div class="stackbar" style="margin-top:12px;height:20px"><i style="flex:${p.paidPrincipal / tot};background:#78B536"></i><i style="flex:${p.balance / tot};background:#CDE6A0"></i><i style="flex:${p.interestPaid / tot};background:#E0503F"></i><i style="flex:${p.projectedInterest / tot};background:#FFC9C0"></i></div>
    <div class="legend"><span><i style="background:#78B536"></i>เงินต้นจ่ายแล้ว</span><span><i style="background:#CDE6A0"></i>เงินต้นคงเหลือ</span><span><i style="background:#E0503F"></i>ดอกเบี้ยจ่ายแล้ว</span><span><i style="background:#FFC9C0"></i>ดอกเบี้ยในอนาคต</span></div>
    ${am.warnings.map(w => `<div class="warnbox" style="margin-top:10px;background:var(--rose);color:var(--rose-ink)">${esc(w)}</div>`).join("")}${am.notes.map(w => `<div class="warnbox" style="margin-top:10px">${esc(w)} — กดเพิ่มอัตราอ้างอิงด้านล่าง</div>`).join("")}
    <div class="acts" style="flex-wrap:wrap"><button class="btn primary" data-act="dxPay" data-id="${id}">${art("check", 26, "flat")} บันทึกจ่าย</button><button class="btn ghost" data-act="dxTabGo" data-k="prepay" data-loan="${id}">${art("target", 26, "flat")} ทดลองโปะ</button><button class="btn ghost" data-act="dxLoanForm" data-id="${id}">${art("edit", 26, "flat")} แก้ไข</button></div>
    <h4 style="margin:18px 0 6px">อัตราดอกเบี้ยตามสัญญา</h4>
    <div class="list">${(d.rates && d.rates.length ? d.rates : [{ from: d.startDate || "—", kind: "fixed", rate: d.apr }]).slice().sort((a, b) => a.from.localeCompare(b.from)).map(s => `<div class="li"><div class="t"><b>${s.kind === "float" ? `${s.ref} ${s.margin >= 0 ? "+" : "−"} ${Math.abs(s.margin)}%` : `${s.rate}% คงที่`}</b><small>ตั้งแต่ ${s.from}</small></div>${s.from <= td && (d.rates || []).filter(x => x.from <= td).pop() === s ? '<span class="tag g">ใช้อยู่</span>' : s.from > td ? '<span class="tag y">อนาคต</span>' : ""}</div>`).join("")}</div>
    ${(d.rates || []).some(s => s.kind === "float") ? `<h4 style="margin:18px 0 6px">ประวัติอัตราอ้างอิงของ ${esc(lname(bank))}</h4>
      <div class="list">${refs.map(r => `<div class="li"><div class="t"><b>${r.ref} ${r.rate}%</b><small>มีผล ${r.effective}${r.announced ? ` · ประกาศ ${r.announced}` : ""}${r.source ? ` · ที่มา: ${esc(r.source)}` : ""} · บันทึก ${new Date(r.createdAt).toLocaleDateString("th-TH")}</small></div>${r.confirmed === false ? `<button class="btn primary sm" data-act="dxRefOk" data-id="${r.id}">ยืนยันใช้</button>` : ""}</div>`).join("") || `<div class="empty">ยังไม่มีข้อมูล ต้องใส่ค่า MRR ปัจจุบันก่อนจึงคำนวณได้</div>`}</div>
      <button class="btn ghost sm" style="margin-top:8px" data-act="dxRefForm" data-bank="${esc(bank)}">+ ใส่อัตรา ${esc((d.rates.find(s => s.kind === "float") || {}).ref || "MRR")} ใหม่</button>
      <p class="sub" style="margin-top:6px">แอปไม่ได้ดึงอัตราจากธนาคารอัตโนมัติ — ดูประกาศบนเว็บธนาคารแล้วกรอกเอง ประวัติเดิมจะถูกเก็บไว้ทุกครั้ง</p>` : ""}
    <h4 style="margin:18px 0 6px">ตารางผ่อนชำระรายงวด</h4>
    <div class="tblwrap"><table class="tbl am"><thead><tr><th>งวด</th><th>ดอก%</th><th>เงินต้น</th><th>ดอกเบี้ย</th><th>ยอดชำระ</th><th>คงเหลือ</th></tr></thead><tbody>
      ${am.rows.slice(0, showN).map(r => `<tr><td>${r.n}<small>${dShort(r.date)}</small></td><td>${r.rate ?? "?"}</td><td>${fmt(r.principal + r.extra)}</td><td>${fmt(r.interest, 2)}</td><td>${fmt(r.pay + r.extra)}</td><td>${fmt(r.balance)}</td></tr>`).join("")}</tbody></table></div>
    ${am.rows.length > 18 ? `<button class="btn ghost sm wide" style="margin-top:8px" data-act="dxAmAll" data-id="${id}">${view.dxAmAll ? "ย่อ" : `ดูทั้งหมด ${am.rows.length} งวด`}</button>` : ""}
    <details class="assume"><summary>สมมติฐานที่ใช้คำนวณ</summary><ul>${am.assumptions.map(a => `<li>${esc(a)}</li>`).join("")}</ul></details>
    ${dxHistory(id)}`);
}

/* ── 5. strategy ── */
function dxPlan() {
  const td = today(), x = +S.debtPlanExtra || 0, r = D.compareAll(S, x, td), w = r.hybridWhy;
  if (!D.overview(S, td).count) return `<div class="card empty">${art("peak", 56)}<b>ยังไม่มีหนี้ให้วางแผน</b></div>`;
  const col = k => { const s = r[k]; return `<div class="${r.recommend === k ? "hl" : ""}"><small>${({ snowball: "Snowball · ก้อนเล็กก่อน", avalanche: "Avalanche · ดอกสูงก่อน", hybrid: "Hybrid · วิเคราะห์รวม" })[k]}</small>
    <b>${isFinite(s.months) ? `${s.months} เดือน` : "ไม่จบ"}</b><span>ดอกเบี้ย+ค่าธรรมเนียม ${baht(s.cost)}</span><span>ประหยัด ${s.saved != null ? baht(s.saved) : "—"}${s.monthsSaved ? ` · เร็วขึ้น ${s.monthsSaved} ด.` : ""}</span>
    <span>ปิดได้ก่อน: ${esc((s.order[0] || {}).name || "—")}</span>${r.recommend === k ? '<em>แนะนำ</em>' : ""}<button class="btn ${S.debtStrategy === k || (!S.debtStrategy && k === "hybrid") ? "primary" : "ghost"} sm" data-act="dxStrat" data-k="${k}">${S.debtStrategy === k || (!S.debtStrategy && k === "hybrid") ? "ใช้แผนนี้อยู่" : "ใช้แผนนี้"}</button></div>`; };
  const cur = r[S.debtStrategy || "hybrid"];
  const mins = E.sum(D.debtSchedule(S, E.monthKey(td), td).map(z => z.planned));
  return `<div class="card"><b>มีเงินเหลือโปะหนี้เพิ่มเดือนละเท่าไร?</b>
      <div class="qamt" style="margin-top:10px">${[0, 500, 1000, 2000, 3000, 5000].map(v => `<button class="qa ${x === v ? "on" : ""}" data-act="dxExtra" data-v="${v}">${v ? "+" + fmt(v) : "ไม่โปะ"}</button>`).join("")}</div>
      <div class="f" style="margin-top:10px"><label>หรือกำหนดเอง (บาท/เดือน)</label><input type="number" min="0" step="100" value="${x || ""}" data-dx-change="extra" placeholder="เช่น 1500"></div></div>
    <div class="card milo"><div class="row" style="gap:12px;align-items:flex-start">${miloSVG("map", { cls: "mini" })}<div style="flex:1">
      <b style="font-size:17px">${w ? `เริ่มโปะที่ “${esc(w.first.name)}” ก่อน` : "จ่ายตามงวดไปก่อน"}</b>
      ${w ? `<ul class="why">${w.reasons.map(t => `<li>${esc(t)}</li>`).join("")}${w.fee.map(t => `<li>${esc(t)}</li>`).join("")}${w.skipped.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      <div class="kv" style="margin-top:8px"><div><small>ต้องจ่ายรวมต่อเดือน</small><b>${baht(mins + x)}</b></div><div><small>หมดหนี้</small><b>${cur.debtFree ? mLabel(cur.debtFree) : "ไม่หมด"}</b></div><div><small>ประหยัดดอกเบี้ย</small><b>${cur.saved != null ? baht(cur.saved) : "—"}</b></div></div>
      <p class="sub" style="margin-top:6px">${esc(r.reason)}</p></div></div></div>
    <div class="cmp3 big">${["snowball", "avalanche", "hybrid"].map(col).join("")}</div>
    <div class="sec-h"><h2>ไทม์ไลน์ปิดหนี้</h2></div>
    <div class="card"><div class="tline">${cur.order.map((o2, i) => `<div class="tl-i"><span class="tl-d">${i + 1}</span><div><b>${esc(o2.name)}</b><small>ปิดได้ ${mLabel(o2.when)} (อีก ${o2.month} เดือน) · ดอกเบี้ยรวม ${baht(o2.interest)}</small></div></div>`).join("") || `<div class="empty">ด้วยยอดนี้ยังปิดหนี้ไม่หมด</div>`}
      ${cur.debtFree ? `<div class="tl-i end"><span class="tl-d">${art("trophy", 30, "flat")}</span><div><b>อิสระจากหนี้!</b><small>${mLabel(cur.debtFree)}</small></div></div>` : ""}</div></div>
    <details class="assume card"><summary>สมมติฐานที่ใช้คำนวณ</summary><ul><li>คิดดอกเบี้ยรายเดือน (อัตราต่อปี ÷ 12) จากอัตราปัจจุบันของแต่ละบัญชี</li><li>จ่ายขั้นต่ำ/ค่างวดทุกบัญชีก่อน แล้วนำเงินโปะไปลงบัญชีตามลำดับของแผน เมื่อปิดบัญชีใดเงินที่เคยจ่ายจะย้ายไปช่วยบัญชีถัดไป</li><li>รายการผ่อน 0% และ Shopee จ่ายตามงวด ไม่นำเงินโปะไปลง (โปะแล้วไม่ประหยัดดอกเบี้ย)</li><li>เช่าซื้อแบบ flat rate ผ่อนตามงวดเดิม</li><li>สินเชื่อที่มีค่าธรรมเนียมโปะ: นับค่าธรรมเนียมเป็นต้นทุนของแผน</li><li>ไม่มีการกู้หรือรูดเพิ่ม</li></ul></details>`;
}

/* ── 6. prepayment simulator (never touches real data) ── */
function dxPrepay() {
  const td = today(), loans = S.debts.filter(d => D.kindOf(d) === "loan" && d.status !== "closed" && +d.balance > 0);
  if (!loans.length) return `<div class="card empty">${art("target", 56)}<b>ยังไม่มีสินเชื่อให้ทดลองโปะ</b>เพิ่มสินเชื่อบ้านหรือสินเชื่อส่วนบุคคลก่อน</div>`;
  const d = loans.find(x => x.id === view.dxLoanSel) || loans[0]; view.dxLoanSel = d.id;
  const pl = view.dxPlan || { lump: 50000, monthly: 0, mode: (d.prepay && d.prepay.mode) || "term" };
  const r = D.prepaySim(S, d, pl, td);
  const n = (l, v, s) => `<div><small>${l}</small><b>${v}</b>${s ? `<small>${s}</small>` : ""}</div>`;
  return `<div class="warnbox" style="margin-bottom:12px">${art("target", 30)} ทดลองเท่านั้น — ไม่เปลี่ยนยอดหนี้จริง ถ้าโปะจริงให้กด “บันทึกจ่าย” แล้วเลือก “โปะเงินต้น”</div>
    <div class="tchips">${loans.map(x => `<button class="tchip" data-act="dxLoanSel" data-id="${x.id}" aria-pressed="${x.id === d.id}">${art(typeArt[x.type], 34)}<span>${esc(x.name)}</span></button>`).join("")}</div>
    <div class="card"><div class="sub">เงินต้นคงเหลือ ${baht(d.balance)} · ${ratePill(d, td)} · ค่างวด ${baht(d.monthlyPay)}</div>
      <label class="lbl" style="margin-top:12px">โปะก้อนเดียว</label><div class="qamt">${[0, 10000, 30000, 50000, 100000].map(v => `<button class="qa ${+pl.lump === v ? "on" : ""}" data-act="dxPP" data-k="lump" data-v="${v}">${v ? fmt(v) : "ไม่โปะ"}</button>`).join("")}</div>
      <div class="fgrid" style="margin-top:8px"><div class="f"><label>กำหนดเอง (บาท)</label><input type="number" min="0" step="1000" value="${pl.lump || ""}" data-dx-change="lump"></div><div class="f"><label>วันที่โปะ</label><input type="date" value="${pl.date || ""}" data-dx-change="date"></div></div>
      <label class="lbl" style="margin-top:12px">โปะเพิ่มทุกเดือน</label><div class="qamt">${[0, 500, 1000, 2000, 5000].map(v => `<button class="qa ${+pl.monthly === v ? "on" : ""}" data-act="dxPP" data-k="monthly" data-v="${v}">${v ? "+" + fmt(v) : "ไม่โปะ"}</button>`).join("")}</div>
      <label class="lbl" style="margin-top:12px">โปะแล้วให้</label><span class="seg"><button data-act="dxPP" data-k="mode" data-v="term" aria-pressed="${pl.mode !== "pay"}">ผ่อนหมดเร็วขึ้น</button><button data-act="dxPP" data-k="mode" data-v="pay" aria-pressed="${pl.mode === "pay"}">ค่างวดลดลง</button></span></div>
    ${r.blocked ? `<div class="warnbox" style="background:var(--rose);color:var(--rose-ink)">${esc(r.blocked)}</div>` : ""}
    <div class="kv resultkv">${n("1 · เงินต้นใหม่", baht(r.newPrincipal))}${n("2 · ดอกเบี้ยที่ประหยัด", baht(r.interestSaved), r.sim.totalFee ? `หักค่าธรรมเนียม ${baht(r.sim.totalFee)} แล้ว` : "")}${n("3 · งวดที่ลดลง", r.monthsSaved != null ? `${r.monthsSaved} งวด` : "—")}${n("4 · ผ่อนหมดเร็วขึ้น", r.monthsSaved != null ? `${Math.floor(r.monthsSaved / 12)} ปี ${r.monthsSaved % 12} เดือน` : "—")}
      ${n("5 · คาดว่าปลดหนี้", r.payoffAfter ? mLabel(E.monthKey(r.payoffAfter)) : "—", r.payoffBefore ? `เดิม ${mLabel(E.monthKey(r.payoffBefore))}` : "")}${n("6 · ดอกเบี้ยรวมก่อนโปะ", baht(r.interestBefore))}${n("7 · ดอกเบี้ยรวมหลังโปะ", baht(r.interestAfter))}${n("8 · เงินสดที่ต้องใช้", baht(r.cashNeeded), r.feeNow ? `รวมค่าธรรมเนียม ${baht(r.feeNow)}` : "")}
      ${pl.mode === "pay" && r.newPay ? n("ค่างวดใหม่", baht(r.newPay)) : ""}</div>
    <details class="assume card"><summary>สมมติฐานที่ใช้คำนวณ</summary><ul>${r.sim.assumptions.map(a => `<li>${esc(a)}</li>`).join("")}${d.prepay && d.prepay.note ? `<li>เงื่อนไขสัญญา: ${esc(d.prepay.note)}</li>` : ""}<li>ตรวจสอบเงื่อนไขการโปะกับธนาคารก่อนโอนเงินจริง</li></ul></details>`;
}

/* ── forms ── */
const lenderPick = (v, only) => `<div class="lpick">${Object.entries(LENDERS).filter(([k]) => !only || only.includes(k)).map(([k, [n, c]]) => `<label><input type="radio" name="lender" value="${k}" ${v === k ? "checked" : ""} hidden><span style="--lc:${c}"><i></i>${n}</span></label>`).join("")}</div>`;
function sheetCardForm(id) {
  const d = S.debts.find(x => x.id === id) || { type: "card", lender: "KBANK", statementDay: 5, dueDay: 25, minPct: "", minAmount: "", payPlan: "full", status: "active" };
  openSheet(`<form><div class="grab"></div><h3>${id ? "แก้ไขบัตร" : "เพิ่มบัตร"}</h3>
    <div class="f full"><label>ธนาคาร / ผู้ออกบัตร</label>${lenderPick(d.lender, ["KBANK", "SCB", "KTB", "BBL", "BAY", "KTC", "TTB", "UOB", "CARDX", "AEON", "GSB", "KKP", "OTHER"])}</div>
    <div class="fgrid"><div class="f"><label>ประเภท</label><select name="type">${opt({ card: "บัตรเครดิต", cash: "บัตรกดเงินสด" }, d.type)}</select></div>
      <div class="f"><label>ชื่อบัตร</label><input type="text" name="name" required maxlength="30" value="${esc(d.name || "")}" placeholder="เช่น K-Platinum"></div>
      <div class="f"><label>วงเงิน (บาท)</label><input type="number" name="limit" min="0" step="any" value="${d.limit || ""}"></div>
      <div class="f"><label>ดอกเบี้ยต่อปี (%)</label><input type="number" name="apr" min="0" max="40" step="any" required value="${d.apr ?? ""}" placeholder="ดูในใบแจ้งยอด"></div>
      <div class="f"><label>วันตัดรอบบัญชี</label><input type="number" name="statementDay" min="1" max="31" required value="${d.statementDay}"></div>
      <div class="f"><label>วันครบกำหนดชำระ</label><input type="number" name="dueDay" min="1" max="31" required value="${d.dueDay}"></div>
      <div class="f"><label>ยอดค้างที่เรียกเก็บแล้ว (บาท)</label><input type="number" name="balance" min="0" step="any" value="${d.balance ?? ""}" placeholder="ยอดใน statement ล่าสุดที่ยังไม่จ่าย"></div>
      <div class="f"><label>ยอดใช้ที่ยังไม่เรียกเก็บ (บาท)</label><input type="number" name="unbilled" min="0" step="any" value="${d.unbilled || ""}"></div>
      <div class="f"><label>ขั้นต่ำ (% ของยอด)</label><input type="number" name="minPct" min="0" max="100" step="any" value="${d.minPct ?? ""}" placeholder="ตามเงื่อนไขบัตร"></div>
      <div class="f"><label>ขั้นต่ำอย่างน้อย (บาท)</label><input type="number" name="minAmount" min="0" step="any" value="${d.minAmount ?? ""}"></div></div>
    <label class="chk"><input type="checkbox" name="minKnown" ${d.minKnown ? "checked" : ""}> เงื่อนไขขั้นต่ำนี้ตรงกับใบแจ้งยอด/สัญญาจริง</label>
    <div class="f full"><label>ปกติจ่ายแบบไหน</label><span class="seg">${[["full", "เต็มจำนวน"], ["min", "ขั้นต่ำ"], ["custom", "กำหนดเอง"]].map(([k, l]) => `<label><input type="radio" name="payPlan" value="${k}" ${d.payPlan === k ? "checked" : ""} hidden><span>${l}</span></label>`).join("")}</span></div>
    <div class="f"><label>ถ้ากำหนดเอง: จ่ายเดือนละ</label><input type="number" name="payCustom" min="0" step="any" value="${d.payCustom || ""}"></div>
    <div class="f"><label>สถานะบัตร</label><select name="status">${opt({ active: "ใช้งาน", locked: "ล็อก/ระงับชั่วคราว", closed: "ปิดบัตรแล้ว" }, d.status)}</select></div>
    <p class="sub">ไม่ต้องใส่เลขบัตร / CVV — แอปไม่เก็บข้อมูลลับของบัตร</p>
    <div class="acts">${id ? `<button type="button" class="btn danger" data-act="debtDel" data-id="${id}">ลบ</button>` : ""}<button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
    const v = formData(f); if (!v.name.trim()) return toast("ใส่ชื่อบัตร");
    const rec = Object.assign(S.debts.find(x => x.id === id) || { id: E.uid(), createdAt: Date.now(), method: "card" }, {
      type: v.type, lender: v.lender || "OTHER", name: v.name.trim(), limit: num(v.limit), apr: num(v.apr), statementDay: clampN(v.statementDay), dueDay: clampN(v.dueDay),
      balance: num(v.balance), principal: num(v.balance), unbilled: num(v.unbilled), minPct: num(v.minPct), minAmount: num(v.minAmount), minKnown: !!v.minKnown,
      payPlan: v.payPlan || "full", payCustom: num(v.payCustom), status: v.status, closedAt: v.status === "closed" ? today() : null });
    if (!id) S.debts.push(rec); audit("debt", `${id ? "แก้" : "เพิ่ม"}บัตร ${rec.name}`); closeSheet(); view.debt = "cards"; commit(); toast("บันทึกบัตรแล้ว");
  });
}
const clampN = v => Math.min(31, Math.max(1, Math.round(num(v)) || 1));
function sheetBnplForm(id) {
  const d = S.debts.find(x => x.id === id) || { type: "bnpl", lender: "SHOPEE", name: "SPayLater", dueDay: 10, status: "active" };
  openSheet(`<form><div class="grab"></div><h3>${id ? "แก้ไข" : "เพิ่ม"}บัญชีผ่อนรายเดือน</h3>
    <div class="f full"><label>ผู้ให้บริการ</label>${lenderPick(d.lender, ["SHOPEE", "LAZADA", "OTHER"])}</div>
    <div class="fgrid"><div class="f"><label>ชื่อบัญชี</label><input type="text" name="name" required maxlength="30" value="${esc(d.name)}"></div>
      <div class="f"><label>วันครบกำหนดชำระทุกเดือน</label><input type="number" name="dueDay" min="1" max="31" required value="${d.dueDay}"></div>
      <div class="f"><label>วงเงิน (ไม่บังคับ)</label><input type="number" name="limit" min="0" step="any" value="${d.limit || ""}"></div></div>
    <p class="sub">ยอดที่ต้องจ่ายแต่ละเดือนคำนวณจากรายการผ่อนที่เพิ่มในบัญชีนี้</p>
    <div class="acts">${id ? `<button type="button" class="btn danger" data-act="debtDel" data-id="${id}">ลบ</button>` : ""}<button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
    const v = formData(f);
    const rec = Object.assign(S.debts.find(x => x.id === id) || { id: E.uid(), createdAt: Date.now(), type: "bnpl", method: "bnpl", balance: 0, apr: 0 }, { lender: v.lender || "SHOPEE", name: v.name.trim() || "SPayLater", dueDay: clampN(v.dueDay), limit: num(v.limit), status: "active" });
    if (!id) S.debts.push(rec); audit("debt", `${id ? "แก้" : "เพิ่ม"}บัญชีผ่อน ${rec.name}`); closeSheet(); view.debt = "inst"; commit();
  });
}
function sheetInstForm(id, debtId) {
  dsS(); const it = S.installments.find(x => x.id === id), accs = S.debts.filter(d => (D.kindOf(d) === "revolving" || D.kindOf(d) === "bnpl") && d.status !== "closed");
  if (!accs.length) { toast("เพิ่มบัตรหรือบัญชี Shopee ก่อน"); return sheetBnplForm(""); }
  const mk = E.monthKey(today()), i = it ? D.instInfo(it, mk) : null;
  const x = it || { debtId: debtId || accs[0].id, kind: "zero", n: 10, down: 0 };
  openSheet(`<form><div class="grab"></div><h3>${id ? "แก้ไขรายการผ่อน" : "เพิ่มรายการผ่อน"}</h3>
    <div class="fgrid"><div class="f full"><label>ผ่อนผ่าน</label><select name="debtId">${accs.map(a => `<option value="${a.id}" ${x.debtId === a.id ? "selected" : ""}>${esc(a.name)} (${esc(lname(a.lender))})</option>`).join("")}</select></div>
      <div class="f full"><label>สินค้า / รายการ</label><input type="text" name="name" required maxlength="40" value="${esc(x.name || "")}" placeholder="เช่น โทรศัพท์"></div>
      <div class="f"><label>ราคาซื้อ (บาท)</label><input type="number" name="price" min="1" step="any" required value="${x.price || ""}"></div>
      <div class="f"><label>เงินดาวน์</label><input type="number" name="down" min="0" step="any" value="${x.down || ""}"></div>
      <div class="f"><label>จำนวนงวดทั้งหมด</label><input type="number" name="n" min="1" max="120" required value="${x.n}"></div>
      <div class="f"><label>จ่ายไปแล้วกี่งวด</label><input type="number" name="paid" min="0" max="120" value="${i ? i.billed : 0}"></div>
      <div class="f full"><label>ดอกเบี้ย</label><span class="seg">${[["zero", "ผ่อน 0%"], ["flat", "ดอกคงที่"], ["reducing", "ลดต้นลดดอก"]].map(([k, l]) => `<label><input type="radio" name="kind" value="${k}" ${x.kind === k ? "checked" : ""} hidden><span>${l}</span></label>`).join("")}</span></div>
      <div class="f"><label>ดอกเบี้ยต่อปี (%)</label><input type="number" name="apr" min="0" step="any" value="${x.apr || ""}" placeholder="ผ่อน 0% เว้นว่าง"></div>
      <div class="f"><label>ยอดผ่อน/เดือน (ถ้ารู้)</label><input type="number" name="monthly" min="0" step="any" value="${x.monthly || ""}" placeholder="เว้นว่าง = คำนวณให้"></div></div>
    <p class="sub">“จ่ายไปแล้ว” นับรวมงวดที่อยู่ใน statement เดือนนี้แล้ว · ยอดผ่อนในบัตรนับรวมในยอดบัตร ไม่หักซ้ำ</p>
    <div class="acts">${id ? `<button type="button" class="btn danger" data-act="dxInstDel" data-id="${id}">ลบ</button>` : ""}<button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
    const v = formData(f), n = Math.max(1, Math.round(num(v.n))), paid = Math.min(n, Math.max(0, Math.round(num(v.paid))));
    if (!v.name.trim() || num(v.price) <= 0) return toast("ใส่ชื่อและราคา");
    const rec = Object.assign(it || { id: E.uid(), createdAt: Date.now() }, { debtId: v.debtId, name: v.name.trim(), price: num(v.price), down: num(v.down), n, kind: v.kind || "zero", apr: num(v.apr), monthly: num(v.monthly) || 0,
      firstMonth: E.addMonths(mk, -(paid - 1)) });
    if (!paid) rec.firstMonth = E.addMonths(mk, 1);
    if (!it) S.installments.push(rec); audit("debt", `${it ? "แก้" : "เพิ่ม"}รายการผ่อน ${rec.name} ${n} งวด`); closeSheet(); commit(); toast("บันทึกรายการผ่อนแล้ว");
  });
}
function sheetLoanForm(id, type) {
  const d = S.debts.find(x => x.id === id) || { type: type || "home", lender: "GHB", method: "reducing", dueDay: 1, dayCount: "act365", rates: [{ from: today(), kind: "float", ref: "MRR", margin: -2 }], prepay: { allowed: true, mode: "term", feePct: 0 } };
  const rs = (d.rates && d.rates.length ? d.rates : [{ from: d.startDate || today(), kind: "fixed", rate: d.apr || 0 }]).slice().sort((a, b) => a.from.localeCompare(b.from));
  while (rs.length < 4) rs.push({ from: "", kind: "fixed", rate: "" });
  openSheet(`<form><div class="grab"></div><h3>${id ? "แก้ไขสินเชื่อ" : "เพิ่มสินเชื่อ"}</h3>
    <div class="f full"><label>ธนาคาร / สถาบัน</label>${lenderPick(d.lender, ["GHB", "GSB", "KBANK", "SCB", "KTB", "BBL", "BAY", "TTB", "UOB", "BAAC", "LHB", "KKP", "TISCO", "OTHER"])}</div>
    <div class="fgrid"><div class="f"><label>ประเภท</label><select name="type">${opt({ home: "สินเชื่อบ้าน", personal: "สินเชื่อส่วนบุคคล", car: "สินเชื่อรถ", other: "สินเชื่ออื่น ๆ" }, d.type)}</select></div>
      <div class="f"><label>วิธีคิดดอกเบี้ย</label><select name="method">${opt({ reducing: "ลดต้นลดดอก", flat: "Flat rate (เช่าซื้อ)" }, d.method)}</select></div>
      <div class="f full"><label>ชื่อสินเชื่อ</label><input type="text" name="name" required maxlength="40" value="${esc(d.name || "")}" placeholder="เช่น บ้านชลบุรี"></div>
      <div class="f"><label>ยอดเงินกู้เริ่มต้น</label><input type="number" name="principal" min="0" step="any" required value="${d.principal || ""}"></div>
      <div class="f"><label>เงินต้นคงเหลือตอนนี้</label><input type="number" name="balance" min="0" step="any" required value="${d.balance ?? ""}"></div>
      <div class="f"><label>ค่างวดต่อเดือน</label><input type="number" name="monthlyPay" min="0" step="any" value="${d.monthlyPay || ""}"></div>
      <div class="f"><label>วันที่ชำระทุกเดือน</label><input type="number" name="dueDay" min="1" max="31" required value="${d.dueDay}"></div>
      <div class="f"><label>วันเริ่มสัญญา</label><input type="date" name="startDate" value="${d.startDate || ""}"></div>
      <div class="f"><label>จำนวนงวดทั้งหมด</label><input type="number" name="termMonths" min="1" step="1" value="${d.termMonths || ""}"></div>
      <div class="f"><label>จ่ายไปแล้วกี่งวด (ก่อนใช้แอป)</label><input type="number" name="paidBefore" min="0" step="1" value="${d.paidBefore || ""}"></div>
      <div class="f"><label>ดอกเบี้ยที่จ่ายไปแล้ว (ถ้ารู้)</label><input type="number" name="interestPaidBefore" min="0" step="any" value="${d.interestPaidBefore || ""}"></div></div>
    <h4 style="margin:14px 0 4px">อัตราดอกเบี้ย (ใส่ได้หลายช่วง เช่น ปีที่ 1–3 คงที่ แล้วลอยตัว)</h4>
    <div class="rsteps">${rs.map((s, k) => `<div class="rstep"><input type="date" name="rf${k}" value="${s.from || ""}" aria-label="ตั้งแต่วันที่">
      <select name="rk${k}">${opt({ fixed: "คงที่ %", MRR: "MRR ±", MLR: "MLR ±", MOR: "MOR ±" }, s.kind === "float" ? s.ref : "fixed")}</select>
      <input type="number" step="any" name="rv${k}" value="${s.kind === "float" ? s.margin : s.rate ?? ""}" placeholder="% หรือ ส่วนต่าง เช่น -2"></div>`).join("")}</div>
    <p class="sub">ช่องแรกคืออัตราตั้งแต่เริ่ม · ลอยตัวใส่ส่วนต่าง เช่น MRR −2.00 ให้พิมพ์ -2</p>
    <div class="fgrid"><div class="f"><label>ฐานวันคิดดอกเบี้ย</label><select name="dayCount">${opt({ act365: "วันจริง / 365", actact: "วันจริง / 365-366", "30360": "30 / 360" }, d.dayCount || "act365")}</select></div>
      <div class="f"><label>โปะได้ไหม</label><select name="pAllowed">${opt({ yes: "โปะได้", no: "ไม่ได้ / ต้องติดต่อธนาคาร" }, d.prepay && d.prepay.allowed === false ? "no" : "yes")}</select></div>
      <div class="f"><label>โปะแล้วธนาคารให้</label><select name="pMode">${opt({ term: "ลดระยะเวลา", pay: "ลดค่างวด" }, (d.prepay || {}).mode || "term")}</select></div>
      <div class="f"><label>ค่าธรรมเนียมโปะ (%)</label><input type="number" name="pFee" min="0" step="any" value="${(d.prepay || {}).feePct || ""}" placeholder="เช่น 3"></div>
      <div class="f"><label>เสียค่าธรรมเนียมถึงวันที่</label><input type="date" name="pUntil" value="${(d.prepay || {}).feeUntil || ""}"></div>
      <div class="f full"><label>เงื่อนไขอื่น ๆ</label><input type="text" name="pNote" maxlength="120" value="${esc((d.prepay || {}).note || "")}" placeholder="เช่น ปิดบัญชีภายใน 3 ปีเสีย 3%"></div></div>
    <div class="acts">${id ? `<button type="button" class="btn danger" data-act="debtDel" data-id="${id}">ลบ</button>` : ""}<button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
    const v = formData(f); if (!v.name.trim()) return toast("ใส่ชื่อสินเชื่อ");
    const rates = []; for (let k = 0; k < 4; k++) { const from = v["rf" + k] || (k === 0 ? (v.startDate || "2000-01-01") : ""), kind = v["rk" + k], val = v["rv" + k]; if (!from || val === "") continue;
      rates.push(kind === "fixed" ? { from, kind: "fixed", rate: num(val) } : { from, kind: "float", ref: kind, margin: num(val) }); }
    if (!rates.length) return toast("ใส่อัตราดอกเบี้ยอย่างน้อย 1 ช่วง");
    const rec = Object.assign(S.debts.find(x => x.id === id) || { id: E.uid(), createdAt: Date.now() }, {
      type: v.type, method: v.method, lender: v.lender || "OTHER", refBank: v.lender || "OTHER", name: v.name.trim(), principal: num(v.principal), balance: num(v.balance), monthlyPay: num(v.monthlyPay),
      dueDay: clampN(v.dueDay), startDate: v.startDate, termMonths: num(v.termMonths), paidBefore: num(v.paidBefore), interestPaidBefore: num(v.interestPaidBefore), dayCount: v.dayCount, rates,
      apr: rates[0].kind === "fixed" ? rates[0].rate : 0, prepay: { allowed: v.pAllowed !== "no", mode: v.pMode, feePct: num(v.pFee), feeUntil: v.pUntil || "", note: v.pNote.trim() }, status: "active" });
    if (rec.method === "flat") { rec.apr = rates[0].rate || 0; if (!rec.termMonths) return toast("เช่าซื้อ flat ต้องใส่จำนวนงวด"); }
    else if (!rec.monthlyPay) return toast("ใส่ค่างวดต่อเดือน");
    if (!id) S.debts.push(rec); audit("debt", `${id ? "แก้" : "เพิ่ม"}สินเชื่อ ${rec.name} คงเหลือ ${baht(rec.balance)}`); closeSheet(); view.debt = "loans"; commit(); toast("บันทึกสินเชื่อแล้ว");
    if (rates.some(r => r.kind === "float") && !D.refRateAt(S, rec.refBank, rates.find(r => r.kind === "float").ref, today())) setTimeout(() => sheetRefForm(rec.refBank, rates.find(r => r.kind === "float").ref), 400);
  });
}
function sheetRefForm(bank, ref = "MRR") {
  openSheet(`<form><div class="grab"></div><h3>ใส่อัตรา ${ref} ของ ${esc(lname(bank))}</h3><p class="sub">ดูจากประกาศอัตราดอกเบี้ยบนเว็บไซต์ธนาคาร แล้วกรอกตามจริง — ประวัติเดิมจะไม่ถูกเขียนทับ</p>
    <div class="fgrid" style="margin-top:10px"><div class="f"><label>ประเภทอัตราอ้างอิง</label><select name="ref">${opt({ MRR: "MRR", MLR: "MLR", MOR: "MOR" }, ref)}</select></div>
      <div class="f"><label>อัตราใหม่ (% ต่อปี)</label><input type="number" name="rate" min="0" max="30" step="0.001" required></div>
      <div class="f"><label>วันที่มีผล</label><input type="date" name="effective" required value="${today()}"></div>
      <div class="f"><label>วันที่ประกาศ</label><input type="date" name="announced"></div>
      <div class="f full"><label>แหล่งที่มา</label><input type="text" name="source" maxlength="120" placeholder="เช่น เว็บไซต์ธนาคาร ประกาศอัตราดอกเบี้ยเงินให้สินเชื่อ"></div></div>
    <div class="acts"><button type="button" class="btn ghost" data-act="closeSheet">ยกเลิก</button><button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
    const v = formData(f); if (v.rate === "") return toast("ใส่อัตรา");
    const prev = D.refRateAt(S, bank, v.ref, v.effective);
    S.refRates.push({ id: E.uid(), bank, ref: v.ref, rate: num(v.rate), old: prev ? prev.rate : null, effective: v.effective, announced: v.announced || "", source: v.source.trim(), createdAt: Date.now(), confirmed: true });
    audit("rate", `${lname(bank)} ${v.ref} ${prev ? prev.rate + "% → " : ""}${num(v.rate)}% มีผล ${v.effective}`); closeSheet(); commit(); toast("บันทึกอัตราใหม่แล้ว คำนวณตารางผ่อนใหม่ให้แล้ว");
  });
}
function sheetStmt(id) {
  const d = S.debts.find(x => x.id === id); if (!d) return; const td = today(); let mk = E.monthKey(td); let c = D.cycleFor(d, mk); if (c.stDate > td) c = D.cycleFor(d, E.addMonths(mk, -1));
  const stDate = c.stDate;
  openSheet(`<form><div class="grab"></div><h3>ใส่ statement · ${esc(d.name)}</h3><p class="sub">ดูจากใบแจ้งยอดล่าสุด ยอดนี้จะกลายเป็น “ยอดที่ต้องจ่ายรอบนี้” แทนค่าประมาณ (ใส่ซ้ำเดือนเดิม = แทนที่ แต่เก็บประวัติไว้)</p>
    <div class="fgrid" style="margin-top:10px"><div class="f"><label>วันที่ตัดรอบ</label><input type="date" name="stDate" required value="${stDate}"></div>
      <div class="f"><label>ยอดที่ต้องชำระทั้งหมด</label><input type="number" name="amount" min="0" step="any" required id="amtIn"></div>
      <div class="f"><label>ยอดชำระขั้นต่ำ</label><input type="number" name="min" min="0" step="any"></div>
      <div class="f"><label>ยอดใช้จ่ายใหม่ในรอบ (ไม่บังคับ)</label><input type="number" name="newSpend" min="0" step="any" placeholder="ไว้คาดการณ์เดือนหน้า"></div></div>
    <div class="acts"><button type="button" class="btn ghost" data-act="closeSheet">ยกเลิก</button><button class="btn primary" type="submit">บันทึก statement</button></div></form>`, f => {
    const v = formData(f); D.recordStatement(S, id, { stDate: v.stDate, amount: num(v.amount), min: v.min === "" ? null : num(v.min), newSpend: v.newSpend === "" ? null : num(v.newSpend) });
    audit("stmt", `statement ${d.name} ${v.stDate} ${baht(num(v.amount))}`); closeSheet(); commit(); toast("บันทึก statement แล้ว");
  });
}
/* payment: quick chips, preview, duplicate guard, confirmation */
function sheetPay(id) {
  const d = S.debts.find(x => x.id === id); if (!d) return; const td = today(), k = D.kindOf(d);
  const row = D.debtSchedule(S, E.monthKey(td), td).find(r => r.debt.id === id) || D.debtSchedule(S, E.addMonths(E.monthKey(td), 1), td).find(r => r.debt.id === id);
  const b = row && row.bill, chips = k === "revolving" && b ? [["เต็มจำนวน", b.amount - b.paid], ["ขั้นต่ำ", Math.max(0, b.min - b.paid)]] : k === "bnpl" && b ? [["งวดนี้", b.left]] : [["งวดปกติ", row ? row.planned : d.monthlyPay]];
  const def = Math.max(0, Math.round((chips[0][1] || 0) * 100) / 100);
  const draw = () => { const f = $("#sheetBody form"), v = formData(f), pv = D.previewPayment(S, d, num(v.amount), v.date || td, v.kind || "regular");
    return `<div class="kv" style="margin-top:12px">${pv.interest ? `<div><small>เป็นดอกเบี้ย (${pv.days} วัน)</small><b>${baht(pv.interest, 2)}</b></div>` : ""}<div><small>ลดยอดหนี้</small><b>${baht(pv.principal, 2)}</b></div><div><small>คงเหลือหลังจ่าย</small><b>${baht(pv.after, 2)}</b></div>${pv.fee ? `<div><small>ค่าธรรมเนียมโปะ</small><b>${baht(pv.fee)}</b></div>` : ""}</div>
      ${pv.warn ? `<div class="warnbox" style="margin-top:8px;background:var(--rose);color:var(--rose-ink)">${esc(pv.warn)}</div>` : ""}${pv.note ? `<p class="sub" style="margin-top:6px">${esc(pv.note)}</p>` : ""}`; };
  openSheet(`<form><div class="grab"></div><h3>บันทึกจ่าย · ${esc(d.name)}</h3><div class="sub">${b ? `ครบ ${dShort(b.due)} · ต้องจ่าย ${baht(b.plan)} · จ่ายแล้ว ${baht(b.paid)}` : `คงเหลือ ${baht(d.balance)}`}</div>
    <div class="qamt" style="margin-top:10px">${chips.map(([l, v]) => `<button type="button" class="qa" data-dx-set="${Math.max(0, Math.round(v * 100) / 100)}">${l} ${fmt(Math.max(0, v))}</button>`).join("")}</div>
    <div class="fgrid" style="margin-top:10px"><div class="f"><label>จำนวนเงิน</label><input type="number" name="amount" id="amtIn" min="1" step="any" required value="${def}" data-act-input="payPv"></div><div class="f"><label>วันที่จ่าย</label><input type="date" name="date" required value="${td}" data-act-input="payPv"></div>
    ${k === "loan" ? `<div class="f full"><label>ประเภท</label><span class="seg"><label><input type="radio" name="kind" value="regular" checked hidden data-act-input="payPv"><span>ค่างวดปกติ</span></label><label><input type="radio" name="kind" value="extra" hidden data-act-input="payPv"><span>โปะเงินต้น</span></label></span></div>` : ""}</div>
    <div id="pv"></div>
    <div class="warnbox" style="margin-top:12px">ยอดหนี้เปลี่ยนเมื่อกด “ยืนยันการจ่าย” เท่านั้น · แอปไม่ได้ตัดเงินจริงจากบัญชี</div>
    <div class="acts"><button type="button" class="btn ghost" data-act="closeSheet">ยกเลิก</button><button class="btn primary" type="submit">ยืนยันการจ่าย</button></div></form>`, f => {
    const v = formData(f), amt = num(v.amount); if (amt <= 0) return toast("ใส่จำนวนเงิน");
    if (D.isDuplicate(S, id, v.date, amt) && !f.dataset.dupOk) { f.dataset.dupOk = 1; return toast("มีรายการเดียวกันเพิ่งบันทึกไป กดยืนยันอีกครั้งถ้าตั้งใจจ่ายซ้ำ"); }
    const pv = D.previewPayment(S, d, amt, v.date, v.kind || "regular"); D.applyPayment(S, id, pv);
    audit("pay", `จ่าย ${d.name} ${baht(amt)}${pv.kind === "extra" ? " (โปะ)" : ""} ต้น ${baht(pv.principal)} ดอก ${baht(pv.interest, 2)}`);
    closeSheet(); commit(); const closed = pv.after <= 0 && k !== "revolving" && k !== "bnpl";
    toast(closed ? "ปิดหนี้บัญชีนี้แล้ว!" : "บันทึกการจ่ายแล้ว"); if (closed || (k === "revolving" && pv.after <= 0)) confetti();
  });
  sheetPay.redraw = () => { $("#pv").innerHTML = draw(); }; sheetPay.redraw();
}
function sheetDebt(id) { const d = S.debts.find(x => x.id === id); const k = d ? D.kindOf(d) : null;
  return !d ? sheetCardForm("") : k === "revolving" ? sheetCardForm(id) : k === "bnpl" ? sheetBnplForm(id) : sheetLoanForm(id); }
function pickDebt(title, filter, then) {
  const list = S.debts.filter(d => d.status !== "closed" && filter(d)); if (!list.length) return toast("ยังไม่มีบัญชีหนี้");
  openSheet(`<div class="grab"></div><h3>${title}</h3><div class="stack" style="margin-top:10px">${list.map(d => `<button class="card li" data-act="${then}" data-id="${d.id}" style="display:flex;gap:12px;align-items:center;text-align:left">${art(typeArt[d.type] || "doc", 40)}<span style="flex:1"><b>${esc(d.name)}</b><small class="muted" style="display:block">${esc(lname(d.lender))}</small></span></button>`).join("")}</div>`);
}

/* ── events (only dx* acts; the main handler ignores them) ── */
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act^=dx],[data-dx-set]"); if (!el) return;
  if (el.dataset.dxSet != null) { const i = $("#amtIn"); if (i) { i.value = el.dataset.dxSet; sheetPay.redraw && sheetPay.redraw(); } return; }
  const d = el.dataset, a = d.act; e.preventDefault();
  const H = {
    dxTab: () => { view.debt = d.k; render(); }, dxTabGo: () => { closeSheet(); view.money = "debt"; view.debt = d.k; if (d.loan) view.dxLoanSel = d.loan; render(); },
    dxFc: () => { view.dxFc = +d.n; render(); }, dxCard: () => sheetCard(d.id), dxLoan: () => { view.dxAmAll = false; sheetLoan(d.id); },
    dxCardForm: () => sheetCardForm(d.id), dxBnplForm: () => sheetBnplForm(d.id), dxLoanForm: () => sheetLoanForm(d.id, d.type), dxInstForm: () => sheetInstForm(d.id, d.debt),
    dxPay: () => sheetPay(d.id), dxStmt: () => sheetStmt(d.id), dxRefForm: () => sheetRefForm(d.bank),
    dxPayPick: () => pickDebt("บันทึกจ่ายบัญชีไหน?", () => true, "dxPay"), dxStmtPick: () => pickDebt("ใส่ statement บัตรไหน?", x => D.kindOf(x) === "revolving", "dxStmt"),
    dxUnbilled: () => { const x = S.debts.find(y => y.id === d.id);
      openSheet(`<form><div class="grab"></div><h3>ยอดใช้ที่ยังไม่เรียกเก็บ · ${esc(x.name)}</h3><p class="sub">ยอดที่รูดหลังวันตัดรอบล่าสุด ดูได้ในแอปธนาคาร ใช้คาดการณ์บิลรอบหน้า</p>
        <div class="f" style="margin-top:10px"><label>ยอด (บาท)</label><input type="number" name="v" min="0" step="any" value="${x.unbilled || 0}" id="amtIn"></div>
        <div class="acts"><button class="btn primary" type="submit">บันทึก</button></div></form>`, f => { x.unbilled = Math.max(0, num(formData(f).v)); audit("debt", `${x.name} ยอดยังไม่เรียกเก็บ ${baht(x.unbilled)}`); commit({ render: false }); render(); sheetCard(x.id); }); },
    dxAmAll: () => { view.dxAmAll = !view.dxAmAll; sheetLoan(d.id); },
    dxPayDel: () => { if (!el.dataset.ok) { el.dataset.ok = 1; el.classList.add("arm"); toast("กดอีกครั้งเพื่อลบ ยอดหนี้จะย้อนกลับ (ประวัติยังเก็บไว้)"); return; } const p = D.deletePayment(S, d.id); if (p) audit("pay", `ลบรายการจ่าย ${baht(p.amount)} วันที่ ${p.date}`); commit(); },
    dxInstDel: () => { if (!el.dataset.ok) { el.dataset.ok = 1; el.textContent = "กดอีกครั้งเพื่อลบ"; return; } const it = S.installments.find(x => x.id === d.id); it.deletedAt = Date.now(); audit("debt", `ลบรายการผ่อน ${it.name}`); closeSheet(); commit(); },
    dxRefOk: () => { const r = S.refRates.find(x => x.id === d.id); r.confirmed = true; audit("rate", `ยืนยันใช้ ${r.ref} ${r.rate}%`); commit(); },
    dxStrat: () => { S.debtStrategy = d.k; audit("debt", `เลือกแผนปลดหนี้ ${d.k}`); commit(); },
    dxExtra: () => { S.debtPlanExtra = +d.v; commit(); },
    dxLoanSel: () => { view.dxLoanSel = d.id; view.dxPlan = null; render(); },
    dxPP: () => { const pl = view.dxPlan || { lump: 50000, monthly: 0, mode: "term" }; pl[d.k] = d.k === "mode" ? d.v : +d.v; view.dxPlan = pl; render(); }
  };
  if (H[a]) H[a]();
});
document.addEventListener("change", e => {
  const el = e.target, k = el.dataset.dxChange; if (k == null) return;
  if (k === "extra") { S.debtPlanExtra = Math.max(0, num(el.value)); commit(); return; }
  const pl = view.dxPlan || { lump: 50000, monthly: 0, mode: "term" }; pl[k] = k === "date" ? el.value : Math.max(0, num(el.value)); view.dxPlan = pl; render();
});
document.addEventListener("input", e => { const el = e.target; if (el.dataset.dxInput === "custom") { view.dxCustom = Math.max(0, num(el.value)); clearTimeout(view._dxT); view._dxT = setTimeout(() => { const id = $("#sheetBody .ccard") && $("#sheetBody .ccard").dataset.id; if (id) { const sc = $("#sheet").scrollTop; sheetCard(id); $("#sheet").scrollTop = sc; } }, 600); } });
