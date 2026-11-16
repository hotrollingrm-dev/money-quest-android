/* MONEY QUEST — app layer (part 2: Money, Planner, Profile, forms, events) */

/* ───────── charts ───────── */
function pillBars(items) {
  const mx = Math.max(1, ...items.map(x => Math.abs(x.v)));
  return `<div class="pills">${items.map(x => { const h = x.v ? Math.max(22, Math.abs(x.v) / mx * 100) : 0;
    return `<div class="pill-col"><div class="trk">${h ? `<div class="fill ${x.light ? "lt" : ""}" style="height:${h}%;background:${x.c}">${x.label != null ? x.label : ""}</div>` : ""}</div><small>${x.name}</small></div>`; }).join("")}</div>`;
}
function donut(parts, size = 150) {
  const tot = E.sum(parts.map(p => p.v)); if (!tot) return "";
  let a = -Math.PI / 2; const r = 58, c = 75, sw = 22;
  const segs = parts.filter(p => p.v > 0).map(p => { const f = p.v / tot, a2 = a + f * Math.PI * 2, large = f > .5 ? 1 : 0;
    const d = f >= .999 ? `M${c} ${c - r} A${r} ${r} 0 1 1 ${c - .01} ${c - r}` : `M${c + r * Math.cos(a)} ${c + r * Math.sin(a)} A${r} ${r} 0 ${large} 1 ${c + r * Math.cos(a2)} ${c + r * Math.sin(a2)}`; a = a2;
    return `<path d="${d}" fill="none" stroke="${p.c}" stroke-width="${sw}"/>`; }).join("");
  return `<svg viewBox="0 0 150 150" width="${size}" height="${size}" aria-hidden="true">${segs}<text x="75" y="72" text-anchor="middle" font-size="11" fill="#6A645A" font-family="Plus Jakarta Sans,Anuphan">รวม</text><text x="75" y="90" text-anchor="middle" font-size="16" font-weight="800" fill="#1D1A16" font-family="Plus Jakarta Sans">${fmt(tot)}</text></svg>`;
}
const CAT_COL = ["#6E3E2E", "#FFBE2E", "#7C9836", "#5B4BB0", "#C4452F", "#7B766A", "#D5A07A", "#9DBA5C", "#A8483A", "#3F5E1C", "#E9A300", "#B7B0A2"];
function auditList(steps) { return `<div class="audit">${steps.map((s, i) => `<div class="ar ${i === steps.length - 1 ? "total" : ""}"><b>${esc(s.label)}</b><span class="v" style="color:${s.value < 0 ? "var(--bad)" : "var(--ink)"}">${baht(s.value, Math.abs(s.value) % 1 ? 2 : 0)}</span><small>${esc(s.formula)}</small></div>`).join("")}</div>`; }

/* ───────── MONEY ───────── */
const MTABS = [["overview", "เงินเหลือใช้"], ["slips", "สลิป"], ["ot", "OT Scanner"], ["salary", "เงินเดือน & ภาษี"], ["debt", "หนี้สิน"], ["expense", "รายจ่าย"], ["report", "รายงาน"]];
function pMoney() {
  const tabs = `<div class="chips" style="margin-bottom:16px">${MTABS.map(([k, l]) => `<button class="chip" data-act="mtab" data-k="${k}" aria-pressed="${view.money === k}">${l}</button>`).join("")}</div>`;
  const body = { overview: mOverview, slips: mSlips, ot: mOT, salary: mSalary, debt: mDebt, expense: mExpense, report: mReport }[view.money]();
  return `${sampleBanner()}<div class="top"><div class="who"><div class="sub">Money</div><h1 class="hi">${MTABS.find(t => t[0] === view.money)[1]}</h1></div></div>${tabs}${body}`;
}
function mOverview() {
  const { mk, av } = snapshot();
  const net = Math.max(1, av.net);
  const it = [
    { name: "คงที่", v: av.fixed, c: "var(--cocoa)" }, { name: "หนี้", v: av.debt, c: "var(--bad)" },
    { name: "ออม+เป้า", v: av.savings + av.goals, c: "var(--olive)" }, { name: "ใช้ไปแล้ว", v: av.varSpent, c: "var(--taupe)" },
    { name: "เหลือใช้", v: Math.max(0, av.safe), c: "var(--sun)", light: true }].map(x => ({ ...x, label: `${Math.round(x.v / net * 100)}%` }));
  return `<div class="mgrid"><div class="stack">
    <div class="card"><div class="sub">เงินเหลือใช้จริง · ${mLabel(mk)}</div>
      <div class="money big" style="color:${av.safe < 0 ? "var(--bad)" : "var(--ink)"}">${baht(av.safe)}</div>
      <div class="sub" style="margin-top:4px">ใช้ได้วันละ <b style="color:var(--ink)">${baht(av.daily)}</b> · อีก ${av.daysLeft} วันถึงเงินเดือน ${dShort(av.payday)}</div>
      ${av.overBudget ? `<div class="warnbox r" style="margin-top:12px">ใช้จ่ายผันแปรเกินงบแล้ว ${baht(av.varSpent - av.varBudget)}</div>` : ""}
      ${av.safe < 0 ? `<div class="warnbox r" style="margin-top:12px">ภาระมากกว่ารายรับเดือนนี้ — ลองลดเงินจัดสรรเป้าหมาย หรือดูแผนหนี้</div>` : ""}
      ${pillBars(it)}</div>
    <div class="card"><b>สถานะเงินเดือนนี้</b><div class="kv" style="margin-top:10px">
      <div><small>จ่ายแล้ว</small><b>${baht(av.paid)}</b></div><div><small>ตั้งใจจ่าย (ยังไม่จ่าย)</small><b>${baht(av.intended)}</b></div><div><small>ยังไม่ถึงกำหนด</small><b>${baht(av.notDue)}</b></div></div>
      <div class="f" style="margin-top:14px"><label for="savM">เงินออมรายเดือน (นอกเหนือจากเป้าหมาย)</label><input id="savM" type="number" inputmode="decimal" min="0" value="${S.budget.savingsMonthly || ""}" placeholder="0" data-bind="budget.savingsMonthly"></div></div>
  </div><div class="card"><b>ที่มาของตัวเลข</b>${auditList(av.steps)}
    <p class="sub" style="margin-top:8px">เงินที่จัดสรรเข้าเป้าหมายนับครั้งเดียว และบิลที่จ่ายแล้วจะไม่ถูกหักซ้ำ</p></div></div>`;
}

/* OT */
function otDraft() {
  if (!view.otDraft || view.otDraft.key !== view.otKey) {
    const rec = S.ot[view.otKey];
    view.otDraft = { key: view.otKey, values: rec ? JSON.parse(JSON.stringify(rec.values)) : Object.fromEntries(E.OT_FIELDS.map(f => [f.k, null])), source: rec ? Object.assign({}, rec.source || {}) : {}, dirty: false, img: null };
  }
  return view.otDraft;
}
function mOT() {
  const d = otDraft(), calc = E.otCalc(d.values, S.pay), per = E.otPeriod(view.otKey);
  const cur = E.periodKeyFor(today());
  const keys = Array.from({ length: 6 }, (_, i) => E.addMonths(cur, -i));
  const rows = E.OT_FIELDS.map(f => { const v = d.values[f.k], line = calc.lines.find(l => l.k === f.k), src = d.source[f.k];
    const inp = f.kind === "time"
      ? `<div class="hm"><input type="number" inputmode="numeric" min="0" max="999" placeholder="0" data-ot="${f.k}" data-part="h" value="${v ? v.h : ""}" class="${v ? "" : "miss"}" aria-label="${f.label} ชั่วโมง"><span>:</span><input type="number" inputmode="numeric" min="0" max="59" placeholder="00" data-ot="${f.k}" data-part="m" value="${v ? E.pad(v.m) : ""}" class="${v ? "" : "miss"}" aria-label="${f.label} นาที"></div>`
      : `<input type="number" inputmode="numeric" min="0" step="1" placeholder="บาท" data-ot="${f.k}" data-part="v" value="${v ? v.v : ""}" class="${v ? "" : "miss"}" aria-label="${f.label}">`;
    const note = f.kind === "money" ? (line.amount ? `${fmt(line.days, line.divisible ? 0 : 2)} วัน${line.divisible ? "" : " · หารไม่ลงตัว"}` : `วันละ ${line.unit}`) : `×${line.mult}${f.k === "other" ? " (ตั้งค่าได้)" : ""}`;
    return `<div class="otf"><div class="nm">${f.label} ${src ? `<span class="src ${src}">${src === "scan" ? "สแกน" : "แก้เอง"}</span>` : ""}<small>${note}</small></div>${inp}<div class="amt" data-amt="${f.k}">${line.amount ? baht(line.amount, 2) : "—"}</div></div>`; }).join("");
  const saved = S.ot[view.otKey];
  const hist = Object.keys(S.ot).sort().reverse().slice(0, 6);
  const last6 = Array.from({ length: 6 }, (_, i) => E.addMonths(cur, -5 + i));
  const sim = E.otSimulate(S, +view.otKey.slice(0, 4), view.simH, 1.5);
  return `<div class="mgrid"><div class="stack">
    <div class="card"><div class="between"><div><b>รอบจ่าย ${mLabel(view.otKey)}</b><div class="sub">${dShort(per.from)} – ${dShort(per.to)} ${saved ? `· บันทึกแล้ว ${new Date(saved.at).toLocaleDateString("th-TH")}` : "· ยังไม่บันทึก"}</div></div></div>
      <div class="chips" style="margin-top:10px">${keys.map(k => `<button class="chip" data-act="otKey" data-k="${k}" aria-pressed="${k === view.otKey}">${mShort(k)}${S.ot[k] ? " ✓" : ""}</button>`).join("")}</div>
      <div class="row" style="margin-top:10px">
        <label class="btn primary" style="flex:1">${I.cam} ถ่ายรูปใบ OT<input type="file" accept="image/*" capture="environment" data-scan hidden></label>
        <label class="btn ghost" style="flex:1">${I.file} เปิดรูป / PDF<input type="file" accept="image/*,application/pdf" data-scan hidden></label></div>
      <p class="sub" id="scanMsg" style="margin-top:8px">อ่านแถวรวมท้ายใบ 9 ช่อง แล้วให้คุณตรวจทุกช่องก่อนบันทึก · ช่องสีส้มคือยังไม่มีค่า</p>
      ${d.img ? `<img src="${d.img}" alt="รูปใบ OT" style="width:100%;border-radius:16px;margin-top:8px;max-height:180px;object-fit:cover">` : ""}</div>
    <div class="card">${rows}
      <div class="between" style="margin-top:14px"><div><div class="sub">OT ${fmt(calc.otHours, 2)} ชม. · เรต ${baht(calc.rate, 2)}/ชม.</div><div class="money" style="font-size:30px" id="otTotal">${baht(calc.total, 2)}</div></div>
      <button class="btn primary" data-act="otSave">${saved ? "บันทึกทับรอบนี้" : "บันทึกรอบนี้"}</button></div>
      ${!S.pay.salary ? `<div class="warnbox" style="margin-top:12px">ยังไม่ได้ตั้งเงินเดือน — เรต OT จะเป็น 0 <button class="link" data-act="mtab" data-k="salary">ตั้งค่า</button></div>` : ""}</div>
  </div><div class="stack">
    <div class="card"><b>รายได้ OT 6 รอบล่าสุด</b>${pillBars(last6.map(k => { const v = S.ot[k] ? E.otCalc(S.ot[k].values, S.pay).otPay : 0; return { name: mShort(k), v, c: k === view.otKey ? "var(--sun)" : "var(--cocoa)", light: k === view.otKey, label: v ? fmt(v / 1000, 1) + "k" : "" }; }))}</div>
    <div class="card"><b>ลองเพิ่ม OT ×1.5</b><div class="sub">ผลกับภาษีและเงินสุทธิโดยประมาณ</div>
      <div class="between" style="margin-top:12px"><input type="range" min="0" max="60" step="1" value="${view.simH}" data-act-input="simH" style="flex:1;accent-color:#E9A300" aria-label="ชั่วโมง OT ต่อเดือน"><b style="width:80px;text-align:right">${view.simH} ชม./ด.</b></div>
      <div class="kv" style="margin-top:10px"><div><small>รายได้เพิ่ม/เดือน</small><b>${baht(sim.extraMonth)}</b></div><div><small>ภาษีเพิ่ม/ปี</small><b>${baht(sim.taxDeltaYear)}</b></div><div><small>สุทธิเพิ่ม/เดือน</small><b>${baht(sim.netExtraMonth)}</b></div></div>
      <p class="sub" style="margin-top:8px">ฐานภาษีขั้นสุดท้ายของคุณ ${Math.round(sim.marginal * 100)}%</p></div>
    <div class="card"><b>ประวัติการบันทึก</b>${hist.length ? `<div class="list">${hist.map(k => { const r = S.ot[k], c = E.otCalc(r.values, S.pay); const n = (r.history || []).length; return `<button class="li" data-act="otKey" data-k="${k}"><div class="ic">⏱️</div><div class="t"><b>${mLabel(k)}</b><small>${Object.values(r.source || {}).includes("scan") ? "สแกน + ตรวจ" : "กรอกเอง"}${n > 1 ? ` · แก้ ${n - 1} ครั้ง` : ""}</small></div><div class="v">${baht(c.total)}<small>${fmt(c.otHours, 1)} ชม.</small></div></button>`; }).join("")}</div>` : `<div class="empty">ยังไม่มีรอบที่บันทึก</div>`}</div>
  </div></div>`;
}
function otLiveUpdate() {
  const d = otDraft(), calc = E.otCalc(d.values, S.pay);
  for (const l of calc.lines) { const el = document.querySelector(`[data-amt="${l.k}"]`); if (el) el.textContent = l.amount ? baht(l.amount, 2) : "—"; }
  const t = $("#otTotal"); if (t) t.textContent = baht(calc.total, 2);
}

/* Scanner: Claude reads the photo (viewer's Claude account), user checks every cell */
async function scanFile(file) {
  const msg = $("#scanMsg");
  const sample = window.claude?.use ? await claude.use("sample") : null;
  const lim = sample ? await sample.limits().catch(() => null) : null;
  if (!sample || !lim?.images) { msg.textContent = "อ่านอัตโนมัติใช้ได้เมื่อเปิดแอปจากลิงก์ claude.ai — ตอนนี้กรอกตัวเลขเองได้เลย"; return; }
  let blob = file;
  try {
    if (file.type === "application/pdf") { msg.textContent = "กำลังเปิด PDF หน้าแรก…"; blob = await pdfFirstPage(file); }
    const url = URL.createObjectURL(blob); otDraft().img = url;
    msg.textContent = "กำลังอ่านแถวรวม… (ใช้เวลา 10–40 วินาที)";
    const prompt = `This image is a Thai factory "รายงานแสดงสรุปการทำงานประจำวัน" (UACJ daily work summary / OT slip). Read ONLY the TOTAL row at the bottom of the table (แถวรวม). It has 9 cells in this order: OT hours at rate 1, 1.5, 3, 1.5 Public, 2 Public, Other (all as hours:minutes), then meal allowance ค่าอาหาร, meal OT ค่าอาหาร OT, shift allowance ค่ากะ (all in baht). Ignore handwriting in red pen. Reply with ONLY JSON: {"h1":"hh:mm"|null,"h15":"hh:mm"|null,"h3":"hh:mm"|null,"h15p":"hh:mm"|null,"h2p":"hh:mm"|null,"other":"hh:mm"|null,"meal":number|null,"mealOt":number|null,"shift":number|null,"unsure":["field keys you are not sure about"]}. Use null for an empty or unreadable cell. Never guess.`;
    const r = await sample.json(prompt, { images: [blob] });
    const d = otDraft(); let n = 0, bad = [];
    for (const f of E.OT_FIELDS) {
      const v = r[f.k]; if (v == null || v === "") continue;
      if (f.kind === "time") { const m = String(v).match(/^(\d{1,3})[:.](\d{1,2})$/); if (!m || +m[2] > 59) { bad.push(f.label); continue; } d.values[f.k] = { h: +m[1], m: +m[2] }; }
      else { const amt = Math.round(+String(v).replace(/,/g, "")); if (!isFinite(amt)) { bad.push(f.label); continue; } d.values[f.k] = { v: amt }; const unit = f.k === "meal" ? S.pay.mealRate : f.k === "mealOt" ? S.pay.mealOtRate : S.pay.shiftRate; if (amt % unit) bad.push(f.label + " (หารไม่ลงตัว)"); }
      d.source[f.k] = "scan"; d.dirty = true; n++;
    }
    const unsure = (r.unsure || []).map(k => (E.OT_FIELDS.find(f => f.k === k) || {}).label).filter(Boolean);
    render();
    $("#scanMsg").textContent = `อ่านได้ ${n}/9 ช่อง${bad.length ? ` · ตรวจ: ${bad.join(", ")}` : ""}${unsure.length ? ` · ไม่แน่ใจ: ${unsure.join(", ")}` : ""} — ตรวจทุกช่องก่อนกดบันทึก`;
  } catch (e) {
    msg.textContent = e?.code === "not_granted" ? "ไม่ได้อนุญาตให้อ่านรูป — กรอกตัวเลขเองได้" : e?.code === "rate_limited" ? "ใช้งานถี่เกินไป ลองใหม่อีกสักครู่" : "อ่านรูปไม่สำเร็จ ลองถ่ายให้เห็นแถวรวมชัด ๆ หรือกรอกเอง";
  }
}
function loadScript(src) { return new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
async function pdfFirstPage(file) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise; const pg = await pdf.getPage(1);
  const vp = pg.getViewport({ scale: 2 }); const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
  await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
  return new Promise(ok => cv.toBlob(ok, "image/jpeg", .9));
}

/* Salary & tax */
function mSalary() {
  const mk = view.payMonth, pr = E.payroll(S, mk), yr = view.taxYear, tx = E.annualTax(S, yr);
  const p = S.pay, d = S.tax.d, slip = S.payslips[mk] || {};
  const inp = (path, label, val, hint = "") => `<div class="f"><label>${label}</label><input type="number" inputmode="decimal" min="0" step="any" data-bind="${path}" value="${val || ""}" placeholder="0">${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  return `<div class="mgrid"><div class="stack">
    <div class="card"><b>เงินเดือนและค่าจ้างคงที่</b><div class="sub" style="margin-bottom:12px">ใช้คิดเรต OT, ประกันสังคม และภาษี · เรต OT ตอนนี้ <b style="color:var(--ink)">${baht(E.hourlyBase(p), 2)}/ชม.</b></div>
      <div class="fgrid">${inp("pay.salary", "เงินเดือน", p.salary)}${inp("pay.living", "ค่าครองชีพ", p.living)}${inp("pay.position", "ค่าตำแหน่ง", p.position)}${inp("pay.rent", "ค่าเช่าบ้าน", p.rent)}
      ${inp("pay.env", "ค่าสภาพแวดล้อม", p.env, "ไม่นำไปคิดเรต OT")}${inp("pay.diligence", "เบี้ยขยัน", p.diligence, "ไม่นำไปคิดเรต OT")}
      ${inp("pay.otherMult", "ตัวคูณช่อง OT อื่น ๆ", p.otherMult)}${inp("pay.pvdRateP", "กองทุนสำรองฯ (%)", p.pvdRate ? +(p.pvdRate * 100).toFixed(2) : "")}
      ${inp("pay.loanDeduct", "หักเงินกู้บริษัท/เดือน", p.loanDeduct)}${inp("profile.payday", "วันเงินเดือนออก", S.profile.payday)}</div></div>
    <div class="card"><div class="between"><b>สลิปเดือน ${mLabel(mk)}</b><div class="row" style="gap:4px"><button class="icon-btn" data-act="payM" data-n="-1" aria-label="เดือนก่อน">${I.l}</button><button class="icon-btn" data-act="payM" data-n="1" aria-label="เดือนถัดไป">${I.r}</button></div></div>
      ${auditList(pr.steps)}
      <div class="fgrid" style="margin-top:12px">${inp(`payslips.${mk}.withheld`, "ภาษีหักตามสลิปจริง", slip.withheld, "เว้นว่าง = ประมาณให้")}${inp(`payslips.${mk}.bonus`, "โบนัสเดือนนี้", slip.bonus)}${inp(`payslips.${mk}.extra`, "รายได้อื่นเดือนนี้", slip.extra)}</div></div>
  </div><div class="stack">
    <div class="card"><div class="between"><b>ภาษีปี ${yr + 543}</b><div class="seg">${[yr - 1, yr, yr + 1].map(y => `<button data-act="taxY" data-y="${y}" aria-pressed="${y === view.taxYear}">${y + 543}</button>`).join("")}</div></div>
      <div class="kv" style="margin-top:12px">
        <div><small>1 · รายได้ทั้งปี (Gross)</small><b>${baht(tx.gross)}</b></div>
        <div><small>2 · รับสุทธิเดือนนี้ (Net Payroll)</small><b>${baht(pr.net)}</b></div>
        <div><small>3 · ภาษีทั้งปี (Liability)</small><b>${baht(tx.liability)}</b></div>
        <div><small>4 · ภาษีที่ถูกหักไว้ (Withheld)</small><b>${baht(tx.withheldEst)}</b></div>
        <div><small>5 · เงินเข้ากระเป๋าทั้งปี</small><b>${baht(tx.takeHome)}</b></div>
        <div><small>${tx.refundOrDue >= 0 ? "คาดว่าได้คืน" : "คาดว่าจ่ายเพิ่ม"}</small><b style="color:${tx.refundOrDue >= 0 ? "var(--good)" : "var(--bad)"}">${baht(Math.abs(tx.refundOrDue))}</b></div></div>
      <p class="sub" style="margin-top:10px">อัตราเฉลี่ยจริง ${(tx.effective * 100).toFixed(2)}% · ขั้นสูงสุด ${Math.round(tx.marginal * 100)}% (คิดแบบขั้นบันได ไม่ได้คูณทั้งก้อน)${tx.projectedOT ? ` · รวม OT ประมาณการ ${baht(tx.projectedOT)}` : ""} · กฎปี ${tx.rulesYear}</p>
      ${auditList(tx.steps)}
      <table class="tbl" style="margin-top:6px"><thead><tr><th>ช่วงเงินได้สุทธิ</th><th>อัตรา</th><th>ภาษี</th></tr></thead><tbody>${tx.rows.map(r => `<tr><td>${fmt(r.from)} – ${fmt(r.to)}</td><td>${Math.round(r.rate * 100)}%</td><td>${fmt(r.tax)}</td></tr>`).join("")}</tbody></table></div>
    <div class="card"><b>ค่าลดหย่อน ปี ${yr + 543}</b><div class="sub" style="margin-bottom:12px">ระบบใส่เพดานตามกฎหมายให้ · ส่วนตัว 60,000 และประกันสังคมคิดให้อัตโนมัติ</div>
      <div class="fgrid">
        <div class="f"><label>คู่สมรสไม่มีเงินได้</label><select data-bind="tax.d.spouse"><option value="0" ${!d.spouse ? "selected" : ""}>ไม่มี</option><option value="1" ${d.spouse ? "selected" : ""}>มี (60,000)</option></select></div>
        ${inp("tax.d.child30", "บุตร (คนละ 30,000)", d.child30)}${inp("tax.d.child60", "บุตรคนที่ 2+ เกิดตั้งแต่ 2561", d.child60)}${inp("tax.d.parents", "พ่อแม่ (คนละ 30,000)", d.parents)}
        ${inp("tax.d.lifeIns", "ประกันชีวิต", d.lifeIns)}${inp("tax.d.healthIns", "ประกันสุขภาพ", d.healthIns)}${inp("tax.d.parentHealthIns", "ประกันสุขภาพพ่อแม่", d.parentHealthIns)}${inp("tax.d.pensionIns", "ประกันบำนาญ", d.pensionIns)}
        ${inp("tax.d.rmf", "RMF", d.rmf)}${inp("tax.d.ssf", "SSF", d.ssf)}${inp("tax.d.thaiEsg", "Thai ESG", d.thaiEsg)}${inp("tax.d.homeInterest", "ดอกเบี้ยบ้าน", d.homeInterest)}
        ${inp("tax.d.donation", "บริจาคทั่วไป", d.donation)}${inp("tax.d.donationEdu", "บริจาคการศึกษา (2 เท่า)", d.donationEdu)}${inp("tax.d.other", "ลดหย่อนอื่นตามกฎหมายปีนั้น", d.other, "เช่น Easy e-Receipt — ใส่ยอดที่ใช้สิทธิ์ได้จริง")}
        ${inp("tax.bonusYear", "โบนัสทั้งปี (ถ้ารู้)", S.tax.bonusYear)}</div>
      <label class="row" style="margin-top:12px;font-size:14px"><input type="checkbox" data-bind="pay.projectOT" ${S.pay.projectOT ? "checked" : ""} style="width:22px;height:22px;accent-color:#E9A300"> ประมาณการ OT เดือนที่เหลือจากค่าเฉลี่ย 6 รอบล่าสุด</label></div>
  </div></div>`;
}

/* Debts */
function mDebt() {
  const td = today(), mk = E.monthKey(td), rows = E.debtSchedule(S, mk, td);
  const open = S.debts.filter(d => +d.balance > 0);
  const total = E.sum(open.map(d => +d.balance)), monthly = E.sum(rows.map(r => r.planned));
  const base = E.simulatePayoff(open, 0, "none");
  const cmp = open.length ? E.compareStrategies(open, [0, 500, 1000, 2000]) : [];
  const freeDate = isFinite(base.months) ? mLabel(E.addMonths(mk, base.months)) : "จ่ายไม่ทันดอกเบี้ย";
  const card = d => { const r = rows.find(x => x.debt.id === d.id), orig = +d.principal || +d.balance, pct = orig ? Math.max(0, 1 - d.balance / orig) : 0;
    const st = !r ? "" : r.status === "paid" ? '<span class="tag g">จ่ายแล้วเดือนนี้</span>' : r.status === "overdue" ? '<span class="tag r">เลยกำหนด</span>' : r.status === "closed" ? '<span class="tag g">ปิดแล้ว</span>' : `<span class="tag y">ครบ ${dShort(r.due)}</span>`;
    return `<div class="card"><button class="debt" data-act="debtEdit" data-id="${d.id}"><div class="top2"><div class="ic">${{ card: "💳", cash: "🏧", personal: "🤝", car: "🚗", home: "🏠", other: "📄" }[d.type] || "📄"}</div>
      <div style="flex:1;min-width:0"><b>${esc(d.name)}</b><div class="sub">${esc(d.lender || "")} · ${E.DEBT_TYPES[d.type] || ""} · ${d.apr}%${d.method === "flat" ? " flat" : ""}</div></div>${st}</div>
      <div class="between" style="margin-top:12px"><div class="bal">${baht(d.balance)}</div><div class="sub">งวดละ ${baht(r ? r.planned : E.debtDue(d))}</div></div>
      <div class="bar" style="margin-top:8px"><i style="width:${pct * 100}%;background:var(--olive)"></i></div><div class="sub" style="margin-top:4px">จ่ายไปแล้ว ${Math.round(pct * 100)}% ของยอดเริ่มต้น ${baht(orig)}</div></button>
      ${+d.balance > 0 ? `<button class="btn primary sm wide" style="margin-top:12px" data-act="pay" data-id="${d.id}">บันทึกการจ่าย</button>` : ""}</div>`; };
  return `${S.debts.length ? `<div class="card"><div class="sub">หนี้คงเหลือรวม</div><div class="money big">${baht(total)}</div>
      <div class="kv" style="margin-top:12px"><div><small>ผ่อนเดือนนี้</small><b>${baht(monthly)}</b></div><div><small>ปลดหนี้หมด (จ่ายตามงวด)</small><b>${freeDate}</b></div><div><small>ดอกเบี้ยที่จะจ่ายอีก</small><b>${baht(base.totalInterest)}</b></div></div></div>` : ""}
    <div class="sec-h"><h2>บัญชีหนี้</h2><button data-act="debtEdit" data-id="">+ เพิ่มหนี้</button></div>
    <div class="mgrid" style="gap:12px"><div class="stack">${S.debts.map(card).join("") || `<div class="card empty"><b>ไม่มีหนี้ในระบบ</b>เพิ่มบัตรเครดิต สินเชื่อ หรือหนี้อื่น เพื่อวางแผนปลดหนี้</div>`}</div>
    ${open.length ? `<div class="card"><b>วางแผนปลดหนี้</b><div class="sub">Snowball = ปิดก้อนเล็กก่อน · Avalanche = ปิดดอกเบี้ยสูงก่อน (หนี้เช่าซื้อแบบ flat ผ่อนตามงวดเดิม)</div>
      <table class="tbl" style="margin-top:10px"><thead><tr><th>จ่ายเพิ่ม/ด.</th><th>Snowball</th><th>Avalanche</th><th>ประหยัดดอกเบี้ย</th></tr></thead><tbody>
      ${cmp.map(c => `<tr class="${c.extra === 1000 ? "best" : ""}"><td>${c.extra ? "+" + fmt(c.extra) : "ตามงวด"}</td><td>${isFinite(c.snowball.months) ? c.snowball.months + " ด." : "—"}<br><small class="muted">${fmt(c.snowball.totalInterest)}</small></td><td>${isFinite(c.avalanche.months) ? c.avalanche.months + " ด." : "—"}<br><small class="muted">${fmt(c.avalanche.totalInterest)}</small></td><td>${c.extra ? baht(c.interestSaved) + (c.monthsSaved ? `<br><small class="muted">เร็วขึ้น ${c.monthsSaved} ด.</small>` : "") : "—"}</td></tr>`).join("")}</tbody></table>
      <p class="sub" style="margin-top:8px">ตัวเลขดอกเบี้ยใต้จำนวนเดือนคือดอกเบี้ยรวมที่จะจ่าย</p></div>` : ""}</div>
    ${S.debtPayments.length ? `<div class="sec-h"><h2>ประวัติการจ่าย</h2></div><div class="card"><div class="list">${S.debtPayments.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(p => { const d = S.debts.find(x => x.id === p.debtId); return `<div class="li"><div class="ic">✅</div><div class="t"><b>${esc(d ? d.name : "หนี้ที่ลบแล้ว")}</b><small>${dShort(p.date)} · ต้น ${baht(p.principal)} · ดอก ${baht(p.interest, 2)}</small></div><div class="v">${baht(p.amount)}<small>เหลือ ${baht(p.after)}</small></div></div>`; }).join("")}</div></div>` : ""}`;
}

/* Expenses */
function mExpense() {
  const mk = view.expMonth, ex = E.expenseMonth(S, mk), td = today();
  const cats = Object.entries(ex.byCat).sort((a, b) => b[1] - a[1]);
  const fixed = ex.fixed.map(f => `<div class="li"><div class="ic">${f.status === "paid" ? "✅" : "🧾"}</div><button class="t" data-act="expItem" data-id="${f.item.id}" style="text-align:left"><b>${esc(f.item.name)}</b><small>${E.EXP_CATS[f.item.cat] || ""} · ครบ ${dShort(f.due)}${f.paid && f.status !== "paid" ? ` · จ่ายแล้ว ${baht(f.paid)}` : ""}</small></button>
    <div class="v">${baht(f.planned)}${f.status === "paid" ? `<small>จ่ายแล้ว${f.paid > f.planned ? " (เกิน " + baht(f.paid - f.planned) + ")" : ""}</small>` : ""}</div>${f.status !== "paid" ? `<button class="btn sm ghost" data-act="markPaid" data-id="${f.item.id}">จ่ายแล้ว</button>` : ""}</div>`).join("");
  const vari = ex.varItems.map(v => `<button class="li" data-act="expItem" data-id="${v.item.id}"><div class="ic">🛒</div><div class="t"><b>${esc(v.item.name)}</b><div class="bar" style="margin-top:6px;height:7px"><i style="width:${Math.min(100, v.spent / Math.max(1, v.budget) * 100)}%;background:${v.spent > v.budget ? "var(--bad)" : "var(--sun)"}"></i></div></div><div class="v">${baht(v.left)}<small>เหลือจาก ${baht(v.budget)}</small></div></button>`).join("");
  const logs = ex.logs.slice().sort((a, b) => b.date.localeCompare(a.date)).map(l => `<button class="li" data-act="spend" data-id="${l.id}"><div class="ic">${{ food: "🍜", fuel: "⛽", travel: "🚌", home: "🏠", power: "💡", water: "💧", net: "📶", phone: "📱", sub: "🎬", ins: "🛡️", family: "👪" }[l.cat] || "🧾"}</div><div class="t"><b>${esc(l.note || E.EXP_CATS[l.cat] || "รายจ่าย")}</b><small>${dShort(l.date)} · ${E.EXP_CATS[l.cat] || ""}${l.itemId ? " · " + esc((S.expenses.find(e => e.id === l.itemId) || {}).name || "") : ""}</small></div><div class="v">${baht(l.amount)}</div></button>`).join("");
  return `<div class="between" style="margin-bottom:12px"><div class="row"><button class="icon-btn" data-act="expM" data-n="-1" aria-label="เดือนก่อน">${I.l}</button><b>${mLabel(mk)}</b><button class="icon-btn" data-act="expM" data-n="1" aria-label="เดือนถัดไป">${I.r}</button></div><button class="btn primary sm" data-act="spend" data-id="">${I.plus} จดรายจ่าย</button></div>
    ${ex.varSpent > ex.varBudget && ex.varBudget ? `<div class="warnbox r" style="margin-bottom:12px">ใช้จ่ายผันแปรเกินงบ ${baht(ex.varSpent - ex.varBudget)}</div>` : ""}
    <div class="mgrid"><div class="stack">
      <div class="card"><div class="kv"><div><small>จ่ายจริงเดือนนี้</small><b>${baht(ex.total)}</b></div><div><small>คงที่ (ตามแผน/จริง)</small><b>${baht(ex.fixedCommitted)}</b></div><div><small>ผันแปร ใช้ / งบ</small><b>${baht(ex.varSpent)} <span class="muted" style="font-size:14px">/ ${fmt(ex.varBudget)}</span></b></div></div></div>
      <div class="card"><div class="between"><b>ค่าใช้จ่ายคงที่</b><button class="link" data-act="expItem" data-id="" data-kind="fixed">+ เพิ่ม</button></div><div class="list">${fixed || `<div class="empty">เพิ่มค่าห้อง ค่าไฟ ค่าโทรศัพท์ ฯลฯ</div>`}</div></div>
      <div class="card"><div class="between"><b>งบใช้จ่ายผันแปร</b><button class="link" data-act="expItem" data-id="" data-kind="variable">+ ตั้งงบ</button></div><div class="list">${vari || `<div class="empty">ตั้งงบค่าอาหาร ค่าน้ำมัน ฯลฯ</div>`}</div></div>
    </div><div class="stack">
      ${cats.length ? `<div class="card"><b>แยกตามหมวด</b><div class="row" style="margin-top:10px;align-items:center;gap:18px">${donut(cats.map(([k, v], i) => ({ v, c: CAT_COL[i % CAT_COL.length] })))}<div class="stack" style="gap:6px;flex:1;min-width:140px">${cats.map(([k, v], i) => `<div class="between" style="font-size:14px"><span class="row" style="gap:8px"><span class="dot" style="background:${CAT_COL[i % CAT_COL.length]}"></span>${E.EXP_CATS[k] || k}</span><b>${fmt(v)}</b></div>`).join("")}</div></div></div>` : ""}
      <div class="card"><b>รายการที่จด</b><div class="list">${logs || `<div class="empty"><b>ยังไม่มีรายการเดือนนี้</b>กด “จดรายจ่าย” เมื่อจ่ายเงิน</div>`}</div></div>
    </div></div>`;
}

/* Reports */
function monthRow(mk) {
  const pr = E.payroll(S, mk), ex = E.expenseMonth(S, mk);
  const debtPaid = E.sum(S.debtPayments.filter(p => p.month === mk).map(p => p.amount));
  const interest = E.sum(S.debtPayments.filter(p => p.month === mk).map(p => p.interest));
  const saved = E.sum(S.goals.map(g => E.goalContribMonth(g, mk)));
  return { mk, gross: pr.gross, net: pr.net, ot: pr.ot ? pr.ot.otPay : 0, exp: ex.total, debtPaid, interest, saved, left: E.r2(pr.net - ex.total - debtPaid - saved) };
}
function mReport() {
  const mk = E.monthKey(today()), months = Array.from({ length: 6 }, (_, i) => E.addMonths(mk, -5 + i)), rows = months.map(monthRow);
  const yr = new Date().getFullYear(), tx = E.annualTax(S, yr);
  const debtNow = E.sum(S.debts.map(d => Math.max(0, +d.balance)));
  const prevR = rows[4], curR = rows[5];
  const delta = (a, b) => b ? `${a >= b ? "+" : "−"}${fmt(Math.abs(a - b))} จากเดือนก่อน` : "";
  return `<div class="mgrid"><div class="stack">
    <div class="card"><b>รายรับสุทธิ vs รายจ่ายจริง</b>${pillBars(rows.flatMap(r => [{ name: mShort(r.mk), v: r.net, c: "var(--olive)", label: r.net ? fmt(r.net / 1000, 0) + "k" : "" }]))}<p class="sub" style="margin-top:8px">${delta(curR.net, prevR.net)}</p></div>
    <div class="card"><b>รายจ่ายรายเดือน</b>${pillBars(rows.map(r => ({ name: mShort(r.mk), v: r.exp, c: "var(--cocoa)", label: r.exp ? fmt(r.exp / 1000, 1) + "k" : "" })))}<p class="sub" style="margin-top:8px">${delta(curR.exp, prevR.exp)}</p></div>
  </div><div class="stack">
    <div class="card"><b>สรุป 6 เดือน</b><div style="overflow-x:auto"><table class="tbl" style="margin-top:8px;min-width:520px"><thead><tr><th>เดือน</th><th>สุทธิ</th><th>OT</th><th>รายจ่าย</th><th>ผ่อนหนี้</th><th>ดอกเบี้ย</th><th>ออม</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${mShort(r.mk)}</td><td>${fmt(r.net)}</td><td>${fmt(r.ot)}</td><td>${fmt(r.exp)}</td><td>${fmt(r.debtPaid)}</td><td>${fmt(r.interest)}</td><td>${fmt(r.saved)}</td></tr>`).join("")}</tbody></table></div>
      <div class="kv" style="margin-top:12px"><div><small>หนี้คงเหลือ</small><b>${baht(debtNow)}</b></div><div><small>เงินออมสะสม</small><b>${baht(E.sum(S.goals.map(E.goalSaved)))}</b></div><div><small>ภาษีปี ${yr + 543}</small><b>${baht(tx.liability)}</b></div><div><small>เป้าหมายสำเร็จ</small><b>${S.goals.filter(g => E.goalInfo(g).pct >= 1).length}/${S.goals.length}</b></div></div></div>
    <div class="card"><b>ส่งออก</b><div class="row" style="margin-top:10px"><button class="btn primary sm" data-act="export" data-k="xlsx">${I.dl} Excel</button><button class="btn ghost sm" data-act="export" data-k="pdf">${I.dl} PDF</button><button class="btn ghost sm" data-act="export" data-k="json">${I.dl} สำรองข้อมูล</button></div></div>
  </div></div>`;
}

/* ───────── PLANNER ───────── */
const PTABS = [["calendar", "ปฏิทิน"], ["shift", "ตารางกะ"], ["appts", "นัดหมาย"], ["todo", "To-do"]];
const EV_COL = { shift: "", appt: "var(--lav-ink)", birthday: "var(--sun-deep)", debt: "var(--bad)", bill: "var(--cocoa)", todo: "var(--olive)", payday: "var(--good)" };
function dayEvents(d) {
  const ev = [], mk = E.monthKey(d);
  for (const a of S.planner.appts) if (E.apptOccurrences(a, d, d).length) ev.push({ k: a.type === "วันเกิด" ? "birthday" : "appt", t: a.time || "", title: a.title, sub: [a.place, a.type].filter(Boolean).join(" · "), act: `data-act="editAppt" data-id="${a.id}"` });
  for (const r of E.debtSchedule(S, mk, today())) if (r.due === d && r.status !== "closed") ev.push({ k: "debt", t: "", title: `ผ่อน ${r.debt.name}`, sub: `${baht(r.planned)} · ${r.status === "paid" ? "จ่ายแล้ว" : r.status === "overdue" ? "เลยกำหนด" : "ครบกำหนด"}`, act: `data-act="goMoney" data-sub="debt"` });
  for (const f of E.expenseMonth(S, mk).fixed) if (f.due === d) ev.push({ k: "bill", t: "", title: f.item.name, sub: `${baht(f.planned)} · ${f.status === "paid" ? "จ่ายแล้ว" : "ยังไม่จ่าย"}`, act: `data-act="goMoney" data-sub="expense"` });
  for (const t of S.planner.todos) if (t.due === d) ev.push({ k: "todo", t: "", title: t.title, sub: t.done ? "เสร็จแล้ว" : "To-do", act: `data-act="todo" data-id="${t.id}"` });
  if (E.nextPayday(S, E.addDays(d, -1)) === d && S.pay.salary) ev.push({ k: "payday", t: "", title: "เงินเดือนออก", sub: "", act: `data-act="goMoney" data-sub="overview"` });
  return ev.sort((a, b) => (a.t || "99").localeCompare(b.t || "99"));
}
function pPlanner() {
  const tabs = `<div class="chips" style="margin-bottom:16px">${PTABS.map(([k, l]) => `<button class="chip" data-act="ptab" data-k="${k}" aria-pressed="${view.planner === k}">${l}</button>`).join("")}</div>`;
  return `${sampleBanner()}<div class="top"><div class="who"><div class="sub">Planner</div><h1 class="hi">${PTABS.find(t => t[0] === view.planner)[1]}</h1></div><button class="avatar" style="background:var(--ink);color:#fff" data-act="editAppt" data-id="" aria-label="เพิ่มนัดหมาย">${I.plus}</button></div>${tabs}${{ calendar: plCalendar, shift: plShift, appts: plAppts, todo: plTodo }[view.planner]()}`;
}
function agenda(d) {
  const sh = shiftOf(d), ev = dayEvents(d);
  const shiftRow = `<button class="it" data-act="shiftDay" data-d="${d}"><span class="tm">${isWork(sh.c) ? times(sh.c)[0] : "—"}</span><span class="st" style="background:var(--${sh.c})"></span><span><b>${SHN[sh.c]}${sh.sw ? " · สลับกะ" : ""}</b><small>${isWork(sh.c) ? times(sh.c).join("–") + " · " : ""}Team ${S.profile.team}${sh.est ? " · ประมาณการ" : ""}${HOL[d] ? " · " + HOL[d][0] : ""}</small></span><span class="tag">แก้กะ</span></button>`;
  return shiftRow + ev.map(e => `<button class="it" ${e.act}><span class="tm">${e.t || "ทั้งวัน"}</span><span class="st" style="background:${EV_COL[e.k]}"></span><span><b>${esc(e.title)}</b><small>${esc(e.sub)}</small></span><span></span></button>`).join("");
}
function plCalendar() {
  const mk = view.calMonth, td = today(), sel = view.sel;
  const vw = view.calView;
  let body = "";
  if (vw === "month") {
    const first = E.parse(mk + "-01"), lead = (first.getDay() + 6) % 7, start = E.addDays(mk + "-01", -lead), total = Math.ceil((lead + E.daysInMonth(mk)) / 7) * 7;
    let cells = ""; for (let i = 0; i < total; i++) { const d = E.addDays(start, i), sh = shiftOf(d), ev = dayEvents(d);
      cells += `<button class="cc ${E.monthKey(d) !== mk ? "out" : ""} ${d === td ? "today" : ""} ${d === sel ? "sel" : ""} ${HOL[d] ? "hol" : ""}" data-act="calSel" data-d="${d}" aria-label="${dLong(d)} ${SHN[sh.c]} ${ev.length} รายการ"><span class="n">${E.parse(d).getDate()}</span><span class="sh" style="background:var(--${sh.c})${sh.sw ? ";outline:1.5px dashed #1D1A16;outline-offset:1px" : ""}"></span><span class="ev">${ev.slice(0, 3).map(e => `<i style="background:${EV_COL[e.k]}"></i>`).join("")}</span></button>`; }
    body = `<div class="cal"><div class="between" style="margin-bottom:10px"><button class="icon-btn" style="background:var(--surface)" data-act="calM" data-n="-1" aria-label="เดือนก่อน">${I.l}</button><b style="font-size:17px">${mLabel(mk)}</b><button class="icon-btn" style="background:var(--surface)" data-act="calM" data-n="1" aria-label="เดือนถัดไป">${I.r}</button></div>
      <div class="dow">${["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map(x => `<span>${x}</span>`).join("")}</div><div class="cells">${cells}</div>
      <div class="row" style="gap:6px 14px;font-size:12px;color:var(--ink-2);margin-top:10px">${[["D", "เช้า"], ["N", "ดึก"], ["H", "หยุด"]].map(([k, l]) => `<span class="row" style="gap:5px"><span class="dot" style="width:14px;height:5px;border-radius:3px;background:var(--${k})"></span>${l}</span>`).join("")}${[["appt", "นัดหมาย"], ["birthday", "วันเกิด"], ["debt", "หนี้"], ["bill", "บิล"], ["todo", "To-do"], ["payday", "เงินเดือน"]].map(([k, l]) => `<span class="row" style="gap:5px"><span class="dot" style="background:${EV_COL[k]}"></span>${l}</span>`).join("")}</div></div>
      <div class="sec-h"><h2>${dLong(sel)}</h2></div><div class="card agenda">${agenda(sel)}</div>`;
  } else if (vw === "week") {
    const ws = E.addDays(sel, -((E.parse(sel).getDay() + 6) % 7));
    body = `<div class="between" style="margin-bottom:10px"><button class="icon-btn" data-act="selShift" data-n="-7" aria-label="สัปดาห์ก่อน">${I.l}</button><b>${dShort(ws)} – ${dShort(E.addDays(ws, 6))}</b><button class="icon-btn" data-act="selShift" data-n="7" aria-label="สัปดาห์ถัดไป">${I.r}</button></div>
      ${Array.from({ length: 7 }, (_, i) => { const d = E.addDays(ws, i); return `<div class="sec-h" style="margin:14px 2px 8px"><h2 style="font-size:16px">${dLong(d)}${d === td ? ' <span class="tag y">วันนี้</span>' : ""}</h2></div><div class="card agenda" style="padding:6px 16px">${agenda(d)}</div>`; }).join("")}`;
  } else {
    body = `<div class="between" style="margin-bottom:10px"><button class="icon-btn" data-act="selShift" data-n="-1" aria-label="วันก่อน">${I.l}</button><b>${dLong(sel)}</b><button class="icon-btn" data-act="selShift" data-n="1" aria-label="วันถัดไป">${I.r}</button></div><div class="card agenda">${agenda(sel)}</div>`;
  }
  return `<div class="between" style="margin-bottom:12px"><div class="seg">${[["day", "วัน"], ["week", "สัปดาห์"], ["month", "เดือน"]].map(([k, l]) => `<button data-act="calView" data-k="${k}" aria-pressed="${vw === k}">${l}</button>`).join("")}</div><button class="link" data-act="calToday">วันนี้</button></div>${body}`;
}
const PRESETS = [["UACJ 4-2-4-2", "DDDDHHNNNNHH"], ["4 เช้า 2 หยุด 4 ดึก 2 หยุด", "DDDDHHNNNNHH"], ["2-2-2", "DDNNHH"], ["3 เช้า 3 ดึก 3 หยุด", "DDDNNNHHH"], ["จันทร์–ศุกร์", "DDDDDHH"]];
function plShift() {
  const sh = S.shift, td = today();
  const next = Array.from({ length: 14 }, (_, i) => { const d = E.addDays(td, i), c = shiftOf(d).c; return `<div style="text-align:center;font-size:11px;color:var(--ink-3)">${DOW[E.parse(d).getDay()]}<div style="height:30px;border-radius:9px;margin-top:4px;background:var(--${c});display:grid;place-items:center;color:${c === "N" ? "#fff" : "var(--ink)"};font-weight:700;font-size:12px">${E.parse(d).getDate()}</div></div>`; }).join("");
  const mkN = E.addMonths(E.monthKey(td), 1); let nD = 0, nN = 0, nH = 0; for (let i = 1; i <= E.daysInMonth(mkN); i++) { const c = shiftOf(`${mkN}-${E.pad(i)}`).c; if (c === "D") nD++; else if (c === "N") nN++; else nH++; }
  return `<div class="mgrid"><div class="stack">
    <div class="card"><b>14 วันข้างหน้า</b><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:10px">${next}</div>
      <p class="sub" style="margin-top:10px">เดือนหน้า (${mLabel(mkN)}): เช้า ${nD} · ดึก ${nN} · หยุด ${nH} วัน</p></div>
    <div class="card"><b>รูปแบบกะ</b><div class="seg" style="margin-top:10px"><button data-act="shMode" data-k="roster" aria-pressed="${sh.mode === "roster"}">ตาราง UACJ 3G2S</button><button data-act="shMode" data-k="custom" aria-pressed="${sh.mode === "custom"}">รอบกำหนดเอง</button></div>
      ${sh.mode === "roster" ? `<div class="f" style="margin-top:14px"><label>ทีมของฉัน</label><div class="seg">${"ABC".split("").map(t => `<button data-act="team" data-k="${t}" aria-pressed="${S.profile.team === t}" style="min-width:80px">Team ${t}</button>`).join("")}</div><span class="hint">ตาม Calendar 2026_3G2S Rev.01 (ม.ค. 69 – มี.ค. 70) · หลังจากนั้นต่อรอบ 12 วันแบบประมาณการ</span></div>`
      : `<div class="f" style="margin-top:14px"><label>แตะช่องเพื่อเปลี่ยน เช้า → ดึก → หยุด</label><div class="seqb">${sh.custom.seq.map((c, i) => `<button data-act="seqTap" data-i="${i}" style="background:var(--${c});color:${c === "N" ? "#fff" : "var(--ink)"}">${{ D: "เช้า", N: "ดึก", H: "หยุด" }[c]}</button>`).join("")}<button data-act="seqAdd" style="box-shadow:inset 0 0 0 2px var(--line-2)" aria-label="เพิ่มช่อง">+</button><button data-act="seqDel" style="box-shadow:inset 0 0 0 2px var(--line-2)" aria-label="ลบช่องท้าย">−</button></div></div>
        <div class="chips" style="margin-top:10px">${PRESETS.slice(1).map(([n, s]) => `<button class="chip" data-act="preset" data-s="${s}">${n}</button>`).join("")}</div>
        <div class="f" style="margin-top:10px"><label>วันเริ่มรอบ (ช่องแรก)</label><input type="date" data-bind="shift.custom.anchor" value="${sh.custom.anchor}"></div>`}</div>
  </div><div class="stack">
    <div class="card"><b>เวลาเข้า–เลิกงาน</b><div class="sub">รองรับกะข้ามวัน เช่น 20:00–08:15</div><div class="fgrid" style="margin-top:12px">
      <div class="f"><label>เช้า เริ่ม</label><input type="time" data-time="D:0" value="${times("D")[0]}"></div><div class="f"><label>เช้า เลิก</label><input type="time" data-time="D:1" value="${times("D")[1]}"></div>
      <div class="f"><label>ดึก เริ่ม</label><input type="time" data-time="N:0" value="${times("N")[0]}"></div><div class="f"><label>ดึก เลิก</label><input type="time" data-time="N:1" value="${times("N")[1]}"></div></div></div>
    <div class="card"><b>เปลี่ยนกะเฉพาะวัน</b><div class="sub">แก้แค่วันนั้น รอบกะวันถัดไปไม่เลื่อน</div>
      <div class="list" style="margin-top:6px">${Object.keys(sh.overrides).sort().filter(d => d >= E.addDays(td, -30)).map(d => `<button class="li" data-act="shiftDay" data-d="${d}"><div class="ic" style="background:var(--${sh.overrides[d]})"></div><div class="t"><b>${dLong(d)}</b><small>${SHN[shiftOf(d).base]} → ${SHN[sh.overrides[d]]}</small></div></button>`).join("") || `<div class="empty">ยังไม่มีการสลับกะ · แตะวันในปฏิทินเพื่อแก้</div>`}</div></div>
  </div></div>`;
}
function plAppts() {
  const td = today(), occ = [];
  for (const a of S.planner.appts) for (const d of E.apptOccurrences(a, td, E.addDays(td, 120))) occ.push({ a, d });
  occ.sort((x, y) => (x.d + (x.a.time || "")).localeCompare(y.d + (y.a.time || "")));
  const prio = { 1: "สำคัญมาก", 2: "ปกติ", 3: "ไม่ด่วน" };
  return `<div class="card"><div class="list">${occ.slice(0, 40).map(({ a, d }) => { const sh = shiftOf(d); const clash = a.time && isWork(sh.c) && (crosses(sh.c) ? (a.time >= times(sh.c)[0] || a.time < times(sh.c)[1]) : (a.time >= times(sh.c)[0] && a.time < times(sh.c)[1]));
    return `<button class="li" data-act="editAppt" data-id="${a.id}"><div class="ic" style="background:${a.type === "วันเกิด" ? "var(--sun-soft)" : "var(--lav)"}">${a.type === "วันเกิด" ? "🎂" : a.type === "วันสำคัญ" ? "⭐" : a.type === "งาน" ? "🛠️" : "📌"}</div><div class="t"><b>${esc(a.title)}</b><small>${dLong(d)}${a.time ? " · " + a.time : ""}${a.place ? " · " + esc(a.place) : ""}${a.repeat && a.repeat !== "none" ? " · ซ้ำ" : ""}</small>${clash ? `<small style="color:var(--warn);display:block">ชนเวลา${SHN[sh.c]}</small>` : ""}</div><span class="tag ${a.priority == 1 ? "r" : ""}">${prio[a.priority || 2]}</span></button>`; }).join("") || `<div class="empty"><b>ยังไม่มีนัดหมาย</b>กดปุ่ม + มุมขวาบนเพื่อเพิ่ม</div>`}</div></div>
    <p class="sub" style="margin-top:12px">การเตือนแสดงในหน้า Home ล่วงหน้าตามที่ตั้งไว้ · ถ้าต้องการให้มือถือเด้งเตือนแม้ปิดแอป ให้กด “เพิ่มลง Google Calendar” ในนัดหมายนั้น</p>`;
}
function plTodo() {
  const list = S.planner.todos.slice().sort((a, b) => (a.done - b.done) || (+a.priority || 2) - (+b.priority || 2) || (a.due || "9").localeCompare(b.due || "9"));
  return `<form class="card row" data-form="todoAdd" style="flex-wrap:nowrap"><input type="text" name="title" placeholder="เพิ่มสิ่งที่ต้องทำ…" maxlength="80" required><button class="btn primary sm" type="submit" aria-label="เพิ่ม">${I.plus}</button></form>
    <div class="card" style="margin-top:12px">${list.map(t => `<div class="todo ${t.done ? "done" : ""}"><button class="ck" data-act="todoDone" data-id="${t.id}" aria-label="ทำเสร็จ">${t.done ? I.check.replace('class="i"', 'class="i" style="width:18px;height:18px"') : ""}</button><button style="text-align:left" data-act="todo" data-id="${t.id}"><b>${esc(t.title)}</b><small class="muted" style="display:block;font-size:13px">${t.due ? "ครบ " + dShort(t.due) : "ไม่มีกำหนด"}${t.due && !t.done && t.due < today() ? ' · <span style="color:var(--bad)">เลยกำหนด</span>' : ""}</small></button><span class="tag ${t.priority == 1 ? "r" : t.priority == 3 ? "" : "y"}">${{ 1: "ด่วน", 2: "ปกติ", 3: "ไม่ด่วน" }[t.priority || 2]}</span></div>`).join("") || `<div class="empty"><b>ว่างเปล่า สบายใจ</b>เพิ่มงานด้านบน</div>`}</div>`;
}

/* ───────── PROFILE ───────── */
function pProfile() {
  const w = S.journey.weights;
  return `${sampleBanner()}<div class="top"><button class="avatar" style="width:64px;height:64px;font-size:26px">${esc((S.profile.name || "M").slice(0, 1).toUpperCase())}</button><div class="who"><h1 class="hi">${esc(S.profile.name || "ตั้งชื่อของคุณ")}</h1><div class="sub" data-sync>${syncHTML()}</div></div></div>
  <div class="mgrid"><div class="stack">
    <div class="card"><b>ข้อมูลส่วนตัว</b><div class="fgrid" style="margin-top:12px"><div class="f full"><label>ชื่อ</label><input type="text" maxlength="30" data-bind="profile.name" value="${esc(S.profile.name)}" placeholder="ชื่อเล่น"></div>
      <div class="f"><label>ทีม (ตารางกะ)</label><select data-bind="profile.team">${"ABC".split("").map(t => `<option ${S.profile.team === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="f"><label>วันเงินเดือนออก</label><input type="number" min="1" max="31" data-bind="profile.payday" value="${S.profile.payday}"></div></div></div>
    <div class="card"><b>ตั้งค่า</b><div class="list" style="margin-top:4px">
      ${[["💼", "เงินเดือนและสูตร OT", "money", "salary"], ["🧾", "ภาษีและค่าลดหย่อน", "money", "salary"], ["🗓️", "ตารางกะ", "planner", "shift"], ["🎯", "เป้าหมายและน้ำหนัก Journey", "journey", ""], ["💳", "หนี้สิน", "money", "debt"], ["🛒", "งบรายจ่าย", "money", "expense"]].map(([ic, t, tab, sub]) => `<button class="li" data-act="goSet" data-tab="${tab}" data-sub="${sub}"><div class="ic">${ic}</div><div class="t"><b>${t}</b></div>${I.r}</button>`).join("")}</div></div>
    <div class="card"><b>การแจ้งเตือน</b><p class="sub" style="margin-top:6px">แอปนี้เปิดผ่านเว็บของ Claude จึงส่งการแจ้งเตือนเด้งบนมือถือเองไม่ได้ ตอนนี้ทำได้ 2 แบบ:</p>
      <div class="list"><div class="li"><div class="ic">🔔</div><div class="t"><b>เตือนในแอป</b><small>นัดหมาย บิล หนี้ใกล้ครบกำหนด แสดงบนหน้า Home ตามเวลาที่ตั้ง</small></div><span class="tag g">เปิดอยู่</span></div>
      <div class="li"><div class="ic">📲</div><div class="t"><b>เตือนจริงบนมือถือ</b><small>เพิ่มนัดหมาย/กะลง Google Calendar แล้วให้ปฏิทินในมือถือเตือน หรือส่งออกไฟล์ปฏิทินด้านล่าง</small></div></div></div>
      <button class="btn ghost sm" style="margin-top:8px" data-act="export" data-k="gcal">${I.dl} ไฟล์ Google Calendar (กะ + นัดหมาย 3 เดือน)</button></div>
  </div><div class="stack">
    <div class="card"><b>ข้อมูลของฉัน</b><p class="sub" style="margin-top:6px">ข้อมูลเก็บในบัญชี Claude ของคุณ (เห็นคนเดียว) และสำรองในเครื่องนี้</p>
      <div class="row" style="margin-top:12px"><button class="btn primary sm" data-act="export" data-k="json">${I.dl} สำรองข้อมูล (.json)</button>
      <label class="btn ghost sm">${I.file} นำเข้าไฟล์สำรอง<input type="file" accept=".json,application/json" data-import hidden></label><button class="btn ghost sm" data-act="export" data-k="xlsx">${I.dl} Excel ทั้งหมด</button></div>
      <p class="hint" style="margin-top:8px;font-size:12px;color:var(--ink-3)">นำเข้าไฟล์จาก OT Scan (otscan:v1) ได้ด้วย — ระบบจะรวมรอบ OT เข้ามา</p></div>
    <div class="card"><b>ลองใช้ข้อมูลตัวอย่าง</b><p class="sub" style="margin-top:6px">ดูทุกหน้าแบบมีข้อมูล โดยไม่แตะข้อมูลจริงและไม่บันทึก</p>
      <button class="btn ${sampleMode() ? "dark" : "ghost"} sm" style="margin-top:10px" data-act="${sampleMode() ? "sampleOff" : "sampleOn"}">${sampleMode() ? "ออกจากโหมดตัวอย่าง" : "เปิดโหมดตัวอย่าง"}</button></div>
    <div class="card"><b>ประวัติการเปลี่ยนแปลง</b><div class="list">${S.audit.slice(0, 12).map(a => `<div class="li"><div class="t"><b style="font-weight:500;white-space:normal">${esc(a.msg)}</b><small>${new Date(a.at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</small></div></div>`).join("") || `<div class="empty">ยังไม่มีการเปลี่ยนแปลง</div>`}</div></div>
    <div class="card"><b>ล้างข้อมูล</b><p class="sub" style="margin-top:6px">ลบข้อมูลทั้งหมดในแอปนี้ แนะนำให้สำรองก่อน</p><button class="btn danger sm" style="margin-top:10px" data-act="reset">ล้างข้อมูลทั้งหมด</button></div>
  </div></div>`;
}

/* ───────── sheets (forms) ───────── */
const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${String(v) === String(k) ? "selected" : ""}>${l}</option>`).join("");
function sheetDebt(id) {
  const d = S.debts.find(x => x.id === id) || { type: "card", method: "card", apr: 16, minPct: 8, minAmount: 1000, dueDay: 5, startDate: today() };
  openSheet(`<form data-form="debt"><div class="grab"></div><h3>${id ? "แก้ไขหนี้" : "เพิ่มหนี้"}</h3><div class="fgrid" style="margin-top:12px">
    <div class="f"><label>ประเภท</label><select name="type" data-act-change="debtType">${opt(E.DEBT_TYPES, d.type)}</select></div>
    <div class="f"><label>วิธีคิดดอกเบี้ย</label><select name="method">${opt({ card: "บัตร (รายวัน/ขั้นต่ำ)", reducing: "ลดต้นลดดอก", flat: "Flat rate (เช่าซื้อ)" }, d.method)}</select></div>
    <div class="f"><label>ธนาคาร/ผู้ให้กู้</label><input type="text" name="lender" value="${esc(d.lender || "")}" maxlength="40" placeholder="เช่น กสิกรไทย"></div>
    <div class="f"><label>ชื่อสินเชื่อ</label><input type="text" name="name" required value="${esc(d.name || "")}" maxlength="40" placeholder="เช่น บัตร K-Cash"></div>
    <div class="f"><label>ยอดหนี้เริ่มต้น</label><input type="number" name="principal" min="0" step="any" required value="${d.principal || ""}"></div>
    <div class="f"><label>ยอดคงเหลือตอนนี้</label><input type="number" name="balance" min="0" step="any" value="${id ? d.balance : ""}" placeholder="เว้นว่าง = ยอดเริ่มต้น"></div>
    <div class="f"><label>ดอกเบี้ยต่อปี (%)</label><input type="number" name="apr" min="0" max="100" step="any" required value="${d.apr}"></div>
    <div class="f"><label>วันครบกำหนดชำระ</label><input type="number" name="dueDay" min="1" max="31" required value="${d.dueDay}"></div>
    <div class="f"><label>ยอดผ่อนต่อเดือน</label><input type="number" name="monthlyPay" min="0" step="any" value="${d.monthlyPay || ""}" placeholder="สินเชื่อลดต้นลดดอก"></div>
    <div class="f"><label>จำนวนงวดทั้งหมด</label><input type="number" name="termMonths" min="1" step="1" value="${d.termMonths || ""}" placeholder="เช่าซื้อ / flat"></div>
    <div class="f"><label>ขั้นต่ำ (%)</label><input type="number" name="minPct" min="0" max="100" step="any" value="${d.minPct ?? 8}"></div>
    <div class="f"><label>ขั้นต่ำอย่างน้อย (บาท)</label><input type="number" name="minAmount" min="0" step="any" value="${d.minAmount ?? 0}"></div>
    <div class="f full"><label>วันเริ่มสัญญา / ชำระล่าสุด</label><input type="date" name="startDate" value="${d.startDate || today()}"></div></div>
    <p class="hint" style="margin-top:8px;font-size:12px;color:var(--ink-3)">ขั้นต่ำบัตรเครดิตตั้งตามสัญญาของคุณ · Flat: งวด = (เงินต้น + เงินต้น×ดอกเบี้ย×ปี) ÷ งวด</p>
    <div class="acts">${id ? `<button type="button" class="btn danger" data-act="debtDel" data-id="${id}">ลบ</button>` : ""}<button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
      const v = formData(f); if (!v.name.trim()) return toast("ใส่ชื่อสินเชื่อ");
      const rec = Object.assign(S.debts.find(x => x.id === id) || { id: E.uid(), createdAt: Date.now() }, { type: v.type, method: v.method, lender: v.lender.trim(), name: v.name.trim(), principal: num(v.principal), balance: v.balance === "" ? num(v.principal) : num(v.balance), apr: num(v.apr), dueDay: Math.min(31, Math.max(1, num(v.dueDay))), monthlyPay: num(v.monthlyPay), termMonths: num(v.termMonths), minPct: num(v.minPct), minAmount: num(v.minAmount), startDate: v.startDate });
      if (rec.method === "flat" && !rec.termMonths) return toast("Flat rate ต้องใส่จำนวนงวด");
      if (rec.method === "reducing" && !rec.monthlyPay) return toast("ใส่ยอดผ่อนต่อเดือน");
      if (rec.method === "reducing" && rec.monthlyPay <= rec.balance * rec.apr / 1200) toast("ยอดผ่อนน้อยกว่าดอกเบี้ย หนี้จะไม่ลด");
      if (!id) S.debts.push(rec); audit("debt", `${id ? "แก้" : "เพิ่ม"}หนี้ ${rec.name} ${baht(rec.balance)}`); closeSheet(); commit();
    });
}
function sheetPay(id) {
  const d = S.debts.find(x => x.id === id); if (!d) return;
  const due = E.debtDue(d);
  const draw = (amt, date) => { const pv = E.previewPayment(S, d, amt, date); return `<div class="kv" style="margin-top:12px"><div><small>เป็นดอกเบี้ย</small><b>${baht(pv.interest, 2)}</b></div><div><small>ตัดเงินต้น</small><b>${baht(pv.principal, 2)}</b></div><div><small>ยอดคงเหลือหลังจ่าย</small><b>${baht(pv.after, 2)}</b></div></div>`; };
  openSheet(`<form data-form="pay"><div class="grab"></div><h3>จ่าย ${esc(d.name)}</h3><div class="sub">คงเหลือ ${baht(d.balance)} · งวดนี้ ${baht(due)}</div>
    <div class="fgrid" style="margin-top:12px"><div class="f"><label>จำนวนเงิน</label><input type="number" name="amount" min="1" step="any" required value="${due}" data-act-input="payPv"></div><div class="f"><label>วันที่จ่าย</label><input type="date" name="date" required value="${today()}" data-act-input="payPv"></div></div>
    <div id="pv">${draw(due, today())}</div>
    <div class="warnbox" style="margin-top:12px">ยอดหนี้จะเปลี่ยนเมื่อกด “ยืนยันการจ่าย” เท่านั้น</div>
    <div class="acts"><button type="button" class="btn ghost" data-act="closeSheet">ยกเลิก</button><button class="btn primary" type="submit">ยืนยันการจ่าย</button></div></form>`, f => {
      const v = formData(f), amt = num(v.amount); if (amt <= 0) return toast("ใส่จำนวนเงิน");
      const pv = E.previewPayment(S, d, amt, v.date); E.applyPayment(S, d.id, pv); audit("pay", `จ่าย ${d.name} ${baht(amt)} (ต้น ${baht(pv.principal)} ดอก ${baht(pv.interest, 2)})`);
      closeSheet(); commit(); toast(pv.after <= 0 ? "ปิดหนี้บัญชีนี้แล้ว! 🎉" : "บันทึกการจ่ายแล้ว"); if (pv.after <= 0) confetti();
    });
  sheetPay.redraw = () => { const f = $("#sheetBody form"); const v = formData(f); $("#pv").innerHTML = draw(num(v.amount), v.date || today()); };
}
function sheetExpItem(id, kind) {
  const e = S.expenses.find(x => x.id === id) || { kind: kind || "fixed", cat: kind === "variable" ? "food" : "home", dueDay: 1 };
  openSheet(`<form data-form="expItem"><div class="grab"></div><h3>${id ? "แก้ไข" : "เพิ่ม"}${e.kind === "fixed" ? "ค่าใช้จ่ายคงที่" : "งบผันแปร"}</h3><div class="fgrid" style="margin-top:12px">
    <div class="f full"><label>ชื่อ</label><input type="text" name="name" required maxlength="40" value="${esc(e.name || "")}" placeholder="${e.kind === "fixed" ? "เช่น ค่าห้อง, ค่าไฟบ้านระยอง" : "เช่น ค่าอาหาร"}"></div>
    <div class="f"><label>หมวด</label><select name="cat">${opt(E.EXP_CATS, e.cat)}</select></div>
    <div class="f"><label>ประเภท</label><select name="kind">${opt({ fixed: "คงที่ทุกเดือน", variable: "ผันแปร (ตั้งงบ)" }, e.kind)}</select></div>
    <div class="f"><label>${e.kind === "fixed" ? "จำนวนต่อเดือน" : "งบต่อเดือน"}</label><input type="number" name="amount" min="0" step="any" required value="${e.amount || ""}"></div>
    <div class="f"><label>วันครบกำหนด</label><input type="number" name="dueDay" min="1" max="31" value="${e.dueDay || 1}"></div></div>
    <div class="acts">${id ? `<button type="button" class="btn danger" data-act="expDel" data-id="${id}">ลบ</button>` : ""}<button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
      const v = formData(f); const rec = Object.assign(S.expenses.find(x => x.id === id) || { id: E.uid(), active: true }, { name: v.name.trim(), cat: v.cat, kind: v.kind, amount: num(v.amount), dueDay: Math.min(31, Math.max(1, num(v.dueDay) || 1)) });
      if (!rec.name) return toast("ใส่ชื่อ"); if (!id) S.expenses.push(rec); audit("expense", `${id ? "แก้" : "เพิ่ม"} ${rec.name} ${baht(rec.amount)}`); closeSheet(); commit();
    });
}
function sheetSpend(id) {
  const l = S.spend.find(x => x.id === id) || { date: view.expMonth === E.monthKey(today()) ? today() : view.expMonth + "-01", cat: "food" };
  openSheet(`<form data-form="spend"><div class="grab"></div><h3>${id ? "แก้รายจ่าย" : "จดรายจ่าย"}</h3><div class="fgrid" style="margin-top:12px">
    <div class="f full"><label>จำนวนเงิน</label><input type="number" name="amount" min="0.01" step="any" required inputmode="decimal" value="${l.amount || ""}" style="font-size:24px;font-weight:700"></div>
    <div class="f"><label>หมวด</label><select name="cat">${opt(E.EXP_CATS, l.cat)}</select></div>
    <div class="f"><label>วันที่</label><input type="date" name="date" required value="${l.date}"></div>
    <div class="f full"><label>เป็นของรายการ</label><select name="itemId"><option value="">— ไม่ผูก (ใช้จ่ายทั่วไป)</option>${S.expenses.map(e => `<option value="${e.id}" ${l.itemId === e.id ? "selected" : ""}>${esc(e.name)} (${e.kind === "fixed" ? "คงที่" : "งบผันแปร"})</option>`).join("")}</select><span class="hint">ผูกกับบิลคงที่ = ไม่หักซ้ำ · ผ่อนหนี้ให้บันทึกที่หน้า หนี้สิน</span></div>
    <div class="f full"><label>บันทึก</label><input type="text" name="note" maxlength="60" value="${esc(l.note || "")}" placeholder="เช่น ข้าวเที่ยง"></div></div>
    <div class="acts">${id ? `<button type="button" class="btn danger" data-act="spendDel" data-id="${id}">ลบ</button>` : ""}<button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
      const v = formData(f), amt = num(v.amount); if (amt <= 0) return toast("ใส่จำนวนเงิน");
      const dup = !id && S.spend.find(x => x.date === v.date && x.amount === amt && x.cat === v.cat && Date.now() - (x.at || 0) < 120000);
      if (dup && !f.dataset.ok) { f.dataset.ok = 1; return toast("รายการนี้เหมือนเพิ่งจดไป — กดบันทึกอีกครั้งถ้าตั้งใจ"); }
      const rec = Object.assign(S.spend.find(x => x.id === id) || { id: E.uid(), at: Date.now() }, { amount: amt, cat: v.cat, date: v.date, itemId: v.itemId || null, note: v.note.trim() });
      if (!id) S.spend.push(rec); closeSheet(); commit(); toast("บันทึกแล้ว");
    });
}
const ICONS = ["🎯", "📷", "🚗", "📱", "💻", "✈️", "🏠", "🛵", "🎸", "🛟", "💍", "🎓"];
function sheetGoal(id) {
  const g = S.goals.find(x => x.id === id) || { icon: "🎯", priority: 2 };
  const gi = id ? E.goalInfo(g) : null;
  openSheet(`<form data-form="goal"><div class="grab"></div><h3>${id ? esc(g.name) : "เป้าหมายใหม่"}</h3>
    ${id ? `<div class="sub">${baht(gi.saved)} จาก ${baht(gi.target)} · ${Math.round(gi.pct * 100)}%</div>
      <div class="card flat" style="margin-top:12px;padding:14px"><b>เก็บเงินเข้าเป้าหมาย</b><div class="row" style="margin-top:8px;flex-wrap:nowrap"><input type="number" id="gAdd" min="1" step="any" placeholder="จำนวนเงิน" inputmode="decimal"><button type="button" class="btn primary sm" data-act="goalAdd" data-id="${id}">เก็บ</button></div>
      <div class="list" style="margin-top:6px">${(g.contributions || []).slice(-4).reverse().map(c => `<div class="li"><div class="t"><small>${dShort(c.date)}</small></div><div class="v">+${baht(c.amount)}</div><button type="button" class="link" data-act="contribDel" data-g="${id}" data-c="${c.id}">ลบ</button></div>`).join("")}</div></div>` : ""}
    <div class="f" style="margin-top:12px"><label>ไอคอน</label><div class="row" style="gap:6px">${ICONS.map(i => `<label style="cursor:pointer"><input type="radio" name="icon" value="${i}" ${g.icon === i ? "checked" : ""} hidden><span class="ic" style="${g.icon === i ? "background:var(--sun)" : ""}">${i}</span></label>`).join("")}<label class="ic" style="cursor:pointer" title="รูปสินค้า">📎<input type="file" accept="image/*" data-goalimg hidden></label></div>${g.img ? `<img src="${g.img}" alt="" style="width:72px;height:72px;border-radius:18px;object-fit:cover;margin-top:8px">` : ""}<input type="hidden" name="img" value="${g.img || ""}"></div>
    <div class="fgrid" style="margin-top:12px">
    <div class="f full"><label>ชื่อเป้าหมาย</label><input type="text" name="name" required maxlength="40" value="${esc(g.name || "")}" placeholder="เช่น กล้อง Fuji X-T50"></div>
    <div class="f"><label>ราคาเป้าหมาย</label><input type="number" name="target" min="1" step="any" required value="${g.target || ""}"></div>
    <div class="f"><label>มีอยู่แล้ว</label><input type="number" name="have" min="0" step="any" value="${g.have || ""}"></div>
    <div class="f"><label>ตั้งใจเก็บ/เดือน</label><input type="number" name="monthly" min="0" step="any" value="${g.monthly || ""}"></div>
    <div class="f"><label>วันเป้าหมาย</label><input type="date" name="deadline" value="${g.deadline || ""}"></div>
    <div class="f"><label>ความสำคัญ</label><select name="priority">${opt({ 1: "สูง", 2: "กลาง", 3: "ต่ำ" }, g.priority)}</select></div>
    <div class="f"><label>เงินสำรองฉุกเฉิน</label><select name="isEmergency">${opt({ 0: "ไม่ใช่", 1: "ใช่" }, g.isEmergency ? 1 : 0)}</select></div></div>
    <div class="acts">${id ? `<button type="button" class="btn danger" data-act="goalDel" data-id="${id}">ลบ</button>` : ""}<button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
      const v = formData(f); if (!v.name.trim()) return toast("ใส่ชื่อเป้าหมาย"); if (num(v.target) <= 0) return toast("ใส่ราคาเป้าหมาย");
      const rec = Object.assign(S.goals.find(x => x.id === id) || { id: E.uid(), contributions: [], createdAt: Date.now() }, { name: v.name.trim(), icon: v.icon || "🎯", img: v.img || null, target: num(v.target), have: num(v.have), monthly: num(v.monthly), deadline: v.deadline || null, priority: +v.priority, isEmergency: v.isEmergency === "1" });
      if (rec.isEmergency) S.goals.forEach(x => { if (x !== rec) x.isEmergency = false; });
      if (!id) S.goals.push(rec); audit("goal", `${id ? "แก้" : "สร้าง"}เป้าหมาย ${rec.name}`); closeSheet(); commit();
    });
}
function sheetAppt(id, date) {
  const a = S.planner.appts.find(x => x.id === id) || { date: date || view.sel, type: "นัดหมาย", priority: 2, remind: [1440, 30], repeat: "none" };
  const rem = [[1440, "ก่อน 1 วัน"], [180, "ก่อน 3 ชม."], [30, "ก่อน 30 นาที"]];
  const custom = (a.remind || []).filter(m => ![1440, 180, 30].includes(m))[0];
  let gcal = ""; if (id && a.date) { const s = a.date.replace(/-/g, "") + (a.time ? "T" + a.time.replace(":", "") + "00" : ""), e = a.time ? a.date.replace(/-/g, "") + "T" + a.time.replace(":", "") + "00" : E.addDays(a.date, 1).replace(/-/g, "");
    gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(a.title)}&dates=${s}/${e}&ctz=Asia/Bangkok&location=${encodeURIComponent(a.place || "")}&details=${encodeURIComponent(a.note || "")}${a.repeat && a.repeat !== "none" ? "&recur=RRULE:FREQ=" + a.repeat.toUpperCase() : ""}`; }
  openSheet(`<form data-form="appt"><div class="grab"></div><h3>${id ? "แก้นัดหมาย" : "นัดหมายใหม่"}</h3><div class="fgrid" style="margin-top:12px">
    <div class="f full"><label>ชื่อกิจกรรม</label><input type="text" name="title" required maxlength="60" value="${esc(a.title || "")}" placeholder="เช่น เปลี่ยนเหล็กจัดฟัน"></div>
    <div class="f"><label>วันที่</label><input type="date" name="date" required value="${a.date}"></div><div class="f"><label>เวลา</label><input type="time" name="time" value="${a.time || ""}"></div>
    <div class="f full"><label>สถานที่</label><input type="text" name="place" maxlength="80" value="${esc(a.place || "")}"></div>
    <div class="f"><label>ประเภท</label><select name="type">${opt({ "นัดหมาย": "นัดหมาย", "วันเกิด": "วันเกิด", "วันสำคัญ": "วันสำคัญ", "ส่วนตัว": "กิจกรรมส่วนตัว", "งาน": "งาน" }, a.type)}</select></div>
    <div class="f"><label>ความสำคัญ</label><select name="priority">${opt({ 1: "สำคัญมาก", 2: "ปกติ", 3: "ไม่ด่วน" }, a.priority)}</select></div>
    <div class="f"><label>ทำซ้ำ</label><select name="repeat">${opt({ none: "ไม่ซ้ำ", daily: "ทุกวัน", weekly: "ทุกสัปดาห์", monthly: "ทุกเดือน", yearly: "ทุกปี" }, a.repeat)}</select></div>
    <div class="f"><label>เตือนเองก่อน (นาที)</label><input type="number" name="customRemind" min="1" value="${custom || ""}" placeholder="เช่น 120"></div>
    <div class="f full"><label>เตือน</label><div class="row" style="gap:8px">${rem.map(([m, l]) => `<label class="chip" style="display:inline-flex;align-items:center;gap:6px;height:40px"><input type="checkbox" name="r${m}" ${(a.remind || []).includes(m) ? "checked" : ""} style="accent-color:#E9A300">${l}</label>`).join("")}</div></div>
    <div class="f full"><label>รายละเอียด</label><textarea name="note" maxlength="300">${esc(a.note || "")}</textarea></div></div>
    ${gcal ? `<a class="btn ghost sm" style="margin-top:12px;text-decoration:none" href="${gcal}" target="_blank" rel="noopener">${I.ext} เพิ่มลง Google Calendar</a>` : ""}
    <div class="acts">${id ? `<button type="button" class="btn danger" data-act="apptDel" data-id="${id}">ลบ</button>` : ""}<button class="btn primary" type="submit">บันทึก</button></div></form>`, f => {
      const v = formData(f); if (!v.title.trim()) return toast("ใส่ชื่อกิจกรรม");
      const remind = rem.filter(([m]) => v["r" + m]).map(([m]) => m); if (num(v.customRemind) > 0) remind.push(num(v.customRemind));
      const rec = Object.assign(S.planner.appts.find(x => x.id === id) || { id: E.uid() }, { title: v.title.trim(), date: v.date, time: v.time, place: v.place.trim(), type: v.type, priority: +v.priority, repeat: v.repeat, remind, note: v.note.trim() });
      if (!id) S.planner.appts.push(rec); audit("appt", `${id ? "แก้" : "เพิ่ม"}นัด ${rec.title} ${dShort(rec.date)}`); closeSheet(); commit(); toast("บันทึกนัดหมายแล้ว");
    });
}
function sheetTodo(id) {
  const t = S.planner.todos.find(x => x.id === id); if (!t) return;
  openSheet(`<form data-form="todo"><div class="grab"></div><h3>แก้ To-do</h3><div class="fgrid" style="margin-top:12px"><div class="f full"><label>รายการ</label><input type="text" name="title" required maxlength="80" value="${esc(t.title)}"></div>
    <div class="f"><label>ครบกำหนด</label><input type="date" name="due" value="${t.due || ""}"></div><div class="f"><label>ความสำคัญ</label><select name="priority">${opt({ 1: "ด่วน", 2: "ปกติ", 3: "ไม่ด่วน" }, t.priority || 2)}</select></div></div>
    <div class="acts"><button type="button" class="btn danger" data-act="todoDel" data-id="${id}">ลบ</button><button class="btn primary" type="submit">บันทึก</button></div></form>`, f => { const v = formData(f); Object.assign(t, { title: v.title.trim() || t.title, due: v.due || null, priority: +v.priority }); closeSheet(); commit(); });
}
function sheetShiftDay(d) {
  const sh = shiftOf(d);
  openSheet(`<div class="grab"></div><h3>${dLong(d)}</h3><div class="sub">ตามตาราง: ${SHN[sh.base]} · แก้เฉพาะวันนี้ วันอื่นไม่เลื่อน</div>
    <div class="stack" style="margin-top:14px">${["", "D", "N", "H"].map(c => `<button class="btn ${(!c && !sh.sw) || (c && sh.sw && sh.c === c) ? "dark" : "ghost"} wide" data-act="setOv" data-d="${d}" data-c="${c}">${c ? SHN[c] + (isWork(c) ? " " + times(c).join("–") : "") : "ตามตาราง (" + SHN[sh.base] + ")"}</button>`).join("")}</div>`);
}
function sheetCp(i) {
  const jp = E.journeyProgress(S), cp = E.CHECKPOINTS[i], ok = jp.reached[cp.id];
  openSheet(`<div class="grab"></div><div style="text-align:center"><div style="font-size:52px">${i === 5 ? "🏔️" : ok ? "⛺" : "🔒"}</div><h3>${cp.name}</h3><div class="sub">${cp.sub}</div>
    <div class="tag ${ok ? "g" : "y"}" style="margin-top:12px">${ok ? "ผ่านแล้ว" : "ยังไม่ถึง"}</div><p style="margin-top:14px">${cpHint(cp.id, jp)}</p></div>
    <div class="acts"><button class="btn primary" data-act="closeSheet">ไปต่อ!</button></div>`);
}
function sheetWeights() {
  const w = S.journey.weights;
  openSheet(`<form data-form="weights"><div class="grab"></div><h3>น้ำหนักความก้าวหน้า</h3><div class="sub">กำหนดเองว่าอะไรสำคัญต่อการขึ้นยอดเขา</div><div class="fgrid" style="margin-top:12px">
    ${[["debt", "ลดหนี้"], ["emergency", "เงินสำรองฉุกเฉิน"], ["goals", "เป้าหมายซื้อของ"], ["habits", "ภารกิจ"]].map(([k, l]) => `<div class="f"><label>${l}</label><input type="number" name="${k}" min="0" max="100" value="${w[k]}"></div>`).join("")}</div>
    <div class="acts"><button class="btn primary" type="submit">บันทึก</button></div></form>`, f => { const v = formData(f); for (const k in v) S.journey.weights[k] = Math.max(0, num(v[k])); closeSheet(); commit(); });
}

/* ───────── sample data (kept apart from real data) ───────── */
function buildSample() {
  const s = E.defaultState(), td = today(), mk = E.monthKey(td), pk = E.periodKeyFor(td);
  s.profile.name = "จิล (ตัวอย่าง)"; s.profile.team = S.profile.team || "C";
  Object.assign(s.pay, { salary: 18000, living: 1500, position: 1000, rent: 1500, env: 500, diligence: 700, pvdRate: .03 });
  const mkOT = (a, b, c) => ({ values: { h1: null, h15: { h: a, m: 30 }, h3: { h: b, m: 0 }, h15p: null, h2p: { h: c, m: 0 }, other: null, meal: { v: 1100 }, mealOt: { v: 350 }, shift: { v: 1320 } }, source: {}, at: Date.now(), history: [] });
  s.ot[E.addMonths(pk, -2)] = mkOT(18, 8, 0); s.ot[E.addMonths(pk, -1)] = mkOT(22, 12, 8); s.ot[pk] = mkOT(14, 4, 0);
  s.debts = [{ id: "d1", name: "บัตรเครดิต", lender: "ธนาคารตัวอย่าง", type: "card", method: "card", principal: 30000, balance: 24500, apr: 16, minPct: 8, minAmount: 1000, dueDay: 5, startDate: E.addDays(td, -40), createdAt: 0 },
             { id: "d2", name: "สินเชื่อส่วนบุคคล", lender: "นอนแบงก์ตัวอย่าง", type: "personal", method: "reducing", principal: 50000, balance: 41000, apr: 22, monthlyPay: 2500, dueDay: 20, startDate: E.addDays(td, -60), createdAt: 0 }];
  s.debtPayments = [{ id: "p1", debtId: "d1", date: `${mk}-05`, month: mk, amount: 2600, interest: 330, principal: 2270, before: 26770, after: 24500 }];
  s.expenses = [{ id: "e1", name: "ค่าห้อง", cat: "home", kind: "fixed", amount: 4500, dueDay: 1 }, { id: "e2", name: "ค่าไฟ", cat: "power", kind: "fixed", amount: 900, dueDay: 15 }, { id: "e3", name: "ค่าโทรศัพท์", cat: "phone", kind: "fixed", amount: 499, dueDay: 28 }, { id: "e4", name: "ค่าอาหาร", cat: "food", kind: "variable", amount: 5500 }, { id: "e5", name: "ค่าน้ำมัน", cat: "fuel", kind: "variable", amount: 1800 }];
  s.spend = [{ id: "s1", date: `${mk}-01`, amount: 4500, cat: "home", itemId: "e1" }, { id: "s2", date: `${mk}-03`, amount: 320, cat: "food", itemId: "e4", note: "ข้าว + กาแฟ" }, { id: "s3", date: `${mk}-07`, amount: 600, cat: "fuel", itemId: "e5" }, { id: "s4", date: td, amount: 145, cat: "food", itemId: "e4", note: "ข้าวเที่ยง" }];
  s.goals = [{ id: "g1", name: "เงินสำรองฉุกเฉิน", icon: "🛟", target: 30000, have: 8000, monthly: 1500, priority: 1, isEmergency: true, contributions: [{ id: "c1", date: `${mk}-02`, amount: 1500 }] },
             { id: "g2", name: "กล้องถ่ายรูป", icon: "📷", target: 28000, have: 6000, monthly: 1000, priority: 2, deadline: E.addDays(td, 240), contributions: [] }];
  s.planner.appts = [{ id: "a1", title: "เปลี่ยนเหล็กจัดฟัน", date: E.addDays(td, 3), time: "12:00", place: "คลินิกทันตกรรม", type: "นัดหมาย", priority: 1, remind: [1440, 180], repeat: "none" }];
  s.planner.todos = [{ id: "t1", title: "ยื่นใบลาพักร้อน", due: E.addDays(td, 2), priority: 1, done: false }];
  return s;
}

/* ───────── export ───────── */
async function saveFile(name, data) {
  const dl = window.claude?.use ? await claude.use("downloads") : null;
  if (!dl) return toast("ดาวน์โหลดได้เมื่อเปิดแอปจากลิงก์ claude.ai");
  try { await dl.save({ filename: name, data }); toast("ส่งไฟล์แล้ว"); } catch (e) { if (e?.code !== "declined") toast("ส่งออกไม่สำเร็จ"); }
}
async function doExport(k) {
  const stamp = today();
  try {
    if (k === "json") return saveFile(`moneyquest-backup-${stamp}.json`, JSON.stringify(S, null, 1));
    if (k === "gcal") {
      const us = d => { const [y, m, dd] = d.split("-"); return `${m}/${dd}/${y}`; }, am = hm => { let [h, m] = hm.split(":").map(Number); const p = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${E.pad(m)} ${p}`; };
      const out = [["Subject", "Start Date", "Start Time", "End Date", "End Time", "All Day Event", "Description", "Location"]];
      for (let i = 0; i < 92; i++) { const d = E.addDays(stamp, i), c = shiftOf(d).c; if (isWork(c)) out.push([SHN[c] + " · Team " + S.profile.team, us(d), am(times(c)[0]), us(crosses(c) ? E.addDays(d, 1) : d), am(times(c)[1]), "False", "", ""]);
        for (const a of S.planner.appts) if (E.apptOccurrences(a, d, d).length) out.push([a.title, us(d), a.time ? am(a.time) : "", us(d), a.time ? am(a.time) : "", a.time ? "False" : "True", a.note || "", a.place || ""]); }
      return saveFile(`moneyquest-calendar-${stamp}.csv`, "﻿" + out.map(r => r.map(c => /[",\n]/.test(c) ? `"${String(c).replace(/"/g, '""')}"` : c).join(",")).join("\r\n"));
    }
    const mk = E.monthKey(stamp), months = Array.from({ length: 12 }, (_, i) => E.addMonths(mk, -11 + i)), rows = months.map(monthRow);
    if (k === "xlsx") {
      toast("กำลังเตรียมไฟล์…"); await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
      const wb = XLSX.utils.book_new(), add = (name, aoa) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
      add("สรุปรายเดือน", [["เดือน", "รายได้รวม", "รับสุทธิ", "OT", "รายจ่ายจริง", "ผ่อนหนี้", "ดอกเบี้ย", "ออม"], ...rows.map(r => [r.mk, r.gross, r.net, r.ot, r.exp, r.debtPaid, r.interest, r.saved])]);
      add("OT", [["รอบ", ...E.OT_FIELDS.map(f => f.label), "ค่า OT", "เบี้ยเลี้ยง", "รวม"], ...Object.keys(S.ot).sort().map(k2 => { const r = S.ot[k2], c = E.otCalc(r.values, S.pay); return [k2, ...E.OT_FIELDS.map(f => { const v = r.values[f.k]; return v == null ? "" : f.kind === "time" ? `${v.h}:${E.pad(v.m)}` : v.v; }), c.otPay, c.allowances, c.total]; })]);
      add("หนี้", [["ชื่อ", "ผู้ให้กู้", "ประเภท", "ดอกเบี้ย%", "ยอดเริ่ม", "คงเหลือ", "งวด/เดือน"], ...S.debts.map(d => [d.name, d.lender, E.DEBT_TYPES[d.type], d.apr, d.principal, d.balance, E.debtDue(d)])]);
      add("การจ่ายหนี้", [["วันที่", "หนี้", "จำนวน", "ดอกเบี้ย", "เงินต้น", "คงเหลือ"], ...S.debtPayments.map(p => [p.date, (S.debts.find(d => d.id === p.debtId) || {}).name, p.amount, p.interest, p.principal, p.after])]);
      add("รายจ่าย", [["วันที่", "หมวด", "รายการ", "บันทึก", "จำนวน"], ...S.spend.slice().sort((a, b) => a.date.localeCompare(b.date)).map(l => [l.date, E.EXP_CATS[l.cat], (S.expenses.find(e => e.id === l.itemId) || {}).name || "", l.note || "", l.amount])]);
      add("เป้าหมาย", [["ชื่อ", "เป้า", "เก็บแล้ว", "%", "ต่อเดือน", "วันเป้าหมาย"], ...S.goals.map(g => { const gi = E.goalInfo(g); return [g.name, gi.target, gi.saved, Math.round(gi.pct * 100), g.monthly, g.deadline || ""]; })]);
      const tx = E.annualTax(S, new Date().getFullYear());
      add("ภาษี", [["รายการ", "สูตร", "จำนวน"], ...tx.steps.map(s => [s.label, s.formula, s.value])]);
      return saveFile(`moneyquest-${stamp}.xlsx`, new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]));
    }
    if (k === "pdf") {
      toast("กำลังเตรียม PDF…");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"); await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const st = $("#pdfstage"); const tx = E.annualTax(S, new Date().getFullYear()), av = E.available(S, mk);
      st.innerHTML = `<div style="padding:40px;font-family:var(--font);color:#1D1A16"><div style="font-size:28px;font-weight:800">MONEY QUEST · รายงาน</div><div style="color:#6A645A;margin-bottom:18px">${esc(S.profile.name)} · ${dLong(stamp)}</div>
        <div style="display:flex;gap:12px;margin-bottom:18px">${[["เงินเหลือใช้จริง", av.safe], ["รับสุทธิเดือนนี้", av.net], ["หนี้คงเหลือ", E.sum(S.debts.map(d => +d.balance))], ["ภาษีทั้งปี", tx.liability]].map(([l, v]) => `<div style="flex:1;background:#F4F1EA;border-radius:16px;padding:14px"><div style="font-size:12px;color:#6A645A">${l}</div><div style="font-size:20px;font-weight:800">${baht(v)}</div></div>`).join("")}</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="color:#6A645A">${["เดือน", "สุทธิ", "OT", "รายจ่าย", "ผ่อนหนี้", "ดอกเบี้ย", "ออม"].map(h => `<th style="text-align:right;padding:6px;border-bottom:1px solid #ddd">${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${[mShort(r.mk), r.net, r.ot, r.exp, r.debtPaid, r.interest, r.saved].map((v, i) => `<td style="text-align:right;padding:6px;border-bottom:1px solid #eee">${i ? fmt(v) : v}</td>`).join("")}</tr>`).join("")}</table></div>`;
      const cv = await html2canvas(st.firstElementChild, { scale: 2, backgroundColor: "#fff" }); st.innerHTML = "";
      const pdf = new window.jspdf.jsPDF({ unit: "pt", format: "a4" }); const w = 595, h = cv.height * w / cv.width; pdf.addImage(cv.toDataURL("image/jpeg", .92), "JPEG", 0, 0, w, h);
      return saveFile(`moneyquest-report-${stamp}.pdf`, pdf.output("blob"));
    }
  } catch (e) { toast("ส่งออกไม่สำเร็จ"); }
}
async function importFile(file) {
  try {
    const o = JSON.parse(await file.text());
    if (o.records && o.pay && !o.meta) {           // OT Scan (otscan:v1)
      let n = 0; for (const [k, r] of Object.entries(o.records)) { S.ot[k] = { values: r.values, source: typeof r.source === "string" ? Object.fromEntries(E.OT_FIELDS.map(f => [f.k, r.source])) : (r.source || {}), at: r.at || Date.now(), history: [{ at: Date.now(), source: "import" }] }; n++; }
      if (!S.pay.salary && o.pay.salary) Object.assign(S.pay, { salary: +o.pay.salary || 0, living: +o.pay.living || 0, position: +o.pay.position || 0, rent: +o.pay.rent || 0, otherMult: +o.pay.otherMult || 1 });
      audit("import", `นำเข้า OT Scan ${n} รอบ`); commit(); return toast(`นำเข้า ${n} รอบ OT แล้ว`);
    }
    if (!o.meta || !o.pay) return toast("ไฟล์นี้ไม่ใช่ไฟล์สำรองของ MONEY QUEST");
    S = normalize(o); audit("import", "นำเข้าไฟล์สำรอง"); commit(); toast("นำเข้าข้อมูลแล้ว");
  } catch (e) { toast("อ่านไฟล์ไม่ได้"); }
}

/* ───────── render & events ───────── */
const TABS = [["home", "Home", I.home], ["money", "Money", I.money], ["journey", "Journey", I.mtn], ["planner", "Planner", I.cal], ["profile", "Profile", I.user]];
function render() {
  $("#nav").innerHTML = TABS.map(([k, l, ic]) => k === "journey" ? `<button class="jr" data-act="go" data-tab="journey" ${view.tab === k ? 'aria-current="page"' : ""} aria-label="Journey"><span class="fab">${ic}</span><span>${l}</span></button>` : `<button data-act="go" data-tab="${k}" ${view.tab === k ? 'aria-current="page"' : ""}>${ic}<span>${l}</span></button>`).join("");
  $("#main").innerHTML = ({ home: pHome, money: pMoney, journey: pJourney, planner: pPlanner, profile: pProfile }[view.tab] || pHome)();
}
function setPath(path, val) {
  const ks = path.split("."); let o = S;
  for (let i = 0; i < ks.length - 1; i++) { o[ks[i]] = o[ks[i]] || {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = val;
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return; const d = el.dataset, a = d.act;
  if (el.tagName === "A") return;
  const H = {
    go: () => go(d.tab), goMoney: () => go("money", d.sub), goPlanner: () => go("planner", d.sub), goSet: () => go(d.tab, d.sub),
    mtab: () => { view.money = d.k; render(); }, ptab: () => { view.planner = d.k; render(); },
    planDay: () => { view.sel = d.d; view.calMonth = E.monthKey(d.d); view.calView = "day"; go("planner", "calendar"); },
    closeSheet, sampleOn: () => { REAL = S; S = buildSample(); view.otDraft = null; toast("เปิดโหมดตัวอย่าง"); go("home"); }, sampleOff: () => { S = REAL; REAL = null; view.otDraft = null; toast("กลับสู่ข้อมูลจริง"); render(); },
    otKey: () => { if (view.otDraft?.dirty && !confirmLeave()) return; view.otKey = d.k; view.otDraft = null; render(); },
    otSave: () => { const dr = otDraft(); const exist = S.ot[view.otKey];
      const save = () => { S.ot[view.otKey] = { values: JSON.parse(JSON.stringify(dr.values)), source: dr.source, at: Date.now(), history: [...(exist?.history || []), { at: Date.now(), source: Object.values(dr.source).includes("scan") ? "scan" : "edit" }] }; dr.dirty = false; audit("ot", `บันทึก OT รอบ ${view.otKey} ${baht(E.otCalc(dr.values, S.pay).total)}`); closeSheet(); commit(); toast("บันทึก OT แล้ว"); };
      if (exist) openSheet(`<div class="grab"></div><h3>บันทึกทับรอบ ${mLabel(view.otKey)}?</h3><p class="sub" style="margin-top:6px">รอบนี้บันทึกไว้แล้ว ค่าใหม่จะแทนของเดิม (${baht(E.otCalc(exist.values, S.pay).total)} → ${baht(E.otCalc(dr.values, S.pay).total)})</p><div class="acts"><button class="btn ghost" data-act="closeSheet">ยกเลิก</button><button class="btn primary" id="okSave">บันทึกทับ</button></div>`), setTimeout(() => $("#okSave").onclick = save, 0);
      else save(); },
    payM: () => { view.payMonth = E.addMonths(view.payMonth, +d.n); render(); }, taxY: () => { view.taxYear = +d.y; render(); },
    expM: () => { view.expMonth = E.addMonths(view.expMonth, +d.n); render(); },
    debtEdit: () => sheetDebt(d.id), pay: () => sheetPay(d.id),
    debtDel: () => { const x = S.debts.find(y => y.id === d.id); if (!el.dataset.ok) { el.dataset.ok = 1; el.textContent = "กดอีกครั้งเพื่อลบ"; return; } S.debts = S.debts.filter(y => y.id !== d.id); S.debtPayments = S.debtPayments.filter(p => p.debtId !== d.id); audit("debt", `ลบหนี้ ${x?.name}`); closeSheet(); commit(); },
    expItem: () => sheetExpItem(d.id, d.kind), spend: () => sheetSpend(d.id),
    expDel: () => { S.expenses = S.expenses.filter(x => x.id !== d.id); S.spend.forEach(l => { if (l.itemId === d.id) l.itemId = null; }); closeSheet(); commit(); },
    spendDel: () => { S.spend = S.spend.filter(x => x.id !== d.id); closeSheet(); commit(); },
    markPaid: () => { const it = S.expenses.find(x => x.id === d.id), mk = view.expMonth, f = E.expenseMonth(S, mk).fixed.find(x => x.item.id === d.id);
      S.spend.push({ id: E.uid(), at: Date.now(), date: mk === E.monthKey(today()) ? today() : f.due, amount: E.r2(f.planned - f.paid), cat: it.cat, itemId: it.id, note: "จ่าย" + it.name }); audit("expense", `จ่าย ${it.name}`); commit(); toast(`บันทึกว่าจ่าย${it.name}แล้ว`); },
    goal: () => sheetGoal(d.id),
    goalAdd: () => { const g = S.goals.find(x => x.id === d.id), v = num($("#gAdd").value); if (v <= 0) return toast("ใส่จำนวนเงิน");
      const before = E.goalInfo(g).pct; g.contributions.push({ id: E.uid(), date: today(), amount: v }); const after = E.goalInfo(g).pct; if (after >= 1 && !g.doneAt) g.doneAt = today();
      audit("goal", `เก็บเงิน ${g.name} +${baht(v)}`); closeSheet(); commit(); toast(`+${baht(v)} เข้าเป้าหมาย`); if (after >= 1 && before < 1) confetti(); },
    contribDel: () => { const g = S.goals.find(x => x.id === d.g); g.contributions = g.contributions.filter(c => c.id !== d.c); if (E.goalInfo(g).pct < 1) g.doneAt = null; commit(); sheetGoal(g.id); },
    goalDel: () => { if (!el.dataset.ok) { el.dataset.ok = 1; el.textContent = "กดอีกครั้งเพื่อลบ"; return; } S.goals = S.goals.filter(x => x.id !== d.id); closeSheet(); commit(); },
    claim: () => { const xp = E.claimMission(S, d.mk, d.m); if (!xp) return toast("ภารกิจนี้รับรางวัลแล้ว"); audit("mission", `รับ ${xp} XP จากภารกิจ`); confetti(); xpPop(xp); commit(); },
    cpInfo: () => sheetCp(+d.i), weights: sheetWeights,
    calSel: () => { view.sel = d.d; render(); }, calM: () => { view.calMonth = E.addMonths(view.calMonth, +d.n); render(); }, calView: () => { view.calView = d.k; render(); },
    calToday: () => { view.sel = today(); view.calMonth = E.monthKey(today()); render(); }, selShift: () => { view.sel = E.addDays(view.sel, +d.n); view.calMonth = E.monthKey(view.sel); render(); },
    shiftDay: () => sheetShiftDay(d.d), setOv: () => { if (d.c && d.c !== shiftOf(d.d).base) S.shift.overrides[d.d] = d.c; else delete S.shift.overrides[d.d]; closeSheet(); commit(); },
    shMode: () => { S.shift.mode = d.k; commit(); }, team: () => { S.profile.team = d.k; commit(); },
    seqTap: () => { const sq = S.shift.custom.seq; sq[+d.i] = { D: "N", N: "H", H: "D" }[sq[+d.i]]; commit(); }, seqAdd: () => { S.shift.custom.seq.push("D"); commit(); }, seqDel: () => { if (S.shift.custom.seq.length > 1) S.shift.custom.seq.pop(); commit(); },
    preset: () => { S.shift.custom.seq = d.s.split(""); commit(); },
    editAppt: () => sheetAppt(d.id, view.sel), apptDel: () => { S.planner.appts = S.planner.appts.filter(x => x.id !== d.id); closeSheet(); commit(); },
    todo: () => sheetTodo(d.id), todoDone: () => { const t = S.planner.todos.find(x => x.id === d.id); t.done = !t.done; t.doneAt = t.done ? Date.now() : null; commit(); }, todoDel: () => { S.planner.todos = S.planner.todos.filter(x => x.id !== d.id); closeSheet(); commit(); },
    export: () => doExport(d.k),
    reset: () => { if (!el.dataset.ok) { el.dataset.ok = 1; el.textContent = "ยืนยันล้าง — กดอีกครั้ง"; setTimeout(() => { if (el.isConnected) { delete el.dataset.ok; el.textContent = "ล้างข้อมูลทั้งหมด"; } }, 4000); return; } S = E.defaultState(); audit("reset", "ล้างข้อมูลทั้งหมด"); commit(); toast("ล้างข้อมูลแล้ว"); }
  };
  if (H[a]) { e.preventDefault(); H[a](); }
});
function confirmLeave() { toast("มีค่าที่ยังไม่บันทึก — กดอีกครั้งเพื่อทิ้ง"); if (view._leave) { view._leave = 0; return true; } view._leave = 1; setTimeout(() => view._leave = 0, 3000); return false; }
document.addEventListener("submit", e => {
  const f = e.target; e.preventDefault();
  if (f.dataset.form === "todoAdd") { const v = formData(f); if (!v.title.trim()) return; S.planner.todos.push({ id: E.uid(), title: v.title.trim(), due: null, priority: 2, done: false }); commit(); return; }
  if (sheetSubmit) sheetSubmit(f);
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.ot) { const dr = otDraft(), k = el.dataset.ot, part = el.dataset.part; let cur = dr.values[k] ? { ...dr.values[k] } : (part === "v" ? { v: 0 } : { h: 0, m: 0 });
    if (el.value === "") { if (part === "v" || (part === "h" && !cur.m) || (part === "m" && !cur.h)) dr.values[k] = null; else { cur[part] = 0; dr.values[k] = cur; } }
    else { let n = Math.max(0, Math.floor(num(el.value))); if (part === "m" && n > 59) { n = 59; el.value = 59; toast("นาทีต้องไม่เกิน 59"); } cur[part] = n; dr.values[k] = cur; }
    el.classList.toggle("miss", dr.values[k] == null); dr.source[k] = "edit"; dr.dirty = true; otLiveUpdate(); return; }
  if (el.dataset.actInput === "simH") { view.simH = +el.value; clearTimeout(view._simT); view._simT = setTimeout(render, 120); return; }
  if (el.dataset.actInput === "payPv" && sheetPay.redraw) { sheetPay.redraw(); return; }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.bind) { const p = el.dataset.bind; let v = el.type === "checkbox" ? el.checked : el.value;
    if (p === "pay.pvdRateP") { S.pay.pvdRate = Math.max(0, num(v)) / 100; commit(); return; }
    if (p.startsWith("payslips.")) { const [, mk, f] = p.split("."); S.payslips[mk] = S.payslips[mk] || {}; if (v === "") delete S.payslips[mk][f]; else S.payslips[mk][f] = num(v); commit(); return; }
    if (el.type === "number" || el.tagName === "SELECT" && /spouse/.test(p)) v = Math.max(0, num(v));
    if (p === "profile.payday") v = Math.min(31, Math.max(1, num(v) || 25));
    setPath(p, v); if (p === "pay.salary" || p.startsWith("pay.")) audit("pay", `แก้ ${p.split(".")[1]} = ${el.value}`); commit(); return; }
  if (el.dataset.time && el.value) { const [c, i] = el.dataset.time.split(":"); S.shift.times[c] = [...times(c)]; S.shift.times[c][+i] = el.value; commit(); return; }
  if (el.matches("[data-scan]") && el.files[0]) { scanFile(el.files[0]); el.value = ""; return; }
  if (el.matches("[data-import]") && el.files[0]) { importFile(el.files[0]); el.value = ""; return; }
  if (el.matches("[data-goalimg]") && el.files[0]) { shrink(el.files[0]).then(url => { const h = $("#sheetBody input[name=img]"); h.value = url; toast("แนบรูปแล้ว กดบันทึก"); }); return; }
  if (el.name === "icon") { document.querySelectorAll("#sheetBody input[name=icon]").forEach(r => r.nextElementSibling.style.background = r.checked ? "var(--sun)" : ""); return; }
  if (el.dataset.actChange === "debtType") { const m = $("#sheetBody select[name=method]"); if (m) m.value = E.DEFAULT_METHOD[el.value]; }
});
function shrink(file) { return new Promise(ok => { const img = new Image(); img.onload = () => { const s = 160 / Math.max(img.width, img.height), c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", .78)); }; img.src = URL.createObjectURL(file); }); }
$("#scrim").addEventListener("click", closeSheet);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); if (e.key === "Enter" && e.target.id === "gAdd") { e.preventDefault(); document.querySelector("[data-act=goalAdd]")?.click(); } });
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (TABS.some(x => x[0] === t) && t !== view.tab) { view.tab = t; render(); } });
setInterval(() => { if (view.tab === "home" && !document.querySelector(".sheet.show") && !document.activeElement?.matches("input,textarea,select")) render(); }, 60000);



