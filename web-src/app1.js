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
  for (const k of ["debts", "debtPayments", "expenses", "spend", "goals", "audit", "installments", "cardStatements", "refRates"]) s[k] = Array.isArray(o[k]) ? o[k] : [];
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


/* ───────── Home: the day dial + the shift card for the chosen day ───────── */
function heroHTML(d) {
  const td = today(), isToday = d === td, sh = shiftOf(d);
  const now = new Date(); let status = "", c = sh.c;
  const dur = ms => { const m = Math.max(0, Math.round(ms / 6e4)); return m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} นาที` : `${m} นาที`; };
  if (isToday) {
    const yd = E.addDays(td, -1), yc = shiftOf(yd).c;
    if (isWork(yc) && crosses(yc) && now < atTime(td, times(yc)[1])) { c = yc; status = `ต่อจากเมื่อวาน · เลิกในอีก ${dur(atTime(td, times(yc)[1]) - now)}`; }
    else if (isWork(c)) { const s = atTime(td, times(c)[0]), e = crosses(c) ? atTime(E.addDays(td, 1), times(c)[1]) : atTime(td, times(c)[1]);
      status = now < s ? `เริ่มงานในอีก ${dur(s - now)}` : now < e ? `กำลังทำงาน · เลิกในอีก ${dur(e - now)}` : "เลิกงานแล้ว พักผ่อนเถอะ"; }
  } else { const n = E.diffDays(td, d); status = n === 1 ? "พรุ่งนี้" : n === -1 ? "เมื่อวาน" : n > 0 ? `อีก ${n} วัน` : `${-n} วันก่อน`; }
  let nextLine = "";
  if (isWork(sh.c)) { let k = 0; for (let i = 0; i < 30; i++) if (!isWork(shiftOf(E.addDays(d, i)).c)) { k = i; break; } nextLine = k ? `อีก <b>${k} วัน</b> ถึงวันหยุด` : ""; }
  else for (let i = 1; i < 30; i++) { const n = E.addDays(d, i), nc = shiftOf(n).c; if (isWork(nc)) { nextLine = `กะถัดไป <b>${SHN[nc].replace("กะ", "")} ${dShort(n)} ${times(nc)[0]}</b>`; break; } }
  const ot = otherTeams().map(t => { const x = rosterCode(t, d).c; return `<span class="tp k${x}"><i>${t}</i>${SHS[x]}${isWork(x) ? ` ${times(x)[0]}` : ""}</span>`; }).join("");
  return `<button class="card shiftcard k${c}" data-act="planDay" data-d="${d}">
    <span class="sl k${c}">${c}</span>
    <span class="sc"><b>${SHN[c]}${sh.sw && c === sh.c ? " (สลับกะ)" : ""} · Team ${S.profile.team || "C"}</b>
      <small>${isToday ? "" : dLong(d).replace(/ \d{4}$/, "") + " · "}${isWork(c) ? `${times(c).join(" – ")} · ${fmt(shiftHours(c), 2).replace(/\.?0+$/, "")} ชม.` : HOL[d] ? esc(HOL[d][0]) : "พักผ่อนให้เต็มที่"}</small>
      ${status || nextLine ? `<small class="st">${status ? esc(status) : ""}${status && nextLine ? " · " : ""}${nextLine}</small>` : ""}
      ${ot ? `<span class="tps">${ot}</span>` : ""}</span></button>`;
}
function sceneHTML(d) {
  const td = today(), sh = shiftOf(d); let c = sh.c;
  if (d === td) { const yc = shiftOf(E.addDays(td, -1)).c; if (isWork(yc) && crosses(yc) && new Date() < atTime(td, times(yc)[1])) c = yc; }
  const lines = CAT_LINES[c] || CAT_LINES.H, line = lines[(E.parse(d).getDate() + (view.catTap || 0)) % lines.length];
  return `${catScene(c)}<button class="catbtn" data-act="catTap" aria-label="แตะน้องแมว">${catSVG(c)}</button><div class="bubble"><b>${esc(line)}</b></div>`;
}
const dial = { pos: null, raf: 0, v: 0, drag: null, lastInt: null };
function dialHTML() {
  return `<div class="dial" id="dial" tabindex="0" role="slider" aria-label="หมุนเพื่อเลือกวัน" aria-valuetext="">
    <div class="dial-face" id="dialFace"></div>
    <div class="dial-ptr" aria-hidden="true"></div>
    <div class="dial-label" id="dialLabel"></div></div>`;
}
function dialGeom(el) { const w = el.clientWidth, R = Math.max(260, w * 1.05), step = 62 / R; return { w, R, step, cy: R + 46 }; }
function drawDial() {
  const el = $("#dial"), face = $("#dialFace"); if (!el || !face) return;
  const td = today(), p = dial.pos, g = dialGeom(el), base = Math.round(p);
  let html = "";
  // clock ticks along the rim
  for (let t = Math.floor((p - 6) * 4); t <= Math.ceil((p + 6) * 4); t++) {
    const k = t / 4, th = (k - p) * g.step; if (Math.abs(th) > 1.2) continue;
    const x = g.w / 2 + (g.R + 26) * Math.sin(th), y = g.cy - (g.R + 26) * Math.cos(th), major = t % 4 === 0;
    html += `<i class="tick ${major ? "mj" : ""}" style="transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(th * 180 / Math.PI).toFixed(2)}deg);opacity:${Math.max(0, 1 - Math.abs(k - p) / 6).toFixed(2)}"></i>`;
  }
  for (let k = base - 5; k <= base + 5; k++) {
    const d = E.addDays(td, k), dd = E.parse(d), off = k - p, th = off * g.step;
    const x = g.w / 2 + g.R * Math.sin(th), y = g.cy - g.R * Math.cos(th), a = Math.abs(off);
    const sc = Math.max(.62, 1 - a * .09), op = Math.max(0, 1 - a * .17);
    const c = shiftOf(d).c, on = a < .5;
    html += `<button class="dd ${on ? "on" : ""} ${k === 0 ? "now" : ""} ${HOL[d] ? "hol" : ""}" data-act="dialGo" data-d="${d}" tabindex="-1" style="transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(th * 180 / Math.PI).toFixed(2)}deg) scale(${sc.toFixed(3)});opacity:${op.toFixed(2)}" aria-label="${dLong(d)} ${SHN[c]}">
      <span class="dw">${DOW[dd.getDay()]}</span><span class="dn">${dd.getDate()}</span><span class="dl k${c}">${c}</span><span class="dab">${otherTeams().map(t => { const x = rosterCode(t, d).c; return `<span>${t}<b class="k${x}">${x}</b></span>`; }).join("")}</span></button>`;
  }
  face.innerHTML = html;
  const cur = E.addDays(td, base), lab = $("#dialLabel");
  if (lab) lab.innerHTML = base === 0 ? `<b>วันนี้</b>` : `<b>${dShort(cur)}</b> <button class="link" data-act="dialGo" data-d="${td}">กลับวันนี้</button>`;
  el.setAttribute("aria-valuetext", dLong(cur));
  if (dial.lastInt !== base) { if (dial.lastInt !== null) { try { navigator.vibrate && navigator.vibrate(4); } catch (e) {} } dial.lastInt = base; }
}
/* double-tap the dial → the whole month; back returns to the dial */
function monthHTML() {
  const td = today(), sel = view.homeDay || td, mk = view.homeMonthKey || E.monthKey(sel);
  const [y, m] = mk.split("-").map(Number), first = new Date(y, m - 1, 1), dim = new Date(y, m, 0).getDate(), off = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < off; i++) cells.push(`<span class="mc empty"></span>`);
  for (let dd = 1; dd <= dim; dd++) {
    const d = `${mk}-${String(dd).padStart(2, "0")}`, c = shiftOf(d).c;
    cells.push(`<button class="mc ${d === td ? "now" : ""} ${d === sel ? "sel" : ""} ${d < td ? "past" : ""} ${HOL[d] ? "hol" : ""}" data-act="monthPick" data-d="${d}" aria-label="${dLong(d)} ${SHN[c]}">
      <span class="n">${dd}</span><span class="dl k${c}">${c}</span><span class="dab">${otherTeams().map(t => { const x = rosterCode(t, d).c; return `<span>${t}<b class="k${x}">${x}</b></span>`; }).join("")}</span></button>`);
  }
  const cnt = { D: 0, N: 0, H: 0 }; for (let dd = 1; dd <= dim; dd++) { const c = shiftOf(`${mk}-${String(dd).padStart(2, "0")}`).c; cnt[c === "S" ? "H" : c]++; }
  return `<div class="card monthv">
    <div class="between mvh"><button class="b3 back" data-act="monthBack" aria-label="กลับไปวงหมุน">${I.l}<span>กลับ</span></button>
      <span class="row" style="gap:8px"><button class="icon-btn" data-act="monthNav" data-n="-1" aria-label="เดือนก่อน">${I.l}</button><b style="font-size:17px;min-width:118px;text-align:center">${mLabel(mk)}</b><button class="icon-btn" data-act="monthNav" data-n="1" aria-label="เดือนถัดไป">${I.r}</button></span></div>
    <div class="mgridh">${["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map(x => `<span>${x}</span>`).join("")}</div>
    <div class="mgridd">${cells.join("")}</div>
    <div class="mleg"><span><i class="dl kD">D</i>เช้า ${cnt.D}</span><span><i class="dl kN">N</i>ดึก ${cnt.N}</span><span><i class="dl kH">H</i>หยุด ${cnt.H}</span><span class="muted">Team ${S.profile.team || "C"}</span></div></div>`;
}
function setMonthMode(on, push = true) {
  view.homeMonth = on; if (!on) view.homeMonthKey = null;
  const w = $("#dialWrap"); if (!w) return;
  w.innerHTML = on ? monthHTML() : dialHTML(); w.firstElementChild.classList.add("swap");
  if (!on) initDial();
  if (on && push) { try { history.pushState({ mqMonth: 1 }, ""); } catch (e) {} }
}
window.addEventListener("popstate", () => { if (view.homeMonth) setMonthMode(false, false); });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act=monthBack],[data-act=monthNav],[data-act=monthPick]"); if (!b) return; e.stopPropagation();
  const a = b.dataset.act;
  if (a === "monthBack") { if (history.state && history.state.mqMonth) history.back(); else setMonthMode(false, false); }
  if (a === "monthNav") { const base = view.homeMonthKey || E.monthKey(view.homeDay || today()); view.homeMonthKey = E.addMonths(base, +b.dataset.n); $("#dialWrap").innerHTML = monthHTML(); }
  if (a === "monthPick") { const d = b.dataset.d; view.homeDay = d; const hb = $("#heroBox"); if (hb) hb.innerHTML = heroHTML(d); const sb = $("#sceneBox"); if (sb) sb.innerHTML = sceneHTML(d);
    const hd = $("#dayHead"); if (hd) hd.textContent = d === today() ? `วันนี้ · ${dShort(d)}` : dLong(d).replace(/ \d{4}$/, "");
    $("#dialWrap").querySelectorAll(".mc.sel").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); }
}, true);
function dialSettle() {
  const td = today(), d = E.addDays(td, Math.round(dial.pos));
  if (view.homeDay !== d) { const was = view.homeDay || td; view.homeDay = d; const hb = $("#heroBox"); if (hb) hb.innerHTML = heroHTML(d);
    const sb = $("#sceneBox"); if (sb && shiftOf(was).c !== shiftOf(d).c) { sb.innerHTML = sceneHTML(d); } else if (sb) { const bb = sb.querySelector(".bubble b"); if (bb) bb.textContent = (CAT_LINES[shiftOf(d).c] || CAT_LINES.H)[E.parse(d).getDate() % (CAT_LINES[shiftOf(d).c] || CAT_LINES.H).length]; }
    const hd = $("#dayHead"); if (hd) hd.textContent = d === td ? `วันนี้ · ${dShort(d)}` : dLong(d).replace(/ \d{4}$/, ""); }
}
function dialAnimateTo(target) {
  cancelAnimationFrame(dial.raf); const from = dial.pos, t0 = performance.now(), dur = Math.min(700, 220 + Math.abs(target - from) * 60);
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); dial.pos = from + (target - from) * e; drawDial(); if (k < 1) dial.raf = requestAnimationFrame(step); else { dial.pos = target; drawDial(); dialSettle(); } };
  dial.raf = requestAnimationFrame(step);
}
function dialCoast() {
  cancelAnimationFrame(dial.raf); let last = performance.now();
  const step = t => { const dt = Math.min(40, t - last); last = t; dial.pos += dial.v * dt; dial.v *= Math.pow(.992, dt);
    drawDial(); if (Math.abs(dial.v) > .0008) dial.raf = requestAnimationFrame(step); else dialAnimateTo(Math.round(dial.pos)); };
  dial.raf = requestAnimationFrame(step);
}
function initDial() {
  const el = $("#dial"); if (!el) return;
  const td = today();
  cancelAnimationFrame(dial.raf); if (dial.day !== td) view.homeDay = null; dial.pos = view.homeDay ? E.diffDays(td, view.homeDay) : 0; dial.day = td;
  drawDial();
  el.addEventListener("pointerdown", e => {
    cancelAnimationFrame(dial.raf);
    dial.drag = { x: e.clientX, y: e.clientY, p: dial.pos, t: performance.now(), lx: e.clientX, lt: performance.now(), moved: false, id: e.pointerId };
    dial.v = 0;
  });
  el.addEventListener("pointermove", e => {
    const g = dial.drag; if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x; if (!g.moved && Math.abs(dx) < 6) return;
    if (!g.moved) { g.moved = true; try { el.setPointerCapture(e.pointerId); } catch (x) {} }
    const geo = dialGeom(el), perDay = geo.R * geo.step;
    dial.pos = g.p - dx / perDay;
    const now = performance.now(), dt = Math.max(1, now - g.lt); dial.v = -(e.clientX - g.lx) / perDay / dt; g.lx = e.clientX; g.lt = now;
    drawDial(); e.preventDefault();
  });
  const end = e => { const g = dial.drag; if (!g || g.id !== e.pointerId) return; dial.drag = null;
    if (!g.moved) { const now = performance.now(); if (now - (dial.lastTap || 0) < 330) { dial.lastTap = 0; setMonthMode(true); return; } dial.lastTap = now; return; }
    el.dataset.dragged = "1"; setTimeout(() => delete el.dataset.dragged, 50);
    if (performance.now() - g.lt > 80) dial.v = 0; dial.v = Math.max(-.03, Math.min(.03, dial.v)); dialCoast(); };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  let wt; el.addEventListener("wheel", e => { e.preventDefault(); cancelAnimationFrame(dial.raf); dial.pos += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / 90; drawDial(); clearTimeout(wt); wt = setTimeout(() => dialAnimateTo(Math.round(dial.pos)), 140); }, { passive: false });
  el.addEventListener("keydown", e => { if (e.key === "ArrowRight") { e.preventDefault(); dialAnimateTo(Math.round(dial.pos) + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); dialAnimateTo(Math.round(dial.pos) - 1); } });
}
document.addEventListener("click", e => { const b = e.target.closest("[data-act=dialGo]"); if (!b) return; e.preventDefault(); e.stopPropagation();
  if ($("#dial")?.dataset.dragged) return;
  const k = E.diffDays(today(), b.dataset.d); 
  if (!$("#dial")) { view.homeDay = b.dataset.d; dial.pos = k; go("home"); return; }
  dialAnimateTo(k); }, true);

/* ───────── HOME ───────── */
function pHome() {
  const { td, mk, av, jp, xp } = snapshot();
  const hr = new Date().getHours(); const greet = hr < 11 ? "อรุณสวัสดิ์" : hr < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const name = S.profile.name || "เพื่อนนักเดินทาง";
  const otRec = S.ot[E.periodKeyFor(td)]; const otH = otRec ? E.otCalc(otRec.values, S.pay).otHours : 0;
  const dsel = view.homeDay || td;
  const rem = remindersSoon(36);
  // today's missions as the "progress" strip
  const ms = E.missionsFor(S, mk, td).filter(m => !m.na), done = ms.filter(m => m.met || m.claimed).length, pct = ms.length ? done / ms.length : 0;
  const safe = av.safe;
  const segs = [{ v: av.fixed, c: "#A26A3C", l: "คงที่" }, { v: av.debt, c: "#E0503F", l: "หนี้" }, { v: av.savings + av.goals, c: "#78B536", l: "ออม" }, { v: av.varSpent, c: "#A5AA95", l: "ใช้ไป" }, { v: Math.max(0, safe), c: "#F2B21B", l: "เหลือ" }];
  const tot = Math.max(1, E.sum(segs.map(s => s.v)));
  const cash = `<button class="card cash2" data-act="goMoney" data-sub="overview">
    <div class="between"><span class="row" style="gap:10px">${art("wallet", 44)}<span><small class="muted">เงินเหลือใช้จริง · ${mShort(mk)}</small><span class="money" style="display:block;font-size:30px;line-height:1.1;color:${safe < 0 ? "var(--bad)" : "var(--ink)"}">${baht(safe)}</span></span></span>
      ${S.pay.salary ? `<span class="daypill"><small>วันละ</small><b>${baht(av.daily)}</b></span>` : ""}</div>
    <div class="stackbar">${segs.map(s => s.v > 0 ? `<i style="flex:${s.v / tot};background:${s.c}"></i>` : "").join("")}</div>
    <div class="legend">${segs.map(s => `<span><i style="background:${s.c}"></i>${s.l} ${fmt(s.v)}</span>`).join("")}</div>
    <small class="muted">${S.pay.salary ? `อีก ${av.daysLeft} วันถึงเงินเดือน (${dShort(av.payday)})${otH ? ` · OT รอบนี้ ${fmt(otH, 1)} ชม.` : ""}` : `<span class="link">ตั้งค่าเงินเดือนก่อน</span> เพื่อคำนวณเงินเหลือใช้จริง`}</small></button>`;
  const quick = `<div class="quick">
    <button data-act="spend" data-id="">${art("cart", 52)}<span>จดรายจ่าย</span></button>
    <button data-act="quickScan">${art("scan", 52)}<span>สแกนใบ OT</span></button>
    <button data-act="goMoney" data-sub="slips">${art("receipt", 52)}<span>สลิปธนาคาร</span></button>
    <button data-act="editAppt" data-id="">${art("cal", 52)}<span>เพิ่มนัด</span></button></div>`;
  const up = [];
  for (const a of S.planner.appts) for (const d of E.apptOccurrences(a, td, E.addDays(td, 30))) up.push({ d, t: a.time || "", title: a.title, sub: a.place || a.note || "", ic: a.type === "วันเกิด" ? "cake" : a.type === "งาน" ? "tool" : "pin", hue: a.type === "วันเกิด" ? "pink" : "blu", act: `data-act="editAppt" data-id="${a.id}"` });
  for (const r of E.debtSchedule(S, mk, td)) if (r.status !== "paid" && r.status !== "closed") up.push({ d: r.due, t: "", title: `ผ่อน ${r.debt.name}`, sub: baht(r.planned), ic: "card", hue: "red", act: `data-act="goMoney" data-sub="debt"`, bad: r.status === "overdue" });
  for (const f of E.expenseMonth(S, mk).fixed) if (f.status !== "paid" && f.due >= td) up.push({ d: f.due, t: "", title: f.item.name, sub: baht(f.planned - f.paid), ic: "receipt", hue: "grn", act: `data-act="goMoney" data-sub="expense"` });
  for (const t of S.planner.todos) if (!t.done && t.due) up.push({ d: t.due, t: "", title: t.title, sub: "To-do", ic: "list", hue: "tea", act: `data-act="goPlanner" data-sub="todo"` });
  up.sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t));
  const qc = up.slice(0, 8).map(u => `<button class="apc h-${u.hue}" ${u.act}><span class="apd"><b>${u.d === td ? "วันนี้" : dShort(u.d)}</b><small>${u.t || "ทั้งวัน"}</small></span><span class="apb">${art(u.ic, 34)}<b>${esc(u.title)}</b></span><span class="apf">${u.bad ? "เลยกำหนด!" : esc(u.sub || "")}</span></button>`).join("");
  const lv = E.level(xp), next = jp.next;
  return `${sampleBanner()}
  <section class="hscene"><div id="sceneBox">${sceneHTML(dsel)}</div>
    <div class="htop"><div class="who"><small>${greet}</small><b>${esc(name)}</b></div>
      <span class="row" style="gap:10px"><button class="b3 sq" data-act="goPlanner" data-sub="appts" aria-label="การเตือน">${art("bell", 30, "flat")}${rem.length ? `<i class="badge-n">${rem.length}</i>` : ""}</button>
      <button class="b3 sq" data-act="go" data-tab="profile" aria-label="โปรไฟล์">${art("user", 30, "flat")}</button></span></div></section>
  <button class="card mstrip" data-act="go" data-tab="journey">${art("paw", 46)}<span style="flex:1"><small><b>${done} / ${ms.length || 0}</b> ภารกิจเดือนนี้ · Lv.${lv.lv}</small><span class="pbar"><i style="width:${pct * 100}%"></i></span></span><b class="pp">${Math.round(pct * 100)}%</b></button>
  <div class="between dayrow"><h2 id="dayHead">${dsel === td ? `วันนี้ · ${dShort(dsel)}` : dLong(dsel).replace(/ \d{4}$/, "")}</h2><span class="muted" style="font-size:12px;font-weight:700">ลากหมุน · แตะ 2 ครั้งดูทั้งเดือน</span></div>
  <div id="dialWrap">${view.homeMonth ? monthHTML() : dialHTML()}</div>
  <div class="home-grid"><div class="stack"><div id="heroBox">${heroHTML(dsel)}</div>${quick}${cash}</div>
  <div class="stack">
    ${rem.length ? `<div class="card"><div class="between" style="margin-bottom:6px"><b class="row" style="gap:8px">${art("bell", 30)} เตือนเร็ว ๆ นี้</b><span class="tag y">${rem.length}</span></div>${rem.slice(0, 4).map(r => `<div class="li"><span class="dot" style="background:${r.overdue ? "var(--bad)" : r.kind === "appt" ? "var(--lav-ink)" : "var(--sun-deep)"}"></span><div class="t"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></div></div>`).join("")}</div>` : ""}
    <div class="sec-h" style="margin-top:4px"><h2>กำลังจะถึง</h2><button data-act="goPlanner" data-sub="calendar">ดูทั้งหมด</button></div>
    ${qc ? `<div class="qcards">${qc}</div>` : `<div class="card empty">${catSVG("H", { cls: "mini" })}<b>ยังไม่มีนัดหมายหรือบิลใน 30 วัน</b>กดปุ่ม เพิ่มนัด ด้านบนได้เลย</div>`}
    <button class="card jmini" data-act="go" data-tab="journey">${miniMountain(jp.overall)}
      <div class="t"><div class="sub">การผจญภัยของน้องแมว · Lv.${lv.lv}</div><div class="pct">${Math.round(jp.overall * 100)}%</div>
      <div class="sub" style="margin-top:4px">${next ? `ถัดไป: <b style="color:var(--ink)">${next.name}</b> — ${next.sub}` : "ถึงยอดเขาแล้ว!"}</div></div></button>
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
    <g id="hiker"><g class="bob">${catSVG("H").replace("<svg ", '<svg x="-26" y="-50" width="52" height="52" ')}    </g></g>
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
const MISSION_ICON = { save2k: "coin", debtOnTime: "shield", cut500: "scissors", noNewDebt: "ban", otSave: "timer", streak3: "fire" };
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
  const mrow = (m, mkx) => `<div class="mission ${m.claimed ? "done" : ""}"><div class="mi">${art(MISSION_ICON[m.id] || "star", 46)}</div>
    <div><b>${esc(m.title)}</b><small>${m.na ? "ยังไม่มีข้อมูลสำหรับภารกิจนี้" : m.claimed ? "รับรางวัลแล้ว" : m.waiting ? "ทำได้แล้ว — รับรางวัลได้หลังสิ้นเดือน" : `${fmt(Math.max(0, m.value))} / ${fmt(m.target)}`} · ${m.xp} XP</small><div class="bar"><i style="width:${m.pct * 100}%;${m.met ? "background:var(--olive)" : ""}"></i></div></div>
    ${m.claimable ? `<button class="claim" data-act="claim" data-m="${m.id}" data-mk="${mkx}">รับ ${m.xp} XP</button>` : m.claimed ? `<span class="tag g">${I.check.replace('class="i"', 'class="i" style="width:16px;height:16px"')}</span>` : ""}</div>`;
  const goals = S.goals.map(g => { const gi = E.goalInfo(g, td); return `<button class="goal" data-act="goal" data-id="${g.id}"><div class="gi">${g.img ? `<img src="${g.img}" alt="">` : art(g.icon || "target", 52)}</div>
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
    <button class="nextcp" data-act="cpInfo" data-i="${next ? E.CHECKPOINTS.indexOf(next) : 5}"><span class="ic">${art(next ? "tent" : "trophy", 46)}</span><span style="flex:1"><b>${next ? next.name + " — " + next.sub : "พิชิตยอดเขาแล้ว!"}</b><small>${next ? cpHint(next.id, jp) : "ตั้งเป้าหมายใหม่เพื่อเดินทางต่อ"}</small></span>${I.r}</button></div>
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
