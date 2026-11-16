/* MONEY QUEST — Android bridge (part 4). Everything here is inert in a browser; it lights up inside the installed app. */
const NATIVE = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && window.capacitorExports);
const regP = n => NATIVE ? capacitorExports.registerPlugin(n) : null;
const MQN = regP("MQNative"), LN = regP("LocalNotifications"), APP = regP("App"), WV = regP("WebView");
const REPO = "hotrollingrm-dev/money-quest-android";
const WEB_VERSION = +window.MQ_WEB_VERSION || 0;
const nview = { info: null, perm: false, scanning: false, update: null, notifyOK: null };

/* exports go to Download/MoneyQuest */
if (NATIVE) {
  saveFile = async function (name, data) {
    try {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const b64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = no; r.readAsDataURL(blob); });
      const mime = /\.json$/.test(name) ? "application/json" : /\.csv$/.test(name) ? "text/csv" : /\.pdf$/.test(name) ? "application/pdf" : /\.xlsx$/.test(name) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/octet-stream";
      const r = await MQN.saveFile({ name, base64: b64, mime }); toast("บันทึกที่ " + r.path);
    } catch (e) { toast("บันทึกไฟล์ไม่สำเร็จ"); }
  };
}

/* ── automatic slip import from bank albums ── */
function slipScanState() { S.slipScan = S.slipScan || { auto: true, last: 0 }; return S.slipScan; }
async function scanAlbums(manual) {
  if (!NATIVE || nview.scanning || view3.slipBusy) return;
  const st = slipScanState(); if (!st.auto && !manual) return;
  try { nview.perm = (await MQN.photoPermission()).granted; } catch (e) { nview.perm = false; }
  if (!nview.perm) { if (manual) render(); return; }
  nview.scanning = true;
  try {
    const since = st.last || (Date.now() - 31 * 864e5);              // first run: last 31 days
    const { items } = await MQN.listSlips({ since, limit: 300 });
    if (items.length) {
      const list = items.map(it => ({ name: it.name, time: it.taken || it.added, blob: async () => { const r = await MQN.readImage({ uri: it.uri, maxSide: 1600 }); return await (await fetch("data:image/jpeg;base64," + r.base64)).blob(); } }));
      const res = await importSlipItems(list, { auto: true });
      if (res.added) toast(`อ่านสลิปใหม่ ${res.added} ใบ — รอตรวจในหน้า สลิป`);
    } else if (manual) toast("ไม่มีสลิปใหม่");
    st.last = Math.max(st.last || 0, ...items.map(i => i.added), since);
    await MQN.setScanSettings({ lastScan: st.last }); commit({ render: view.tab === "money" });
  } catch (e) { if (manual) toast("สแกนอัลบั้มไม่สำเร็จ"); }
  nview.scanning = false;
}
function slipNativeCard() {
  if (!NATIVE) return "";
  const st = slipScanState();
  return `<div class="card" style="margin-bottom:12px"><div class="between"><div><b>อ่านจากอัลบั้มธนาคารอัตโนมัติ</b><div class="sub">${nview.perm ? `เปิดแอปเมื่อไหร่ อ่านสลิปใหม่ให้เอง · ล่าสุด ${st.last ? new Date(st.last).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ยังไม่เคย"}` : "ต้องอนุญาตให้อ่านรูปก่อน — เลือก “อนุญาตทั้งหมด”"}</div></div>
    <label class="row" style="gap:6px;font-size:13px;font-weight:600"><input type="checkbox" data-act-chk="slipAuto" ${st.auto ? "checked" : ""} style="width:22px;height:22px;accent-color:#E9A300">อัตโนมัติ</label></div>
    <div class="row" style="margin-top:12px">${nview.perm ? `<button class="btn primary sm" data-act="scanNow">${nview.scanning ? "กำลังอ่าน…" : "สแกนตอนนี้"}</button><button class="btn ghost sm" data-act="albums">เลือกอัลบั้ม</button>` : `<button class="btn primary sm" data-act="askPhotos">อนุญาตให้อ่านรูป</button>`}</div></div>`;
}
async function sheetAlbums() {
  let albums = []; try { albums = (await MQN.listAlbums()).albums; } catch (e) { return toast("อ่านรายชื่ออัลบั้มไม่ได้"); }
  const chosen = S.slipScan.albums;
  openSheet(`<form data-form="albums"><div class="grab"></div><h3>อัลบั้มที่มีสลิป</h3><div class="sub">ติ๊กไว้ให้แล้วตามชื่อแอปธนาคาร · อ่านเฉพาะอัลบั้มที่เลือก รูปอื่นไม่แตะ</div>
    <div class="list" style="margin-top:8px">${albums.map(a => `<label class="li" style="cursor:pointer"><input type="checkbox" name="a" value="${esc(a.name)}" ${(chosen ? chosen.includes(a.name) : a.match) ? "checked" : ""} style="width:22px;height:22px;accent-color:#E9A300"><div class="t"><b>${esc(a.name || "(ไม่มีชื่อ)")}</b><small>${a.count} รูป</small></div></label>`).join("")}</div>
    <div class="acts"><button type="button" class="btn ghost" data-act="albumsAuto">ใช้แบบอัตโนมัติ</button><button class="btn primary" type="submit">บันทึก</button></div></form>`, async f => {
      const sel = [...f.querySelectorAll("input[name=a]:checked")].map(x => x.value);
      S.slipScan.albums = sel; await MQN.setScanSettings({ albums: sel }); closeSheet(); commit(); toast(`เลือก ${sel.length} อัลบั้ม`);
    });
}

/* ── device notifications (shift, appointments, debts, bills) ── */
function notifyCfg() { S.notify = Object.assign({ shift: true, shiftBefore: 60, appt: true, debt: true, bill: true }, S.notify || {}); return S.notify; }
let notifT = null;
function scheduleNotifications() { if (!NATIVE || !LN) return; clearTimeout(notifT); notifT = setTimeout(doSchedule, 1500); }
async function doSchedule() {
  try {
    const perm = await LN.checkPermissions(); nview.notifyOK = perm.display === "granted"; if (!nview.notifyOK) return;
    const pend = await LN.getPending(); const mine = pend.notifications.filter(n => n.id >= 100000 && n.id < 200000);
    if (mine.length) await LN.cancel({ notifications: mine.map(n => ({ id: n.id })) });
    const cfg = notifyCfg(), now = Date.now(), td = today(), out = []; let id = 100000;
    const at9 = d => atTime(d, "09:00");
    for (let i = 0; i < 14; i++) {
      const d = E.addDays(td, i), c = shiftOf(d).c;
      if (cfg.shift && isWork(c) && !S.leaves?.[d]) { const t = new Date(atTime(d, times(c)[0]).getTime() - cfg.shiftBefore * 6e4); if (t > now) out.push({ id: id++, title: `${SHN[c]} ${times(c)[0]}`, body: `อีก ${cfg.shiftBefore} นาทีเข้างาน · Team ${S.profile.team}`, schedule: { at: t, allowWhileIdle: true }, channelId: "mq" }); }
    }
    if (cfg.appt) for (const a of S.planner.appts) for (const d of E.apptOccurrences(a, td, E.addDays(td, 30))) { const base = a.time ? atTime(d, a.time) : at9(d);
      for (const m of (a.remind && a.remind.length ? a.remind : [0])) { const t = new Date(base.getTime() - m * 6e4); if (t > now) out.push({ id: id++, title: a.title, body: `${dShort(d)}${a.time ? " " + a.time : ""}${a.place ? " · " + a.place : ""}`, schedule: { at: t, allowWhileIdle: true }, channelId: "mq" }); } }
    const mk = E.monthKey(td);
    for (const m of [mk, E.addMonths(mk, 1)]) {
      if (cfg.debt) for (const r of E.debtSchedule(S, m, td)) if (r.status === "planned") { const t = at9(E.addDays(r.due, -1)); if (t > now) out.push({ id: id++, title: `พรุ่งนี้ครบกำหนด ${r.debt.name}`, body: `${baht(r.planned)} · ${dShort(r.due)}`, schedule: { at: t, allowWhileIdle: true }, channelId: "mq" }); }
      if (cfg.bill) for (const f of E.expenseMonth(S, m).fixed) if (f.status !== "paid") { const t = at9(f.due); if (t > now) out.push({ id: id++, title: `จ่าย${f.item.name}`, body: `${baht(f.planned - f.paid)} วันนี้`, schedule: { at: t }, channelId: "mq" }); }
    }
    out.sort((a, b) => a.schedule.at - b.schedule.at);
    if (out.length) await LN.schedule({ notifications: out.slice(0, 60) });
  } catch (e) { /* notifications are best-effort */ }
}
function notifyCard() {
  if (!NATIVE) return "";
  const c = notifyCfg();
  const sw = (k, l) => `<label class="li" style="cursor:pointer"><input type="checkbox" data-act-chk="notify.${k}" ${c[k] ? "checked" : ""} style="width:22px;height:22px;accent-color:#E9A300"><div class="t"><b>${l}</b></div></label>`;
  return `<div class="card"><b>แจ้งเตือนบนมือถือ</b>${nview.notifyOK === false ? `<div class="warnbox" style="margin-top:8px">ยังไม่ได้อนุญาตการแจ้งเตือน <button class="link" data-act="askNotify" style="margin-left:auto">อนุญาต</button></div>` : ""}
    <div class="list" style="margin-top:4px">${sw("shift", "ก่อนเข้ากะ")}${sw("appt", "นัดหมาย (ตามเวลาที่ตั้งในนัด)")}${sw("debt", "หนี้ครบกำหนด (ก่อน 1 วัน 09:00)")}${sw("bill", "บิลครบกำหนด (09:00)")}</div>
    <div class="f" style="margin-top:8px"><label>เตือนก่อนเข้ากะ (นาที)</label><input type="number" min="5" max="240" data-bind="notify.shiftBefore" value="${c.shiftBefore}"></div></div>`;
}

/* ── home-screen widget ── */
function pushWidget() {
  if (!NATIVE || !MQN) return;
  try {
    const td = today(), sh = shiftOf(td), av = E.available(S, E.monthKey(td), td);
    let next = ""; for (let i = 1; i < 30; i++) { const d = E.addDays(td, i), c = shiftOf(d).c; if (isWork(c)) { next = `ถัดไป ${dShort(d)} ${SHN[c]}`; break; } }
    let toOff = 0; for (let i = 0; i < 30; i++) if (!isWork(shiftOf(E.addDays(td, i)).c)) { toOff = i; break; }
    MQN.setWidget({ shift: SHN[sh.c], time: isWork(sh.c) ? times(sh.c).join("–") : `Team ${S.profile.team}`, status: isWork(sh.c) ? (toOff ? `อีก ${toOff} วันถึงวันหยุด` : "") : "พักผ่อนให้เต็มที่", money: S.pay.salary ? baht(av.safe) : "—", daily: S.pay.salary ? `วันละ ${baht(av.daily)}` : "ตั้งเงินเดือนในแอป", next, kind: sh.c });
  } catch (e) {}
}

/* ── updates from GitHub Releases ── */
async function checkUpdates(manual) {
  if (!NATIVE) return;
  try {
    const rel = await MQN.httpGet({ url: `https://api.github.com/repos/${REPO}/releases/latest` }); if (rel.status !== 200) throw 0;
    const j = JSON.parse(rel.text), asset = n => (j.assets || []).find(a => a.name === n);
    const man = asset("manifest.json"); if (!man) throw 0;
    const m = JSON.parse((await MQN.httpGet({ url: man.browser_download_url })).text);
    const info = nview.info || await MQN.getInfo();
    if (m.native > info.nativeVersion && asset("money-quest.apk")) { nview.update = { kind: "apk", url: asset("money-quest.apk").browser_download_url, v: m.web, notes: m.notes || "" }; render(); return; }
    if (m.web > WEB_VERSION && (m.minNative || 0) <= info.nativeVersion && asset("web.zip")) {
      const { path } = await MQN.downloadWebBundle({ url: asset("web.zip").browser_download_url, version: m.web });
      nview.update = { kind: "web", path, v: m.web, notes: m.notes || "" }; render(); return;
    }
    if (manual) toast(`เป็นเวอร์ชันล่าสุดแล้ว (v${WEB_VERSION})`);
  } catch (e) { if (manual) toast("เช็คอัปเดตไม่ได้ ลองใหม่เมื่อมีเน็ต"); }
}
function updateBanner() {
  const u = nview.update; if (!u) return "";
  return `<div class="warnbox g" style="margin-bottom:14px;align-items:center"><div style="flex:1"><b>${u.kind === "apk" ? "มีแอปเวอร์ชันใหม่" : "อัปเดตพร้อมใช้"}</b><div style="font-size:13px">${esc(u.notes || (u.kind === "apk" ? "ต้องกดติดตั้งทับ ข้อมูลเดิมอยู่ครบ" : "แตะเพื่อเปิดเวอร์ชันใหม่"))}</div></div><button class="btn sm dark" data-act="applyUpdate">${u.kind === "apk" ? "ติดตั้ง" : "ใช้เลย"}</button></div>`;
}
async function applyUpdate() {
  const u = nview.update; if (!u) return;
  if (u.kind === "web") { await MQN.setPendingBundle({ path: u.path, version: u.v }); await WV.setServerBasePath({ path: u.path }); return; }
  const ok = (await MQN.canInstall()).allowed;
  if (!ok) { toast("อนุญาตให้ MONEY QUEST ติดตั้งอัปเดต แล้วกลับมากดอีกครั้ง"); await MQN.openInstallSettings(); return; }
  toast("กำลังดาวน์โหลดอัปเดต…"); try { await MQN.installApk({ url: u.url }); } catch (e) { toast("ดาวน์โหลดไม่สำเร็จ"); }
}
function versionCard() {
  if (!NATIVE) return "";
  const i = nview.info || {};
  return `<div class="card"><b>เวอร์ชัน</b><p class="sub" style="margin-top:6px">แอป ${esc(i.versionName || "")} · หน้าจอ v${WEB_VERSION}${i.rolledBack ? " · ย้อนกลับเวอร์ชันก่อนให้แล้ว" : ""}</p><button class="btn ghost sm" style="margin-top:10px" data-act="checkUpdate">เช็คอัปเดต</button></div>`;
}

/* ── hooks into the existing screens ── */
if (NATIVE) {
  const _mSlips = mSlips; mSlips = () => slipNativeCard() + _mSlips();
  const _pProfile = pProfile; pProfile = () => { const h = _pProfile(); return h.replace('<div class="card"><b>การแจ้งเตือน</b>', notifyCard() + versionCard() + '<div class="card hidden"><b>การแจ้งเตือน</b>'); };
  const _pHome = pHome; pHome = () => updateBanner() + _pHome();
  const _commit = commit; commit = (o = {}) => { _commit(o); scheduleNotifications(); pushWidget(); };
  const _render = render; render = () => { _render(); };
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el || !NATIVE) return; const a = el.dataset.act;
  const H = {
    askPhotos: async () => { try { const r = await MQN.requestPhotos(); nview.perm = r.granted; if (r.granted) { render(); scanAlbums(true); } else toast("ยังไม่ได้อนุญาต — เปิดได้ที่ ตั้งค่า → แอป → MONEY QUEST → สิทธิ์"); } catch (x) {} },
    scanNow: () => scanAlbums(true), albums: () => sheetAlbums(),
    albumsAuto: async () => { delete S.slipScan.albums; await MQN.setScanSettings({ albums: [] }); closeSheet(); commit(); toast("ใช้การเลือกอัลบั้มอัตโนมัติ"); },
    askNotify: async () => { const r = await LN.requestPermissions(); nview.notifyOK = r.display === "granted"; scheduleNotifications(); render(); },
    checkUpdate: () => checkUpdates(true), applyUpdate: () => applyUpdate()
  };
  if (H[a]) { e.preventDefault(); e.stopPropagation(); H[a](); }
}, true);
document.addEventListener("change", e => {
  const k = e.target.dataset.actChk; if (!k) return;
  if (k === "slipAuto") { slipScanState().auto = e.target.checked; commit(); }
  else if (k.startsWith("notify.")) { notifyCfg()[k.slice(7)] = e.target.checked; commit(); }
});

/* boot */
(async function () {
  const t = location.hash.slice(1); if (TABS.some(x => x[0] === t)) view.tab = t;
  render(); initCloud();
  if (!NATIVE) return;
  try {
    nview.info = await MQN.getInfo(); await MQN.markBooted();
    if (WEB_VERSION > (nview.info.bundledWebVersion || 0)) { try { await WV.persistServerBasePath(); } catch (e) {} }   // keep a downloaded bundle only after it booted
    if (nview.info.openTab === "slips") go("money", "slips");
    if (LN) { try { await LN.createChannel({ id: "mq", name: "MONEY QUEST", importance: 4 }); } catch (e) {}
      const p = await LN.checkPermissions(); if (p.display === "prompt") await LN.requestPermissions(); }
    scheduleNotifications(); pushWidget();
    setTimeout(() => scanAlbums(false), 800);
    setTimeout(() => checkUpdates(false), 4000);
    if (APP) {
      APP.addListener("appStateChange", s => { if (s.isActive) { render(); scanAlbums(false); pushWidget(); } });
      APP.addListener("backButton", () => { if ($("#sheet").classList.contains("show")) closeSheet(); else if (view.tab !== "home") go("home"); else APP.exitApp(); });
    }
  } catch (e) {}
})();
