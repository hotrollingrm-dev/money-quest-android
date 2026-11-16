/* MONEY QUEST — slip import (part 3). Reads e-slips on the device: QR (jsQR) + Thai OCR (tesseract.js), parses with SLIP. */
const BANKC = k => (SLIP.BANK_BY_KEY[k] || { short: k === "promptpay" ? "PromptPay" : "?", name: k === "promptpay" ? "พร้อมเพย์" : "ไม่ทราบ", color: "#7B766A" });
const SL_TYPE = { expense: ["รายจ่าย", "r"], income: ["รายรับ", "g"], transfer: ["โอนระหว่างบัญชีตัวเอง", "l"], debt: ["จ่ายบัตรเครดิต/หนี้", "y"], unknown: ["ไม่แน่ใจ", ""] };
function slipState() { S.slips = S.slips || {}; S.owner = S.owner || { names: [], accounts: [] }; S.slipRules = S.slipRules || {}; return S; }
const vendorURL = p => new URL("vendor/" + p, location.href).href;

/* OCR engine: worker + core + language data are this app's own files */
let ocrWorker = null, ocrLoading = null;
async function seedLang(lang) {          // put traineddata into tesseract.js' IndexedDB cache (it reads cache before fetching)
  const res = await fetch(vendorURL(`lang/${lang}.traineddata.wasm`)); if (!res.ok) throw new Error("lang " + res.status);
  const data = new Uint8Array(await res.arrayBuffer());
  await new Promise((ok, no) => { const r = indexedDB.open("keyval-store", 1); r.onupgradeneeded = () => r.result.createObjectStore("keyval");
    r.onsuccess = () => { const tx = r.result.transaction("keyval", "readwrite"); tx.objectStore("keyval").put(data, `./${lang}.traineddata`); tx.oncomplete = ok; tx.onerror = () => no(tx.error); }; r.onerror = () => no(r.error); });
}
async function getOCR(onStatus) {
  if (ocrWorker) return ocrWorker;
  if (ocrLoading) return ocrLoading;
  ocrLoading = (async () => {
    onStatus && onStatus("กำลังเตรียมตัวอ่านภาษาไทย (ครั้งแรกเท่านั้น)…");
    await loadScript(vendorURL("jsQR.js")); await loadScript(vendorURL("tesseract.min.js"));
    let cache = true; try { await seedLang("tha"); await seedLang("eng"); } catch (e) { cache = false; }
    ocrWorker = await Tesseract.createWorker(["tha", "eng"], 1, { workerPath: vendorURL("worker.min.js"), corePath: vendorURL("core/"), langPath: vendorURL("lang"), workerBlobURL: false, gzip: true, cacheMethod: cache ? "write" : "none" });
    return ocrWorker;
  })();
  try { return await ocrLoading; } finally { ocrLoading = null; }
}
function imgData(file) {
  return new Promise((ok, no) => { const img = new Image(); img.onload = () => {
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    // greyscale + contrast stretch for OCR (same as the tested pipeline)
    const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; const og = o.getContext("2d"); const od = og.createImageData(c.width, c.height);
    let lo = 255, hi = 0; for (let i = 0; i < d.data.length; i += 4) { const v = .299 * d.data[i] + .587 * d.data[i + 1] + .114 * d.data[i + 2]; od.data[i] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    const k = hi > lo ? 255 / (hi - lo) : 1; for (let i = 0; i < od.data.length; i += 4) { const v = (od.data[i] - lo) * k; od.data[i] = od.data[i + 1] = od.data[i + 2] = v; od.data[i + 3] = 255; }
    og.putImageData(od, 0, 0); URL.revokeObjectURL(img.src); ok({ rgba: d, gray: o });
  }; img.onerror = no; img.src = URL.createObjectURL(file); });
}
const view3 = { slipBusy: false, slipMsg: "", slipProg: 0, slipTot: 0, slipMonth: E.monthKey(today()) };
async function importSlips(files) { return importSlipItems([...files].filter(f => /^image\//.test(f.type)).map(f => ({ blob: f, time: f.lastModified, name: f.name }))); }
/** items: [{blob, time (ms), name}] — from the file picker or from the phone's bank albums */
async function importSlipItems(files, opts = {}) {
  slipState(); if (!files.length) return { added: 0, dup: 0, bad: 0 };
  view3.slipBusy = true; view3.slipTot = files.length; view3.slipProg = 0; view3.slipMsg = ""; render();
  let added = 0, dup = 0, bad = 0;
  try {
    const w = await getOCR(m => { view3.slipMsg = m; render(); });
    for (const f of files) {
      view3.slipMsg = `กำลังอ่าน ${view3.slipProg + 1}/${files.length}`; render();
      try {
        const { rgba, gray } = await imgData(typeof f.blob === "function" ? await f.blob() : f.blob);
        const q = jsQR(rgba.data, rgba.width, rgba.height);
        const { data } = await w.recognize(gray);
        const p = SLIP.parseSlip({ qr: q && q.data, text: data.text, fileTime: f.time });
        if (!p.amount && !p.ref) { bad++; continue; }
        const key = p.ref || `${p.date}|${p.time}|${p.amount}|${p.from && p.from.acct}`;
        const exists = S.slips[key] || Object.values(S.slips).some(x => x.date === p.date && x.time === p.time && x.amount === p.amount && (x.from && x.from.acct) === (p.from && p.from.acct));
        if (exists) { dup++; continue; }
        SLIP.learnOwner(S.owner, p);
        S.slips[key] = { ...p, id: key, status: "pending", importedAt: Date.now(), file: f.name, auto: !!opts.auto };
        added++;
      } catch (e) { bad++; }
      view3.slipProg++;
    }
    reclassifyPending();
    audit("slip", `นำเข้าสลิป ${added} ใบ${dup ? ` (ซ้ำ ${dup})` : ""}`);
    view3.slipMsg = `ได้ ${added} รายการใหม่${dup ? ` · ข้ามใบซ้ำ ${dup}` : ""}${bad ? ` · อ่านไม่ได้ ${bad}` : ""}`;
  } catch (e) { view3.slipMsg = "เปิดตัวอ่านสลิปไม่ได้ในหน้านี้ — ลองเปิดจากลิงก์ claude.ai หรือในแอปที่ติดตั้ง"; }
  view3.slipBusy = false; commit();
  return { added, dup, bad };
}
/** (Re)classify pending slips with everything learned so far; never touches confirmed ones. */
function reclassifyPending() {
  for (const s of Object.values(S.slips)) {
    if (s.status !== "pending") continue;
    const c = SLIP.classify(s, S.owner); s._payeeKey = c.payeeKey;
    if (!s.userType) s.type = c.type;
    if (!s.userCat) { const g = SLIP.guessCat(s, S.slipRules); s.cat = g.cat; s.catConf = g.conf; }
    s.toOwnId = c.toAccount ? c.toAccount.id : null;
    // suggestions: a fixed bill with the same amount this month, or the card debt it pays
    const mk = E.monthKey(s.date || today());
    const bill = s.type === "expense" ? E.expenseMonth(S, mk).fixed.find(f => f.status !== "paid" && Math.abs((f.planned - f.paid) - s.amount) <= Math.max(1, f.planned * .02)) : null;
    s.billId = s.userBill !== undefined ? s.userBill : bill ? bill.item.id : null;
    if (s.type === "debt" && s.debtId === undefined) { const cards = S.debts.filter(d => +d.balance > 0 && (d.type === "card" || d.type === "cash")); const byBank = cards.filter(d => (d.lender || d.name || "").toLowerCase().includes((s.bank && s.bank.short || "").toLowerCase()) || (d.lender || "").includes(s.bank && s.bank.name)); s.debtId = (byBank[0] || (cards.length === 1 ? cards[0] : null) || {}).id || null; }
  }
}
function flagsOf(s) {
  const f = []; if (s.amountConf !== "high") f.push("ยอดเงิน"); if (s.dateConf === "mismatch" || s.dateConf === "none") f.push("วันที่"); if (!s.ref) f.push("เลขอ้างอิง");
  if (s.type === "unknown") f.push("ประเภท"); if (s.type === "expense" && s.catConf === "none") f.push("หมวด"); return f;
}
function confirmSlip(id) {
  const s = S.slips[id]; if (!s || s.status !== "pending") return;
  const t = s.type, note = (s.to && s.to.name) || (s.to && s.to.acct) || "สลิป";
  if (t === "expense") { S.spend.push({ id: E.uid(), at: Date.now(), date: s.date || today(), amount: s.amount, cat: s.cat || "other", itemId: s.billId || null, note: note.slice(0, 60), slip: id }); if (s._payeeKey) S.slipRules[s._payeeKey] = s.cat; }
  else if (t === "debt" && s.debtId) { const d = S.debts.find(x => x.id === s.debtId); if (d) { const pv = E.previewPayment(S, d, s.amount, s.date || today()); const p = E.applyPayment(S, d.id, pv); p.slip = id; s.paymentId = p.id; } }
  else if (t === "transfer" && s.toOwnId) { const acc = S.owner.accounts.find(a => a.id === s.toOwnId); const g = acc && acc.goalId && S.goals.find(x => x.id === acc.goalId); if (g) { g.contributions.push({ id: E.uid(), date: s.date || today(), amount: s.amount, slip: id }); s.goalId = g.id; } }
  s.status = "done"; s.doneAt = Date.now();
}
function undoSlip(id) {
  const s = S.slips[id]; if (!s) return;
  S.spend = S.spend.filter(x => x.slip !== id);
  if (s.paymentId) { const p = S.debtPayments.find(x => x.id === s.paymentId), d = p && S.debts.find(x => x.id === p.debtId); if (p && d) { d.balance = E.r2(+d.balance + (p.after != null ? p.before - p.after : p.principal)); d.closedAt = null; } S.debtPayments = S.debtPayments.filter(x => x.id !== s.paymentId); s.paymentId = null; }
  for (const g of S.goals) g.contributions = (g.contributions || []).filter(c => c.slip !== id);
  s.status = "pending"; reclassifyPending();
}
const acctLabel = a => a ? `${BANKC(a.bank).short} ${(a.masks[0] || "").slice(-7)}${a.label ? " · " + a.label : ""}` : "";
function bankSummary(mk) {
  const rows = {};
  for (const a of S.owner.accounts) rows[a.id] = { acc: a, out: 0, inn: 0, xin: 0, xout: 0, n: 0 };
  for (const s of Object.values(S.slips)) {
    if (s.status === "ignored" || !s.date || E.monthKey(s.date) !== mk) continue;
    const fa = s.from && SLIP.findOwnAccount(S.owner, s.from.acct, s.from.bank || (s.bank && s.bank.k)), ta = s.toOwnId && S.owner.accounts.find(a => a.id === s.toOwnId);
    if (fa && rows[fa.id]) { rows[fa.id].n++; if (s.type === "transfer") rows[fa.id].xout += s.amount; else rows[fa.id].out += s.amount; }
    if (ta && rows[ta.id]) { if (s.type === "transfer") rows[ta.id].xin += s.amount; else rows[ta.id].inn += s.amount; }
  }
  return Object.values(rows).filter(r => r.n || r.inn || r.xin);
}
function mSlips() {
  slipState();
  const all = Object.values(S.slips), pend = all.filter(s => s.status === "pending").sort((a, b) => ((b.date || "") + (b.time || "")).localeCompare((a.date || "") + (a.time || "")));
  const done = all.filter(s => s.status === "done" && s.date && E.monthKey(s.date) === view3.slipMonth).sort((a, b) => ((b.date || "") + (b.time || "")).localeCompare((a.date || "") + (a.time || "")));
  const sum = bankSummary(view3.slipMonth);
  const sign = s => s.type === "expense" || s.type === "debt" ? "−" : s.type === "income" ? "+" : "↔";
  const card = s => { const b = BANKC(s.bank && s.bank.k), fl = flagsOf(s), [tl, tc] = SL_TYPE[s.type] || SL_TYPE.unknown;
    const toOwn = s.toOwnId && S.owner.accounts.find(a => a.id === s.toOwnId);
    const sub = s.type === "transfer" ? `→ ${toOwn ? acctLabel(toOwn) : "บัญชีของคุณ"}` : s.type === "debt" ? `→ ${esc(s.to && s.to.name || "บัตรเครดิต")} ${s.to && s.to.card ? "(" + esc(s.to.card) + ")" : ""}${s.debtId ? "" : " · ยังไม่ได้ผูกกับหนี้"}` : `→ ${esc((s.to && s.to.name) || (s.to && s.to.acct) || "ไม่ทราบผู้รับ")}`;
    return `<div class="card slipc" style="padding:16px">
      <div class="between"><span class="row" style="gap:8px"><span class="dot" style="width:12px;height:12px;background:${b.color}"></span><b>${b.short}</b><span class="muted" style="font-size:13px">${s.date ? dShort(s.date) : "?"} ${s.time || ""}</span></span><span class="tag ${tc}">${tl}</span></div>
      <div class="between" style="margin-top:8px;align-items:flex-end"><div style="min-width:0"><div class="money" style="font-size:26px">${sign(s)}${baht(s.amount || 0, (s.amount || 0) % 1 ? 2 : 0)}</div><div class="sub" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sub}</div></div></div>
      ${s.type === "expense" ? `<div class="row" style="margin-top:8px;gap:6px"><span class="tag">${E.EXP_CATS[s.cat] || "อื่น ๆ"}${s.catConf === "learned" ? " · จำไว้" : ""}</span>${s.billId ? `<span class="tag g">จ่าย${esc((S.expenses.find(e => e.id === s.billId) || {}).name || "")}</span>` : ""}</div>` : ""}
      ${s.type === "transfer" && toOwn && toOwn.goalId ? `<div class="row" style="margin-top:8px"><span class="tag g">เข้าเป้าหมาย ${esc((S.goals.find(g => g.id === toOwn.goalId) || {}).name || "")}</span></div>` : ""}
      ${fl.length ? `<div class="warnbox" style="margin-top:10px;padding:8px 12px;font-size:13px">ตรวจ: ${fl.join(" · ")}</div>` : ""}
      <div class="row" style="margin-top:12px;gap:8px;flex-wrap:nowrap"><button class="btn sm ghost" style="flex:1" data-act="slipEdit" data-id="${esc(s.id)}">แก้</button><button class="btn sm ghost" data-act="slipIgnore" data-id="${esc(s.id)}">ข้าม</button><button class="btn sm primary" style="flex:1.4" data-act="slipOk" data-id="${esc(s.id)}">ยืนยัน</button></div></div>`; };
  const clean = pend.filter(s => !flagsOf(s).length);
  return `<div class="card"><div class="between"><div><b>นำเข้าสลิปจากมือถือ</b><div class="sub">เปิดอัลบั้มของแอปธนาคาร → เลือกทั้งหมด · อ่านในเครื่อง ไม่ส่งรูปออกไป</div></div></div>
      <label class="btn primary wide" style="margin-top:12px">${I.file} เลือกสลิป (ได้หลายใบ)<input type="file" accept="image/*" multiple data-slips hidden ${view3.slipBusy ? "disabled" : ""}></label>
      ${view3.slipBusy ? `<div class="bar" style="margin-top:12px"><i style="width:${view3.slipTot ? view3.slipProg / view3.slipTot * 100 : 5}%"></i></div>` : ""}
      ${view3.slipMsg ? `<p class="sub" style="margin-top:8px">${esc(view3.slipMsg)}</p>` : ""}
      <p class="hint" style="margin-top:8px;font-size:12px;color:var(--ink-3)">ทดสอบแล้วกับสลิป ออมสิน (MyMo) · ทีทีบี · กรุงศรี — ธนาคารอื่นอ่านได้แต่อาจต้องตรวจมากขึ้น</p></div>
    ${pend.length ? `<div class="sec-h"><h2>รอตรวจ ${pend.length}</h2>${clean.length > 1 ? `<button data-act="slipOkAll">ยืนยัน ${clean.length} รายการที่ไม่มีจุดตรวจ</button>` : ""}</div><div class="stack">${pend.map(card).join("")}</div>` : ""}
    <div class="sec-h"><h2>แยกตามบัญชี</h2><div class="row" style="gap:4px"><button class="icon-btn" data-act="slipM" data-n="-1" aria-label="เดือนก่อน">${I.l}</button><b style="font-size:14px">${mShort(view3.slipMonth)}</b><button class="icon-btn" data-act="slipM" data-n="1" aria-label="เดือนถัดไป">${I.r}</button></div></div>
    ${S.owner.accounts.length ? `<div class="stack">${(sum.length ? sum : S.owner.accounts.map(a => ({ acc: a, out: 0, inn: 0, xin: 0, xout: 0, n: 0 }))).map(r => { const b = BANKC(r.acc.bank); return `<button class="card" style="text-align:left;width:100%;border-left:6px solid ${b.color}" data-act="acctEdit" data-id="${r.acc.id}">
        <div class="between"><b>${b.name} <span class="muted" style="font-weight:500">${esc(r.acc.masks[0] || "")}</span></b>${r.acc.goalId ? `<span class="tag g">บัญชีเงินเก็บ</span>` : ""}</div>${r.acc.label ? `<div class="sub">${esc(r.acc.label)}</div>` : ""}
        <div class="kv" style="margin-top:10px"><div><small>จ่ายออก</small><b>${baht(r.out)}</b></div><div><small>รับเข้า</small><b>${baht(r.inn)}</b></div><div><small>โอนข้ามบัญชี</small><b>${baht(r.xout)} / ${baht(r.xin)}</b></div></div></button>`; }).join("")}</div>`
      : `<div class="card empty"><b>ยังไม่รู้จักบัญชีของคุณ</b>นำเข้าสลิปแล้วระบบจะจำบัญชีผู้โอนว่าเป็นบัญชีของคุณ</div>`}
    ${done.length ? `<div class="sec-h"><h2>บันทึกแล้ว · ${mShort(view3.slipMonth)}</h2></div><div class="card"><div class="list">${done.map(s => { const b = BANKC(s.bank && s.bank.k), [tl] = SL_TYPE[s.type] || SL_TYPE.unknown; return `<div class="li"><span class="dot" style="width:10px;height:10px;background:${b.color}"></span><div class="t"><b>${esc((s.to && s.to.name) || tl)}</b><small>${b.short} · ${dShort(s.date)} ${s.time || ""} · ${tl}</small></div><div class="v">${sign(s)}${baht(s.amount, s.amount % 1 ? 2 : 0)}</div><button class="link" data-act="slipUndo" data-id="${esc(s.id)}">ย้อน</button></div>`; }).join("")}</div></div>` : ""}`;
}
function sheetSlip(id) {
  const s = S.slips[id]; if (!s) return;
  const debts = S.debts.filter(d => +d.balance > 0);
  openSheet(`<form data-form="slip"><div class="grab"></div><h3>แก้รายการจากสลิป</h3><div class="sub">${BANKC(s.bank && s.bank.k).name} · อ้างอิง ${esc(s.ref || "—")}</div><div class="fgrid" style="margin-top:12px">
    <div class="f"><label>ยอดเงิน</label><input type="number" name="amount" step="any" min="0" required value="${s.amount || ""}"></div>
    <div class="f"><label>ประเภท</label><select name="type">${opt({ expense: "รายจ่าย", income: "รายรับ", transfer: "โอนระหว่างบัญชีตัวเอง", debt: "จ่ายบัตรเครดิต/หนี้" }, s.type)}</select></div>
    <div class="f"><label>วันที่</label><input type="date" name="date" required value="${s.date || today()}"></div><div class="f"><label>เวลา</label><input type="time" name="time" value="${s.time || ""}"></div>
    <div class="f full"><label>ผู้รับ</label><input type="text" name="toName" maxlength="80" value="${esc((s.to && s.to.name) || "")}"></div>
    <div class="f"><label>หมวด (รายจ่าย)</label><select name="cat">${opt(E.EXP_CATS, s.cat || "other")}</select></div>
    <div class="f"><label>เป็นบิลคงที่</label><select name="bill"><option value="">— ไม่ใช่</option>${S.expenses.filter(e => e.kind === "fixed").map(e => `<option value="${e.id}" ${s.billId === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select></div>
    <div class="f full"><label>จ่ายหนี้บัญชี</label><select name="debt"><option value="">— ไม่ผูก</option>${debts.map(d => `<option value="${d.id}" ${s.debtId === d.id ? "selected" : ""}>${esc(d.name)} (${baht(d.balance)})</option>`).join("")}</select></div></div>
    <p class="hint" style="margin-top:8px;font-size:12px;color:var(--ink-3)">หมวดที่เลือกจะถูกจำไว้กับผู้รับรายนี้ ครั้งหน้าใส่ให้เอง</p>
    <div class="acts"><button type="button" class="btn ghost" data-act="closeSheet">ยกเลิก</button><button class="btn primary" type="submit">บันทึกแล้วยืนยัน</button></div></form>`, f => {
      const v = formData(f); s.amount = num(v.amount); s.type = v.type; s.userType = true; s.date = v.date; s.time = v.time; s.to = Object.assign(s.to || {}, { name: v.toName.trim() });
      s.cat = v.cat; s.userCat = true; s.catConf = "user"; s.billId = v.bill || null; s.userBill = s.billId; s.debtId = v.debt || null; s.amountConf = "high"; if (s.dateConf !== "high") s.dateConf = "user";
      confirmSlip(id); closeSheet(); commit(); toast("บันทึกแล้ว");
    });
}
function sheetAcct(id) {
  const a = S.owner.accounts.find(x => x.id === id); if (!a) return;
  openSheet(`<form data-form="acct"><div class="grab"></div><h3>${BANKC(a.bank).name}</h3><div class="sub">${a.masks.map(esc).join(" · ")}</div><div class="fgrid" style="margin-top:12px">
    <div class="f full"><label>ชื่อเรียก</label><input type="text" name="label" maxlength="30" value="${esc(a.label || "")}" placeholder="เช่น บัญชีเงินเดือน"></div>
    <div class="f full"><label>เงินที่โอนเข้าบัญชีนี้ = เก็บเข้าเป้าหมาย</label><select name="goal"><option value="">— ไม่ใช่บัญชีเงินเก็บ</option>${S.goals.map(g => `<option value="${g.id}" ${a.goalId === g.id ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></div></div>
    <div class="acts"><button type="button" class="btn danger" data-act="acctDel" data-id="${id}">ไม่ใช่บัญชีของฉัน</button><button class="btn primary" type="submit">บันทึก</button></div></form>`, f => { const v = formData(f); a.label = v.label.trim(); a.goalId = v.goal || null; reclassifyPending(); closeSheet(); commit(); });
}
document.addEventListener("change", e => { if (e.target.matches("[data-slips]") && e.target.files.length) { importSlips(e.target.files); e.target.value = ""; } });
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return; const d = el.dataset;
  const H = {
    slipOk: () => { confirmSlip(d.id); commit(); toast("บันทึกแล้ว"); },
    slipOkAll: () => { let n = 0; for (const s of Object.values(S.slips)) if (s.status === "pending" && !flagsOf(s).length) { confirmSlip(s.id); n++; } commit(); toast(`ยืนยัน ${n} รายการ`); },
    slipIgnore: () => { S.slips[d.id].status = "ignored"; commit(); }, slipUndo: () => { undoSlip(d.id); commit(); },
    slipEdit: () => sheetSlip(d.id), slipM: () => { view3.slipMonth = E.addMonths(view3.slipMonth, +d.n); render(); },
    acctEdit: () => sheetAcct(d.id), acctDel: () => { S.owner.accounts = S.owner.accounts.filter(a => a.id !== d.id); reclassifyPending(); closeSheet(); commit(); }
  };
  if (H[d.act]) { e.preventDefault(); e.stopPropagation(); H[d.act](); }
}, true);

