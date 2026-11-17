/* MONEY QUEST — app layer (part 1: core, storage, art, Home, Journey) */
const E = MQ;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => E.ymd(new Date());
const fmt = (n, d = 0) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const baht = (n, d = 0) => (n < 0 ? "−฿" : "฿") + fmt(Math.abs(n), d);
const MON = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const MONS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const DOW = ["อา","จ","อ","พ","พฤ","ศ","ส"], DOWL = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const dLong = s => { const d = E.parse(s); return `${DOWL[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear() + 543}`; };
const dShort = s => { const d = E.parse(s); return `${d.getDate()} ${MONS[d.getMonth()]}`; };
const mLabel = mk => { const [y, m] = mk.split("-").map(Number); return `${MON[m - 1]} ${y + 543}`; };
const mShort = mk => { const [y, m] = mk.split("-").map(Number); return `${MONS[m - 1]} ${String(y + 543).slice(2)}`; };
const I = {
  home: '<svg class="i" viewBox="0 0 24 24"><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z"/></svg>',
  money: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 15h2"/></svg>',
  mtn: '<svg class="i" viewBox="0 0 24 24"><path d="M3 19l6.5-11 3.5 6 2-3 6 8z"/><path d="M8.2 10.2l1.3 1.3 1.4-1.4"/></svg>',
  cal: '<svg class="i" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  user: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="9" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>',
  plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  l: '<svg class="i" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  r: '<svg class="i" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  cam: '<svg class="i" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  file: '<svg class="i" viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>',
  dl: '<svg class="i" viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  check: '<svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bell: '<svg class="i" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  ext: '<svg class="i" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/></svg>'
};

/* ───────── roster (UACJ 3G2S Rev.01) & custom cycle ───────── */
const CAL_LEN = CAL.A.length;
function rosterCode(team, date) {
  let i = E.diffDays(CAL_START, date);
  if (i >= 0 && i < CAL_LEN) return { c: CAL[team][i], est: false };
  if (i >= CAL_LEN) { i -= Math.ceil((i - (CAL_LEN - 1)) / 12) * 12; while (i < CAL_LEN - 36) i += 12; }
  else { i += Math.ceil(-i / 12) * 12; while (i > 48) i -= 12; }
  let c = CAL[team][i]; if (c === "S") c = "H"; return { c, est: true };
}
function shiftOf(date, st = S) {
  const o = st.shift.overrides[date];
  let base;
  if (st.shift.mode === "custom") { const sq = st.shift.custom.seq; base = { c: sq.length ? sq[((E.diffDays(st.shift.custom.anchor, date) % sq.length) + sq.length) % sq.length] : "H", est: false }; }
  else base = rosterCode(st.profile.team || "C", date);
  return o ? { c: o, est: base.est, sw: true, base: base.c } : { ...base, sw: false, base: base.c };
}
const SHN = { D: "กะเช้า", N: "กะดึก", H: "วันหยุด", S: "หยุดโรงงาน" };
const SHS = { D: "เช้า", N: "ดึก", H: "หยุด", S: "ปิดรง." };
/** The two other teams of the 3G2S roster (shown small; the user's own team stays the main one). */
const otherTeams = () => S.shift.mode === "roster" ? ["A", "B", "C"].filter(t => t !== (S.profile.team || "C")) : [];
const teamChips = d => { const o = otherTeams(); return o.length ? `<span class="tcs">${o.map(t => { const c = rosterCode(t, d).c; return `<i class="tc k${c}" title="Team ${t} ${SHN[c]}">${t}</i>`; }).join("")}</span>` : ""; };
const teamLine = d => otherTeams().map(t => { const c = rosterCode(t, d).c; return `<span class="tl"><i class="tc k${c}">${t}</i>Team ${t} <b>${SHS[c]}</b>${isWork(c) ? ` <span class="muted">${times(c)[0]}</span>` : ""}</span>`; }).join("");
const isWork = c => c === "D" || c === "N";
const times = c => S.shift.times[c] || ["", ""];
const crosses = c => { const [a, b] = times(c); return b <= a; };
const shiftHours = c => { if (!isWork(c)) return 0; const [a, b] = times(c).map(x => x.split(":").map(Number)); let m = (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]); if (m <= 0) m += 1440; return m / 60; };
const atTime = (date, hm) => { const d = E.parse(date); const [h, m] = hm.split(":").map(Number); d.setHours(h, m, 0, 0); return d; };

/* ───────── state, storage, sync ───────── */
const KEY = "moneyquest:v1";
function normalize(o) {
  const d = E.defaultState(); if (!o || typeof o !== "object") return d;
  const s = Object.assign(d, o);
  for (const k of ["meta", "profile", "pay", "tax", "budget", "journey"]) s[k] = Object.assign(E.defaultState()[k], o[k] || {});
  s.tax.d = Object.assign(E.defaultState().tax.d, (o.tax || {}).d || {});
  s.shift = Object.assign(E.defaultState().shift, o.shift || {}); s.shift.times = Object.assign(E.defaultState().shift.times, (o.shift || {}).times || {});
  s.journey.weights = Object.assign(E.defaultState().journey.weights, (o.journey || {}).weights || {});
  s.planner = Object.assign({ appts: [], todos: [] }, o.planner || {});
  for (const k of ["debts", "debtPayments", "expenses", "spend", "goals", "audit"]) s[k] = Array.isArray(o[k]) ? o[k] : [];
  for (const k of ["ot", "payslips", "slips", "slipRules"]) s[k] = o[k] && typeof o[k] === "object" ? o[k] : {};
  s.owner = Object.assign({ names: [], accounts: [] }, o.owner || {});
  return s;
}
function loadLocal() { try { const r = localStorage.getItem(KEY); if (r) return normalize(JSON.parse(r)); } catch (e) {} return E.defaultState(); }
let S = loadLocal(), REAL = null;            // REAL holds the user's state while sample mode is on
const sampleMode = () => REAL !== null;
let db = null, me = null, sync = "local", wTimer = null, writing = false, again = false;
function audit(kind, msg) { S.audit.unshift({ at: Date.now(), kind, msg }); if (S.audit.length > 150) S.audit.length = 150; }
function commit(o = {}) {
  if (sampleMode()) { if (o.render !== false) render(); return; }
  S.meta.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  if (db && me) { setSync("wait"); clearTimeout(wTimer); wTimer = setTimeout(flush, 700); }
  if (o.render !== false) render();
}
async function flush() {
  if (writing) { again = true; return; } writing = true;
  try { const body = JSON.stringify(S); if (body.length > 240000) toast("ข้อมูลใกล้เต็มพื้นที่ซิงก์ — ลองสำรองไฟล์แล้วลบรายการเก่า"); await db.doc(`data/users/${me}/mq`).set({ s: body, updatedAt: S.meta.updatedAt }); setSync("on"); }
  catch (e) { setSync(e && e.code === "quota_exceeded" ? "full" : "local"); }
  writing = false; if (again) { again = false; flush(); }
}
function setSync(s) { sync = s; document.querySelectorAll("[data-sync]").forEach(el => el.innerHTML = syncHTML()); }
const syncHTML = () => `<span class="dot" style="background:${sync === "on" ? "var(--good)" : sync === "wait" ? "var(--sun-deep)" : "var(--ink-3)"}"></span>${sync === "on" ? "ซิงก์ข้ามเครื่องแล้ว" : sync === "wait" ? "กำลังบันทึก…" : sync === "full" ? "พื้นที่ซิงก์เต็ม" : "บันทึกในเครื่องนี้"}`;
async function initCloud() {
  if (!window.claude || !claude.use) return;
  try {
    const [dbx, user] = await Promise.all([claude.use("db"), claude.use("user")]);
    if (!dbx || !user) return; me = await user.id(); if (!me) return; db = dbx; setSync("wait");
    let first = true; const tmr = setTimeout(() => { if (first) setSync("local"); }, 10000);
    db.doc(`data/users/${me}/mq`).onSnapshot(snap => {
      if (snap.metadata.hasPendingWrites) return;
      if (!snap.metadata.fromCache) clearTimeout(tmr);
      const d = snap.exists ? snap.data() : null;
      const local = sampleMode() ? REAL : S;
      if (d && d.updatedAt > (local.meta.updatedAt || 0)) {
        try { const n = normalize(JSON.parse(d.s)); if (sampleMode()) REAL = n; else S = n; localStorage.setItem(KEY, d.s); render(); } catch (e) {}
        setSync("on");
      } else if (first && !snap.metadata.fromCache) { if (!d || d.updatedAt < (local.meta.updatedAt || 0)) { if (!sampleMode()) flush(); } else setSync("on"); }
      if (!snap.metadata.fromCache) first = false;
    }, () => setSync("local"));
  } catch (e) { setSync("local"); }
}

/* ───────── UI plumbing ───────── */
let toastT; function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600); }
let sheetSubmit = null;
function openSheet(html, onSubmit) {
  $("#sheetBody").innerHTML = html; sheetSubmit = onSubmit || null;
  $("#sheet").classList.add("show"); $("#scrim").classList.add("show");
  setTimeout(() => { const f = $("#sheetBody input:not([type=hidden]):not([readonly]),#sheetBody select"); if (f && window.innerWidth > 700) f.focus({ preventScroll: true }); }, 300);
}
function closeSheet() { $("#sheet").classList.remove("show"); $("#scrim").classList.remove("show"); sheetSubmit = null; }
const formData = f => Object.fromEntries(new FormData(f).entries());
const num = v => { const n = parseFloat(String(v ?? "").replace(/,/g, "")); return isFinite(n) ? n : 0; };
const view = { tab: "home", sel: today(), money: "overview", planner: "calendar", calView: "month", calMonth: E.monthKey(today()), expMonth: E.monthKey(today()), payMonth: E.monthKey(today()), otKey: E.periodKeyFor(today()), otDraft: null, taxYear: new Date().getFullYear(), simH: 10, lastFrac: null };
function go(tab, sub) { view.tab = tab; if (sub) { if (tab === "money") view.money = sub; if (tab === "planner") view.planner = sub; } closeSheet(); try { history.replaceState(null, "", "#" + tab); } catch (e) {} render(); window.scrollTo(0, 0); }

function confetti() {
  const box = document.createElement("div"); box.className = "confetti";
  const cols = ["#FFBE2E", "#7C9836", "#DED6FC", "#F7DCD6", "#6E3E2E", "#D5E8F5"];
  for (let i = 0; i < 60; i++) { const p = document.createElement("i"); p.style.left = Math.random() * 100 + "%"; p.style.background = cols[i % cols.length]; p.style.setProperty("--dx", (Math.random() * 200 - 100) + "px"); p.style.setProperty("--r", (Math.random() * 720) + "deg"); p.style.animationDelay = Math.random() * .25 + "s"; box.appendChild(p); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2200);
}
function xpPop(xp) { const e = document.createElement("div"); e.className = "xpfloat"; e.textContent = `+${xp} XP`; document.body.appendChild(e); setTimeout(() => e.remove(), 1500); }

/* ───────── illustrations (flat, hand-placed shapes) ───────── */
const pine = (x, y, s = 1, c = "#3F5E1C") => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -46 L13 -22 L7 -22 L17 -4 L9 -4 L20 14 L-20 14 L-9 -4 L-17 -4 L-7 -22 L-13 -22Z" fill="${c}"/><rect x="-2.5" y="14" width="5" height="7" fill="#5A3A22"/></g>`;
function sceneArt(c) {
  if (c === "N") return `<svg class="art" viewBox="0 0 360 170" aria-hidden="true">
    <circle cx="276" cy="52" r="26" fill="#FFE6B0"/><circle cx="288" cy="44" r="24" fill="#3A2B28"/>
    ${[[60,30],[110,58],[170,24],[220,70],[330,96],[30,84],[150,90]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i%3?1.6:2.4}" fill="#FFE6B0" opacity=".9"/>`).join("")}
    <path d="M0 120 C60 96 110 104 170 116 C230 128 290 100 360 108 V170 H0Z" fill="#2E3A1F"/>
    <path d="M0 140 C80 122 150 150 230 140 C290 132 330 142 360 136 V170 H0Z" fill="#24301A"/>
    ${pine(40,132,.9,"#1C2A12")}${pine(318,126,1,"#1C2A12")}${pine(300,138,.7,"#1C2A12")}
    <rect x="150" y="118" width="40" height="26" rx="3" fill="#5A3A2E"/><path d="M146 120 L170 100 L194 120Z" fill="#6E3E2E"/><rect x="164" y="126" width="12" height="18" fill="#FFD36B"/>
  </svg>`;
  if (c === "D") return `<svg class="art" viewBox="0 0 360 170" aria-hidden="true">
    <g transform="translate(180 64)">
      ${Array.from({length:12},(_,i)=>`<rect x="-2" y="-52" width="4" height="12" rx="2" fill="#F08A1C" transform="rotate(${i*30})"/>`).join("")}
      <circle r="32" fill="#F7941D"/><circle r="28" fill="#FF9F2A"/>
      <circle cx="-9" cy="-3" r="2.6" fill="#3B2412"/><circle cx="9" cy="-3" r="2.6" fill="#3B2412"/>
      <path d="M-7 7 Q0 13 7 7" stroke="#3B2412" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="-16" cy="6" r="4" fill="#FF7A59" opacity=".55"/><circle cx="16" cy="6" r="4" fill="#FF7A59" opacity=".55"/>
    </g>
    <path d="M52 40 q4 -4 8 0 q4 -4 8 0" stroke="#5A3A22" stroke-width="2" fill="none"/><path d="M276 54 q3 -3 6 0 q3 -3 6 0" stroke="#5A3A22" stroke-width="2" fill="none"/>
    <path d="M0 116 C70 92 130 120 200 112 C260 104 300 92 360 104 V170 H0Z" fill="#9CB84A"/>
    <path d="M0 138 C90 116 170 146 250 134 C300 128 330 132 360 128 V170 H0Z" fill="#7C9836"/>
    ${pine(26,128,1.1)}${pine(58,138,.8)}${pine(326,120,1.15)}${pine(298,134,.8)}
    <path d="M300 30 h26 a8 8 0 0 0 0 -16 a12 12 0 0 0 -22 -2 a8 8 0 0 0 -4 18z" fill="#fff" opacity=".9"/>
  </svg>`;
  return `<svg class="art" viewBox="0 0 360 170" aria-hidden="true">
    <circle cx="70" cy="56" r="22" fill="#FFBE2E"/>
    <path d="M250 40 h34 a10 10 0 0 0 0 -20 a14 14 0 0 0 -27 -3 a10 10 0 0 0 -7 23z" fill="#fff"/>
    <path d="M0 112 C70 96 140 118 210 106 C270 96 320 100 360 96 V170 H0Z" fill="#B9CF7E"/>
    <path d="M0 136 C80 122 170 148 250 132 C300 124 330 132 360 128 V170 H0Z" fill="#8FAE4B"/>
    <path d="M150 132 L180 92 L210 132Z" fill="#E9A300"/><path d="M180 92 L190 132 L170 132Z" fill="#C98100"/><path d="M180 92 v-14 l12 5 -12 5" fill="#6E3E2E" stroke="#6E3E2E" stroke-width="1.5"/>
    ${pine(290,128,1.1,"#5E7A22")}${pine(320,136,.8,"#5E7A22")}${pine(40,134,.9,"#5E7A22")}
  </svg>`;
}
const SCENE_BG = { D: "#FFC53D", N: "#3A2B28", H: "#E4EFC9", S: "#E8E2D6" };

/* ───────── computed snapshot used by several screens ───────── */
function snapshot() {
  const td = today(), mk = E.monthKey(td);
  return { td, mk, av: E.available(S, mk, td), jp: E.journeyProgress(S, td), xp: E.xpTotal(S) };
}
function remindersSoon(horizonH = 36) {
  const now = new Date(), until = new Date(now.getTime() + horizonH * 3600e3), td = today(), out = [];
  for (const a of S.planner.appts) {
    for (const d of E.apptOccurrences(a, E.addDays(td, -1), E.addDays(td, 3))) {
      const at = a.time ? atTime(d, a.time) : atTime(d, "09:00");
      if (at < now) continue;
      const offs = (a.remind && a.remind.length ? a.remind : [0]);
      const fire = offs.map(m => new Date(at.getTime() - m * 60e3)).filter(x => x <= until);
      if (fire.length) out.push({ kind: "appt", at, title: a.title, sub: `${dShort(d)}${a.time ? " · " + a.time : ""}${a.place ? " · " + a.place : ""}`, id: a.id, date: d });
    }
  }
  for (const r of E.debtSchedule(S, E.monthKey(td), td)) if ((r.status === "planned" && E.diffDays(td, r.due) <= 3) || r.status === "overdue") out.push({ kind: "debt", at: E.parse(r.due), title: `${r.status === "overdue" ? "เลยกำหนด" : "ครบกำหนด"}: ${r.debt.name}`, sub: `${dShort(r.due)} · ${baht(r.planned)}`, overdue: r.status === "overdue" });
  for (const f of E.expenseMonth(S, E.monthKey(td)).fixed) if (f.status !== "paid" && E.diffDays(td, f.due) >= 0 && E.diffDays(td, f.due) <= 3) out.push({ kind: "bill", at: E.parse(f.due), title: `จ่าย${f.item.name}`, sub: `${dShort(f.due)} · ${baht(f.planned - f.paid)}` });
  return out.sort((a, b) => a.at - b.at);
}

/* ───────── HOME ───────── */
function pHome() {
  const { td, mk, av, jp, xp } = snapshot();
  const sel = view.sel, sh = shiftOf(td);
  const hr = new Date().getHours(); const greet = hr < 11 ? "อรุณสวัสดิ์" : hr < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const name = S.profile.name || "เพื่อนนักเดินทาง";
  const ws = E.addDays(td, -((E.parse(td).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => { const d = E.addDays(ws, i), c = shiftOf(d).c;
    return `<button class="wk ${d === td ? "sel" : ""} ${HOL[d] ? "hol" : ""}" data-act="planDay" data-d="${d}" aria-label="${dLong(d)} ${SHN[c]}">${DOW[E.parse(d).getDay()]}<span class="n">${E.parse(d).getDate()}</span><span class="sd" style="background:var(--${c})"></span>${teamChips(d)}</button>`; }).join("");
  // today's shift status
  const now = new Date(); let status = "", c = sh.c;
  const yd = E.addDays(td, -1), yc = shiftOf(yd).c;
  const dur = ms => { const m = Math.max(0, Math.round(ms / 6e4)); return m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} นาที` : `${m} นาที`; };
  if (isWork(yc) && crosses(yc) && now < atTime(td, times(yc)[1])) { c = yc; status = `ต่อจากเมื่อวาน · เลิกในอีก ${dur(atTime(td, times(yc)[1]) - now)}`; }
  else if (isWork(c)) { const s = atTime(td, times(c)[0]), e = crosses(c) ? atTime(E.addDays(td, 1), times(c)[1]) : atTime(td, times(c)[1]);
    status = now < s ? `เริ่มงานในอีก ${dur(s - now)}` : now < e ? `กำลังทำงาน · เลิกในอีก ${dur(e - now)}` : "เลิกงานแล้ว พักผ่อนเถอะ"; }
  let toOff = 0; for (let i = 0; i < 30; i++) { if (!isWork(shiftOf(E.addDays(td, i)).c)) { toOff = i; break; } }
  const offLine = isWork(sh.c) ? (toOff === 0 ? "" : `อีก ${toOff} วันถึงวันหยุด`) : (() => { for (let i = 1; i < 30; i++) { const n = E.addDays(td, i), nc = shiftOf(n).c; if (isWork(nc)) return `${SHN[nc]}ถัดไป ${dShort(n)} ${times(nc)[0]}`; } return ""; })();
  const otRec = S.ot[E.periodKeyFor(td)]; const otH = otRec ? E.otCalc(otRec.values, S.pay).otHours : 0;
  const tm = shiftOf(E.addDays(td, 1)).c;
  const sceneC = isWork(c) ? c : sh.c === "S" ? "S" : "H";
  const hero = `<div class="hero">
    <button class="scene ${sceneC}" style="background:${SCENE_BG[sceneC]}" data-act="planDay" data-d="${td}">
      <div class="ttl">${SHN[c]}${sh.sw && c === sh.c ? " (สลับกะ)" : ""}</div>
      <div class="tm">${isWork(c) ? `${times(c).join(" – ")} · ${fmt(shiftHours(c), 2).replace(/\.?0+$/, "")} ชม.` : "Team " + S.profile.team + " · " + dShort(td)}</div>
      ${status || offLine ? `<div class="st">${esc(status || offLine)}</div>` : ""}
      ${status && offLine ? `<div class="st" style="margin-left:6px">${esc(offLine)}</div>` : ""}
      ${sceneArt(sceneC)}
      <div style="height:${isWork(c) ? 150 : 140}px"></div>
    </button>
    <button class="side-next" data-act="planDay" data-d="${E.addDays(td, 1)}">พรุ่งนี้ <b>${SHN[tm]}</b></button></div>`;
  // money
  const safe = av.safe;
  const bars = [{ v: av.fixed, c: "var(--cocoa)" }, { v: av.debt, c: "var(--bad)" }, { v: av.savings + av.goals, c: "var(--olive)" }, { v: av.varSpent, c: "var(--taupe)" }, { v: Math.max(0, safe), c: "var(--sun)" }];
  const mx = Math.max(1, ...bars.map(b => b.v));
  const cash = `<button class="card cash" data-act="goMoney" data-sub="overview">
    <div><div class="lbl">เงินเหลือใช้จริง · ${mLabel(mk)}</div><div class="money big" style="color:${safe < 0 ? "var(--bad)" : "var(--ink)"}">${baht(safe)}</div></div>
    <div class="mini-bars" aria-hidden="true">${bars.map(b => `<i style="height:${Math.max(6, b.v / mx * 64)}px;background:${b.c}"></i>`).join("")}</div>
    <div class="daily">${S.pay.salary ? `ใช้ได้วันละ <b>${baht(av.daily)}</b> · อีก ${av.daysLeft} วันถึงเงินเดือน (${dShort(av.payday)})` : `<span class="link">ตั้งค่าเงินเดือนก่อน</span> เพื่อคำนวณเงินเหลือใช้จริง`}</div>
    <div class="row" style="grid-column:1/-1;margin-top:8px;gap:6px">
      <span class="tag">รับสุทธิ ${baht(av.net)}</span><span class="tag r">ภาระ ${baht(av.fixed + av.debt)}</span><span class="tag g">ออม/เป้าหมาย ${baht(av.savings + av.goals)}</span>${otH ? `<span class="tag l">OT รอบนี้ ${fmt(otH, 1)} ชม.</span>` : ""}
    </div></button>`;
  // reminders + upcoming
  const rem = remindersSoon(36);
  const up = [];
  for (const a of S.planner.appts) for (const d of E.apptOccurrences(a, td, E.addDays(td, 30))) up.push({ d, t: a.time || "", title: a.title, sub: a.place || a.note || "", tag: a.type || "นัดหมาย", act: `data-act="editAppt" data-id="${a.id}"` });
  for (const r of E.debtSchedule(S, mk, td)) if (r.status !== "paid" && r.status !== "closed") up.push({ d: r.due, t: "", title: `ผ่อน ${r.debt.name}`, sub: baht(r.planned), tag: r.status === "overdue" ? "เลยกำหนด" : "หนี้", act: `data-act="goMoney" data-sub="debt"`, bad: r.status === "overdue" });
  for (const f of E.expenseMonth(S, mk).fixed) if (f.status !== "paid" && f.due >= td) up.push({ d: f.due, t: "", title: f.item.name, sub: baht(f.planned - f.paid), tag: "ค่าใช้จ่าย", act: `data-act="goMoney" data-sub="expense"` });
  for (const t of S.planner.todos) if (!t.done && t.due) up.push({ d: t.due, t: "", title: t.title, sub: "To-do", tag: "งาน", act: `data-act="goPlanner" data-sub="todo"` });
  up.sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t));
  const qc = up.slice(0, 8).map((u, i) => `<button class="qc c${(i % 5) + 1}" ${u.act}><b>${esc(u.title)}</b><p>${esc(u.sub)}</p><div class="ft"><span>${u.d === td ? "วันนี้" : dShort(u.d)}${u.t ? " · " + u.t : ""}</span><span class="tag" ${u.bad ? 'style="color:var(--bad)"' : ""}>${esc(u.tag)}</span></div></button>`).join("");
  const next = jp.next;
  const lv = E.level(xp);
  const jmini = `<button class="card jmini" data-act="go" data-tab="journey">${miniMountain(jp.overall)}
    <div class="t"><div class="sub">My Journey · Lv.${lv.lv}</div><div class="pct">${Math.round(jp.overall * 100)}%</div>
    <div class="sub" style="margin-top:4px">${next ? `ถัดไป: <b style="color:var(--ink)">${next.name}</b> — ${next.sub}` : "ถึงยอดเขาแล้ว!"}</div></div></button>`;
  return `${sampleBanner()}
  <div class="top"><div class="who"><div class="sub">${greet} · ${dLong(td)}</div><h1 class="hi">สวัสดี, ${esc(name)}</h1></div>
    <button class="avatar" data-act="go" data-tab="profile" aria-label="โปรไฟล์">${esc((S.profile.name || "M").slice(0, 1).toUpperCase())}</button></div>
  <div class="week">${week}</div>
  <div class="home-grid"><div class="stack">${hero}${otherTeams().length ? `<button class="card teams" data-act="goPlanner" data-sub="shift"><span class="muted" style="font-size:13px;font-weight:600">วันนี้ทีมอื่น</span>${teamLine(td)}</button>` : ""}${cash}</div>
  <div class="stack">
    ${rem.length ? `<div class="card"><div class="between" style="margin-bottom:6px"><b>${I.bell.replace('class="i"', 'class="i" style="width:18px;height:18px;vertical-align:-3px"')} เตือนเร็ว ๆ นี้</b><span class="tag y">${rem.length}</span></div>${rem.slice(0, 4).map(r => `<div class="li"><span class="dot" style="background:${r.overdue ? "var(--bad)" : r.kind === "appt" ? "var(--lav-ink)" : "var(--sun-deep)"}"></span><div class="t"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></div></div>`).join("")}</div>` : ""}
    <div class="sec-h" style="margin-top:4px"><h2>กำลังจะถึง</h2><button data-act="goPlanner" data-sub="calendar">ดูทั้งหมด</button></div>
    ${qc ? `<div class="qcards">${qc}</div>` : `<div class="card empty"><b>ยังไม่มีนัดหมายหรือบิลใน 30 วัน</b>กด + ที่ปฏิทินเพื่อเพิ่มนัดหมาย</div>`}
    <div class="sec-h"><h2>My Journey</h2><button data-act="go" data-tab="journey">ไปผจญภัย</button></div>
    ${jmini}
  </div></div>`;
}
function sampleBanner() { return sampleMode() ? `<div class="warnbox" style="margin-bottom:14px"><b>โหมดข้อมูลตัวอย่าง</b> — ไม่บันทึก ไม่ปนกับข้อมูลจริง <button class="link" data-act="sampleOff" style="margin-left:auto">ออก</button></div>` : ""; }

/* ───────── JOURNEY art ───────── */
const TRAIL = "M200 470 C116 456 104 426 168 404 C250 380 292 356 232 330 C160 302 136 282 200 258 C262 236 266 212 216 194 C168 178 172 156 202 138 C228 122 220 102 200 82";
const CP_AT = [0, .2, .4, .6, .8, 1];
function miniMountain(frac) {
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" fill="#CFE6F3"/><circle cx="92" cy="28" r="10" fill="#FFD45C"/>
  <path d="M0 120 L60 22 L120 120Z" fill="#8FAE4B"/><path d="M60 22 L120 120 L84 120Z" fill="#7C9836"/><path d="M60 22 L70 40 L64 37 L60 44 L55 37 L50 40Z" fill="#fff"/>
  <path d="M0 106 C30 96 60 110 120 98 V120 H0Z" fill="#5E7A22"/>
  <circle cx="${60 + Math.sin(frac * 9) * 14}" cy="${112 - frac * 86}" r="6" fill="#FFBE2E" stroke="#1D1A16" stroke-width="2"/></svg>`;
}
function worldSVG(jp) {
  const reached = jp.reached;
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" id="worldSvg" aria-label="แผนที่ภูเขา">
    <rect width="400" height="500" fill="#CFE6F3"/><rect y="170" width="400" height="330" fill="#DCEEF7"/>
    <circle cx="332" cy="74" r="28" fill="#FFD45C"/><circle cx="332" cy="74" r="40" fill="#FFD45C" opacity=".22"/>
    <g class="cloud"><path d="M40 70 h46 a12 12 0 0 0 0-24 a17 17 0 0 0-32-4 a12 12 0 0 0-14 28z" fill="#fff"/></g>
    <g class="cloud c2"><path d="M10 130 h36 a10 10 0 0 0 0-20 a14 14 0 0 0-26-3 a10 10 0 0 0-10 23z" fill="#fff" opacity=".85"/></g>
    <path d="M0 270 L60 196 L104 236 L160 160 L200 196 L250 150 L304 214 L352 176 L400 210 V500 H0Z" fill="#C9C1EE"/>
    <path d="M24 500 L200 66 L376 500Z" fill="#9DBA5C"/><path d="M200 66 L376 500 L270 500 L236 300Z" fill="#86A445"/>
    <path d="M200 66 L230 136 L214 128 L202 144 L188 126 L170 136Z" fill="#fff"/><path d="M200 66 L230 136 L214 128Z" fill="#E6EEF4"/>
    <path d="M0 400 C70 372 130 410 200 396 C270 382 330 414 400 392 V500 H0Z" fill="#7C9836"/>
    <path d="M0 448 C90 424 160 460 240 446 C310 434 350 452 400 442 V500 H0Z" fill="#5E7A22"/>
    ${pine(36, 430, 1.1)}${pine(70, 446, .8)}${pine(352, 420, 1.2)}${pine(318, 440, .85)}${pine(372, 452, .7)}${pine(120, 392, .6, "#5E7A22")}${pine(290, 380, .6, "#5E7A22")}
    <path id="trail" d="${TRAIL}" fill="none" stroke="#FFF8E6" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 12" opacity=".95"/>
    <path id="trailDone" d="${TRAIL}" fill="none" stroke="#FFBE2E" stroke-width="7" stroke-linecap="round"/>
    ${E.CHECKPOINTS.map((cp, i) => `<g class="cp" id="cp${i}" data-act="cpInfo" data-i="${i}" tabindex="0" role="button" aria-label="${cp.name}">
      ${i === 5 ? `<g class="flag"><rect x="-1.5" y="-44" width="3" height="44" fill="#1D1A16"/><path d="M1.5 -44 L30 -36 L1.5 -28Z" fill="${reached[cp.id] ? "#FFBE2E" : "#fff"}" stroke="#1D1A16" stroke-width="1.5"/></g>`
        : `<path d="M-16 0 L0 -22 L16 0Z" fill="${reached[cp.id] ? "#E9A300" : "#EFEAE0"}" stroke="#1D1A16" stroke-width="1.6" stroke-linejoin="round"/><path d="M0 -22 L5 0 L-5 0Z" fill="${reached[cp.id] ? "#C98100" : "#D8D1C4"}"/>
           <g class="flag"><rect x="12" y="-36" width="2" height="16" fill="#1D1A16"/><path d="M14 -36 L26 -32 L14 -28Z" fill="${reached[cp.id] ? "#FFBE2E" : "#fff"}" stroke="#1D1A16" stroke-width="1"/></g>`}
      <rect x="-30" y="6" width="60" height="18" rx="9" fill="${reached[cp.id] ? "#1D1A16" : "rgba(255,255,255,.9)"}"/>
      <text y="19" text-anchor="middle" font-size="10" font-weight="700" fill="${reached[cp.id] ? "#fff" : "#1D1A16"}" font-family="Plus Jakarta Sans,sans-serif">${i === 0 ? "BASE" : i === 5 ? "SUMMIT" : "CP " + i}</text></g>`).join("")}
    <g id="hiker"><g class="bob">
      <ellipse cx="0" cy="2" rx="11" ry="3" fill="rgba(0,0,0,.18)"/>
      <rect x="-9" y="-26" width="9" height="16" rx="3" fill="#6E3E2E"/>
      <rect x="-5" y="-27" width="12" height="20" rx="5" fill="#FFBE2E" stroke="#1D1A16" stroke-width="1.6"/>
      <rect x="-4" y="-8" width="4" height="9" rx="2" fill="#1D1A16"/><rect x="2" y="-8" width="4" height="9" rx="2" fill="#1D1A16"/>
      <circle cx="1" cy="-34" r="7" fill="#F4C9A0" stroke="#1D1A16" stroke-width="1.6"/>
      <path d="M-6.5 -36 Q1 -46 8.5 -36Z" fill="#7C9836" stroke="#1D1A16" stroke-width="1.4"/>
      <circle cx="3.5" cy="-34" r="1.1" fill="#1D1A16"/>
      <path d="M9 -22 L14 -2" stroke="#6E3E2E" stroke-width="2" stroke-linecap="round"/>
    </g></g>
  </svg>`;
}
function layoutWorld(frac) {
  const path = document.getElementById("trail"); if (!path) return;
  const L = path.getTotalLength();
  E.CHECKPOINTS.forEach((_, i) => { const p = path.getPointAtLength(L * CP_AT[i]); const g = document.getElementById("cp" + i); if (g) g.setAttribute("transform", `translate(${p.x} ${p.y})`); });
  // the trail path runs from the foot (Base Camp) to the summit
  const done = document.getElementById("trailDone");
  const place = f => { const p = path.getPointAtLength(L * f); document.getElementById("hiker")?.setAttribute("transform", `translate(${p.x} ${p.y})`); done.setAttribute("stroke-dasharray", `${L * f} ${L}`); };
  const from = view.lastFrac == null ? 0 : view.lastFrac, to = Math.max(0, Math.min(1, frac));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(to - from) < .002) { place(to); view.lastFrac = to; return; }
  const t0 = performance.now(), dur = 1400;
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); place(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); else view.lastFrac = to; };
  requestAnimationFrame(step);
}
const MISSION_ICON = { save2k: "🪙", debtOnTime: "🛡️", cut500: "✂️", noNewDebt: "🚫", otSave: "⏱️", streak3: "🔥" };
function badgeArt(i, on) {
  const cols = [["#FFBE2E", "#E9A300"], ["#C4452F", "#8F2E1E"], ["#7C9836", "#5E7A22"], ["#DED6FC", "#5B4BB0"], ["#6E3E2E", "#4A2A1E"]][i % 5];
  const sym = ["<text x='32' y='39' text-anchor='middle' font-size='16' font-weight='800' fill='#1D1A16'>10K</text>", "<path d='M24 40 L40 24 M26 24 L40 38' stroke='#fff' stroke-width='4' stroke-linecap='round'/>", "<path d='M22 34 l7 7 l14 -16' stroke='#fff' stroke-width='4' fill='none' stroke-linecap='round'/>", "<path d='M32 22 l3 7 7 .6-5.4 4.6 1.7 7-6.3-3.8-6.3 3.8 1.7-7L22 29.6l7-.6z' fill='#5B4BB0'/>", "<path d='M20 42 L32 22 L44 42Z' fill='#FFBE2E'/>"][i % 5];
  return `<svg viewBox="0 0 64 64"><path d="M20 4 L32 16 L44 4 L44 14 L32 22 L20 14Z" fill="${on ? cols[1] : "#ccc"}"/><circle cx="32" cy="36" r="22" fill="${cols[0]}" stroke="${cols[1]}" stroke-width="4"/>${sym}</svg>`;
}

function pJourney() {
  const { td, mk, jp, xp } = snapshot();
  const lv = E.level(xp);
  const nb = E.awardBadges(S); if (nb.length) { setTimeout(() => { confetti(); toast(`ปลดล็อก ${nb.map(b => b.name).join(", ")}!`); }, 300); audit("badge", nb.map(b => b.name).join(", ")); commit({ render: false }); }
  const cur = E.missionsFor(S, mk, td), prev = E.missionsFor(S, E.addMonths(mk, -1), td).filter(m => m.claimable);
  const mrow = (m, mkx) => `<div class="mission ${m.claimed ? "done" : ""}"><div class="mi">${MISSION_ICON[m.id] || "⭐"}</div>
    <div><b>${esc(m.title)}</b><small>${m.na ? "ยังไม่มีข้อมูลสำหรับภารกิจนี้" : m.claimed ? "รับรางวัลแล้ว" : m.waiting ? "ทำได้แล้ว — รับรางวัลได้หลังสิ้นเดือน" : `${fmt(Math.max(0, m.value))} / ${fmt(m.target)}`} · ${m.xp} XP</small><div class="bar"><i style="width:${m.pct * 100}%;${m.met ? "background:var(--olive)" : ""}"></i></div></div>
    ${m.claimable ? `<button class="claim" data-act="claim" data-m="${m.id}" data-mk="${mkx}">รับ ${m.xp} XP</button>` : m.claimed ? `<span class="tag g">${I.check.replace('class="i"', 'class="i" style="width:16px;height:16px"')}</span>` : ""}</div>`;
  const goals = S.goals.map(g => { const gi = E.goalInfo(g, td); return `<button class="goal" data-act="goal" data-id="${g.id}"><div class="gi">${g.img ? `<img src="${g.img}" alt="">` : esc(g.icon || "🎯")}</div>
    <div><div class="between"><b>${esc(g.name)}${g.isEmergency ? ' <span class="tag g">ฉุกเฉิน</span>' : ""}</b><b>${Math.round(gi.pct * 100)}%</b></div>
    <div class="bar" style="margin:8px 0 6px"><i style="width:${gi.pct * 100}%"></i></div>
    <small class="muted">${baht(gi.saved)} / ${baht(gi.target)} · ${gi.remaining ? (gi.eta ? `ถึงเป้า ${mShort(gi.eta)}` : "ยังไม่ได้ตั้งเงินออมต่อเดือน") : "สำเร็จแล้ว!"}${gi.suggested && gi.remaining ? ` · ควรเก็บ ${baht(gi.suggested)}/ด.` : ""}</small></div></button>`; }).join("");
  const parts = jp.parts.map(p => `<div class="part"><small>${p.label}${p.weight ? ` · น้ำหนัก ${p.weight}` : " · ไม่นับ"}</small><b>${Math.round(p.pct * 100)}%</b><div class="bar" style="margin-top:6px;height:7px"><i style="width:${p.pct * 100}%;background:var(--olive)"></i></div></div>`).join("");
  const next = jp.next;
  setTimeout(() => layoutWorld(jp.overall), 30);
  return `${sampleBanner()}<div class="jgrid"><div>
    <div class="jhud"><div class="lvl"><div><small>LEVEL</small>${lv.lv}</div></div>
      <div class="xpbar"><div class="between" style="font-size:13px;font-weight:700;margin-bottom:6px"><span>${fmt(xp)} XP</span><span class="muted">อีก ${fmt(lv.need - lv.into)} XP ถึง Lv.${lv.lv + 1}</span></div><div class="bar"><i style="width:${lv.into / lv.need * 100}%"></i></div></div></div>
    <div class="world">${worldSVG(jp)}
      <div class="pctbig"><b>${Math.round(jp.overall * 100)}%</b><small>ระยะทางสู่ยอดเขา</small></div>
    </div>
    <button class="nextcp" data-act="cpInfo" data-i="${next ? E.CHECKPOINTS.indexOf(next) : 5}"><span class="ic" style="background:var(--sun)">${next ? "⛺" : "🏆"}</span><span style="flex:1"><b>${next ? next.name + " — " + next.sub : "พิชิตยอดเขาแล้ว!"}</b><small>${next ? cpHint(next.id, jp) : "ตั้งเป้าหมายใหม่เพื่อเดินทางต่อ"}</small></span>${I.r}</button></div>
  <div>
    <div class="sec-h"><h2>ภารกิจเดือนนี้</h2><span class="muted" style="font-size:13px">${mLabel(mk)}</span></div>
    <div class="stack">${prev.map(m => mrow({ ...m, title: m.title + " · " + mLabel(E.addMonths(mk, -1)) }, E.addMonths(mk, -1))).join("")}${cur.map(m => mrow(m, mk)).join("")}</div>
    <div class="sec-h"><h2>เป้าหมายของฉัน</h2><button data-act="goal" data-id="">+ เพิ่มเป้าหมาย</button></div>
    <div class="stack">${goals || `<div class="card empty"><b>ยังไม่มีเป้าหมาย</b>เพิ่มของที่อยากได้ หรือเงินสำรองฉุกเฉิน แล้วตัวละครจะเริ่มเดิน</div>`}</div>
    <div class="sec-h"><h2>ความก้าวหน้า</h2><button data-act="weights">ปรับน้ำหนัก</button></div>
    <div class="parts">${parts}</div>
    <div class="sec-h"><h2>เหรียญรางวัล</h2><span class="muted" style="font-size:13px">${Object.keys(S.journey.badges).length}/${E.BADGES.length}</span></div>
    <div class="badges">${E.BADGES.map((b, i) => `<div class="badge ${S.journey.badges[b.id] ? "" : "lock"}">${badgeArt(i, !!S.journey.badges[b.id])}<b>${b.name}</b>${esc(b.desc)}</div>`).join("")}</div>
  </div></div>`;
}
function cpHint(id, jp) {
  const em = S.goals.find(g => g.isEmergency);
  return ({ base: "ตั้งเงินเดือนและเพิ่มค่าใช้จ่ายหรือเป้าหมายอย่างน้อย 1 รายการ",
    cp1: "บันทึกการจ่ายหนี้งวดแรกในหน้า หนี้",
    cp2: `ปิดหนี้ดอกเบี้ย 15% ขึ้นไปให้หมด (เหลือ ${S.debts.filter(d => +d.apr >= 15 && +d.balance > 0).length} บัญชี)`,
    cp3: em ? `เงินสำรองฉุกเฉินถึง ${Math.round(E.goalInfo(em).pct * 100)}% แล้ว` : "สร้างเป้าหมาย “เงินสำรองฉุกเฉิน”",
    cp4: "เก็บเงินซื้อของที่อยากได้ให้ครบ 1 อย่าง",
    summit: `ความก้าวหน้ารวม ${Math.round(jp.overall * 100)}% — ต้องถึง 95%` })[id] || "";
}
