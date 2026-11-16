/* MONEY QUEST — Thai e-slip parser (pure JS, no DOM).
   input: { qr: string|null, text: OCR text (tha+eng), fileTime: ms|null }
   output: structured slip with per-field confidence. */
(function (root) {
"use strict";
const BANKS = {
  "002": { k: "bbl", name: "กรุงเทพ", short: "BBL", color: "#1E3D8F" },
  "004": { k: "kbank", name: "กสิกรไทย", short: "KBank", color: "#138F2D" },
  "006": { k: "ktb", name: "กรุงไทย", short: "KTB", color: "#1BA5E1" },
  "011": { k: "ttb", name: "ทีทีบี", short: "ttb", color: "#0050F0" },
  "014": { k: "scb", name: "ไทยพาณิชย์", short: "SCB", color: "#4E2A84" },
  "022": { k: "cimb", name: "ซีไอเอ็มบี", short: "CIMB", color: "#7E2629" },
  "024": { k: "uob", name: "ยูโอบี", short: "UOB", color: "#0B3B8C" },
  "025": { k: "bay", name: "กรุงศรี", short: "Krungsri", color: "#FEC43B" },
  "030": { k: "gsb", name: "ออมสิน", short: "GSB", color: "#EB198D" },
  "033": { k: "ghb", name: "ธอส.", short: "GHB", color: "#F57D20" },
  "034": { k: "baac", name: "ธ.ก.ส.", short: "BAAC", color: "#4B9B2F" },
  "067": { k: "tisco", name: "ทิสโก้", short: "TISCO", color: "#12549E" },
  "069": { k: "kkp", name: "เกียรตินาคินภัทร", short: "KKP", color: "#635B9D" },
  "073": { k: "lhb", name: "แลนด์ แอนด์ เฮ้าส์", short: "LH Bank", color: "#6D6E71" }
};
const BANK_BY_KEY = Object.fromEntries(Object.entries(BANKS).map(([c, b]) => [b.k, { code: c, ...b }]));
const BANK_WORDS = [
  ["ttb", /\bttb\b|ทีทีบี|ทหารไทยธนชาต/i], ["bay", /krungsri|กรุงศรี|KSA\d{6,}/i], ["gsb", /mymo|ออมสิน|by\s*GSB/i],
  ["kbank", /K\s?PLUS|กสิกร|KBank/i], ["scb", /SCB\s?EASY|ไทยพาณิชย์/i], ["ktb", /Krungthai|กรุงไทย|NEXT/i],
  ["bbl", /Bangkok\s?Bank|กรุงเทพ|Bualuang/i], ["kkp", /เกียรตินาคิน|KKP/i], ["baac", /ธ\.?ก\.?ส|BAAC/i], ["uob", /UOB/i], ["cimb", /CIMB/i]
];
const TH_MONTHS = ["มกราคม|ม.ค.|มค", "กุมภาพันธ์|ก.พ.|กพ", "มีนาคม|มี.ค.|มีค", "เมษายน|เม.ย.|เมย", "พฤษภาคม|พ.ค.|พค", "มิถุนายน|มิ.ย.|มิย",
  "กรกฎาคม|ก.ค.|กค", "สิงหาคม|ส.ค.|สค", "กันยายน|ก.ย.|กย", "ตุลาคม|ต.ค.|ตค", "พฤศจิกายน|พ.ย.|พย", "ธันวาคม|ธ.ค.|ธค"];
const EN_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/* EMVCo-style TLV used by the Thai slip-verification QR: 00{01 bank, 02 ref} 51 country 91 crc */
function parseTLV(s) { const o = {}; let i = 0; while (i + 4 <= s.length) { const t = s.substr(i, 2), n = +s.substr(i + 2, 2); if (!isFinite(n)) break; o[t] = s.substr(i + 4, n); i += 4 + n; } return o; }
function parseQR(q) {
  if (!q || !/^00\d{2}/.test(q)) return null;
  try { const top = parseTLV(q); const inner = parseTLV(top["00"] || ""); if (!inner["01"] || !inner["02"]) return null;
    return { api: inner["00"], bankCode: inner["01"], ref: inner["02"], country: top["51"] || null };
  } catch (e) { return null; }
}

const norm = s => s.normalize("NFC").replace(/ํา/g, "ำ").replace(/[ \t]+/g, " ").trim(); // OCR emits ํ+า for ำ
const lev = (a, b) => { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; };
const MONEY = /(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)/;
const toNum = s => +String(s).replace(/,/g, "");

function findAmount(lines) {
  const at = i => { const m = lines[i] && lines[i].replace(/\s(?=\d{2}\b)/, "").match(MONEY); return m ? toNum(m[1] + "." + m[2]) : null; };
  let fee = null;
  for (let i = 0; i < lines.length; i++) if (/ค่าธรรมเนียม|fee/i.test(lines[i])) { const v = at(i); if (v != null) fee = v; }
  for (let i = 0; i < lines.length; i++) {
    if (/จ[ำา]นวนเงิน|amount/i.test(lines[i])) { const v = at(i); if (v != null) return { value: v, fee, conf: "high" };
      for (let k = 1; k <= 2; k++) { const w = at(i + k); if (w != null && !/ค่าธรรมเนียม/.test(lines[i + k])) return { value: w, fee, conf: "high" }; } }
  }
  // no label (e.g. ttb bill): a line that is only a money figure
  for (let i = 0; i < lines.length; i++) if (/^[\s฿]*\d{1,3}(?:,\d{3})*\.?\s?\d{2}\s*(THB|บาท)?\s*$/.test(lines[i]) && !/ค่าธรรมเนียม/.test(lines[i])) { const v = toNum(lines[i].replace(/[^\d.,]/g, "").replace(/(\d)\.?(\d{2})$/, "$1.$2")); if (v) return { value: v, fee, conf: "medium" }; }
  return { value: null, fee, conf: "none" };
}
function monthFromWord(w) {
  const x = w.replace(/\s/g, "");
  for (let i = 0; i < 12; i++) if (TH_MONTHS[i].split("|").some(p => x.startsWith(p) || x.replace(/\./g, "") === p.replace(/\./g, ""))) return { m: i + 1, conf: "high" };
  const e = EN_MONTHS.indexOf(x.slice(0, 3).toLowerCase()); if (e >= 0) return { m: e + 1, conf: "high" };
  // fuzzy: OCR sometimes reads พ as แ (16แย.)
  const bare = x.replace(/\./g, ""); const cands = [];
  TH_MONTHS.forEach((p, i) => { const ab = p.split("|")[2]; if (lev(bare.slice(0, ab.length), ab) <= 1) cands.push(i + 1); });
  return cands.length ? { m: cands[0], cands, conf: "low" } : null;
}
function findDate(text, fileTime) {
  let out = null;
  const re = /(\d{1,2})\s*([ก-๙a-zA-Z\.]{2,10})\s*(\d{2,4})/g; let m;
  while ((m = re.exec(text))) {
    const mo = monthFromWord(m[2]); if (!mo) continue;
    if (mo.cands && fileTime) { const fm = new Date(fileTime).getMonth() + 1; mo.m = mo.cands.reduce((b, c) => Math.abs(c - fm) < Math.abs(b - fm) ? c : b); }
    let y = +m[3]; if (y < 100) y += y > 50 ? 2500 : 2000 + 543; if (y > 2400) y -= 543;
    const d = +m[1]; if (d < 1 || d > 31 || y < 2015 || y > 2100) continue;
    out = { y, m: mo.m, d, conf: mo.conf }; break;
  }
  const tm = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const time = tm ? `${String(tm[1]).padStart(2, "0")}:${tm[2]}` : null;
  let conf = out ? out.conf : "none", date = out ? `${out.y}-${String(out.m).padStart(2, "0")}-${String(out.d).padStart(2, "0")}` : null;
  if (fileTime) {
    const f = new Date(fileTime), fd = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
    if (!date) { date = fd; conf = "file"; }
    else if (Math.abs(new Date(date) - new Date(fd)) > 2 * 864e5) conf = "mismatch";      // keep OCR date, ask to check
    else if (conf === "low") conf = "high";                                              // fuzzy month confirmed by file time
  }
  return { date, time, conf };
}
/* masked account numbers, e.g. 1234xxxx5678 · XXX-1-23456-X · XXX-1-23456-X78 · (1234) · 4000-12XX-XXXX-3456 */
const ACCT = /[0-9xX]+(?:-[0-9xX]+){0,5}/g;
function accounts(lines) {
  const out = [];
  lines.forEach((l, i) => {
    const merchant = l.match(/รหัสร้านค้า\s*:?\s*(\d{8,})/); if (merchant) { out.push({ i, raw: merchant[1], kind: "merchant" }); return; }
    if (/อ้างอิง|ref|KSA/i.test(l)) return;
    const card = l.match(/\((\d{4})\)/); if (card) { out.push({ i, raw: card[1], kind: "cardSuffix" }); return; }
    const cn = l.replace(/\s/g, "").match(/\d{4}-\d{2}[xX\d]{2}-[xX\d]{4}-\d{3,4}/); if (cn) { out.push({ i, raw: cn[0] + (lines[i + 1] && /^\s*\d\s*$/.test(lines[i + 1]) ? lines[i + 1].trim() : ""), kind: "cardNumber" }); return; }
    for (const m of l.matchAll(ACCT)) { const s = m[0].trim(), digits = (s.match(/\d/g) || []).length, xs = (s.match(/x/gi) || []).length;
      if (digits >= 3 && xs >= 1 && s.replace(/[- ]/g, "").length >= 9) { out.push({ i, raw: s, kind: "account" }); return; }
      if (digits >= 10 && /^\d[\d-]+\d$/.test(s) && /พร้อมเพย์|promptpay/i.test(lines[i - 1] || "")) { out.push({ i, raw: s, kind: "promptpay" }); return; } }
  });
  return out;
}
const NOISE = /^(จาก|ถึง|from|to|รายละเอียด|QR Code|โอนเงินสำเร็จ|ธนาคาร.*|พร้อมเพย์|ttb|THB)$/i;
const isNameLine = l => { const t = l.replace(/[^ก-๙a-zA-Z]/g, ""); return t.length >= 4 && t.length / l.replace(/\s/g, "").length > .7 && !NOISE.test(l.trim()) && !/สำเร็จ|ค่าธรรมเนียม|จ[ำา]นวนเงิน|อ้างอิง|สแกน|ตรวจสอบ|หมายเลข/.test(l); };
function nameAbove(lines, i) {
  const got = []; for (let k = i - 1; k >= Math.max(0, i - 4) && got.length < 2; k--) {
    const l = lines[k].replace(/^[^ก-๙A-Za-z(]+/, "").replace(/^[ก-๙A-Za-z]\s+(?=\S{2})/, "").trim();
    if (/^ธนาคาร|^พร้อมเพย์|^ttb$/i.test(l)) continue;
    if (!isNameLine(l)) { if (got.length && l.replace(/\s/g, "").length > 5) break; continue; }
    let c = l; const ti = c.search(/(นาย|นาง|MR\.?\s|MRS\.?\s|MS\.?\s)/i); if (ti > 0) c = c.slice(ti);
    const thai = /[ก-๙]/.test(c);
    c = c.split(" ").filter(w => !/[๐-๙]/.test(w) && !(thai && /^[a-z]{1,3}$/.test(w))).join(" ");
    got.unshift(c);
    if (/^(นาย|นาง|นางสาว|น\.ส\.|MR|MRS|MS|บริษัท)/i.test(l)) break;
  }
  return got.join(" ").replace(/\s+/g, " ").trim() || null;
}
function detectBank(text, qr) {
  if (qr && BANKS[qr.bankCode]) return { ...BANKS[qr.bankCode], code: qr.bankCode, conf: "high" };
  for (const [k, re] of BANK_WORDS) if (re.test(text)) return { ...BANK_BY_KEY[k], conf: "medium" };
  return null;
}
function bankOfBlock(lines, i) { const blk = lines.slice(Math.max(0, i - 3), i + 2).join(" "); for (const [k, re] of BANK_WORDS) if (re.test(blk)) return k; if (/พร้อมเพย์|promptpay/i.test(blk)) return "promptpay"; return null; }

function parseSlip({ qr, text, fileTime }) {
  const q = parseQR(qr);
  const lines = norm(text).split(/\n/).map(norm).filter(Boolean);
  const flat = lines.join("\n");
  const bank = detectBank(flat, q);
  const amt = findAmount(lines);
  const dt = findDate(flat, fileTime);
  let ref = q ? q.ref : null, refConf = q ? "high" : "none";
  if (!ref) { const m = flat.match(/(?:รหัสอ้างอิง|หมายเลขอ้างอิง|Ref(?:erence)?)\s*[:：]?\s*\n?\s*([A-Za-z0-9]{10,})/i) || flat.match(/\b(KSA\d{10,})/); if (m) { ref = m[1]; refConf = "medium"; } }
  const kind = /ชำระบิล|จ่ายบิล|bill/i.test(flat) ? "bill" : /พร้อมเพย์|promptpay/i.test(flat) ? "promptpay" : /โอน|transfer/i.test(flat) ? "transfer" : "unknown";
  const acc = accounts(lines);
  const parties = acc.map(a => ({ ...a, name: a.kind === "cardNumber" ? null : nameAbove(lines, a.i), bank: bankOfBlock(lines, a.i) }));
  // first party = payer, next non-detail party = payee
  const from = parties[0] || null;
  const to = parties.slice(1).find(p => p.kind !== "cardNumber") || null;
  const card = parties.find(p => p.kind === "cardNumber" || p.kind === "cardSuffix");
  const toIsCard = /บัตรเครดิต|credit\s?card/i.test(flat) && !!card;
  const toName = to ? to.name : null;
  return {
    bank, ref, refConf, kind, amount: amt.value, amountConf: amt.conf, fee: amt.fee,
    date: dt.date, time: dt.time, dateConf: dt.conf,
    from: from ? { name: from.name, acct: from.raw, kind: from.kind, bank: from.bank || (bank && bank.k) } : null,
    to: to ? { name: toName, acct: to.raw, kind: to.kind, bank: to.bank, card: toIsCard ? (card.raw) : null } : null,
    toIsCard, qrOk: !!q
  };
}

/* ── ownership & classification ── */
const maskChars = s => String(s || "").replace(/[^0-9xX]/g, "").toUpperCase();
/** Two masked numbers can be the same account if every position where both show a digit agrees. */
function acctCompatible(a, b) {
  const x = maskChars(a), y = maskChars(b); if (!x || !y) return false;
  const tryAlign = (p, q) => { let known = 0; for (let i = 0; i < Math.min(p.length, q.length); i++) { const c = p[p.length - 1 - i], d = q[q.length - 1 - i]; if (c !== "X" && d !== "X") { if (c !== d) return -1; known++; } } return known; };
  if (x.length === y.length) { const k = tryAlign(x, y); return k >= 3; }
  const k = tryAlign(x, y); return k >= 4;
}
const nameKey = s => String(s || "").replace(/^(นาย|นาง|นางสาว|น\.ส\.|MR\.?|MRS\.?|MS\.?)\s*/i, "").replace(/[^ก-๙A-Za-z ]/g, "").trim();
function sameName(a, b) {
  const x = nameKey(a).split(" ").filter(Boolean), y = nameKey(b).split(" ").filter(Boolean); if (!x.length || !y.length) return false;
  if (x[0] && y[0] && (x[0] === y[0] || (x[0].length > 4 && lev(x[0], y[0]) <= 1))) return true;           // same first name
  const lx = nameKey(a).toLowerCase(), ly = nameKey(b).toLowerCase(); return lx.length > 5 && ly.length > 5 && lev(lx, ly) / Math.max(lx.length, ly.length) < .25;
}
/** owner: {names:[...], accounts:[{id,bank,masks:[...],label,goalId}]} */
function findOwnAccount(owner, acct, bank) { return (owner.accounts || []).find(a => (!bank || !a.bank || a.bank === bank || bank === "promptpay") && a.masks.some(m => acctCompatible(m, acct))) || null; }
function classify(slip, owner) {
  const isOwnerName = n => (owner.names || []).some(x => sameName(x, n));
  const fromOwn = slip.from && (findOwnAccount(owner, slip.from.acct, slip.from.bank) || isOwnerName(slip.from.name));
  const toAcct = slip.to && slip.to.kind === "account" ? findOwnAccount(owner, slip.to.acct, slip.to.bank) : null;
  const toOwn = slip.to && (toAcct || (isOwnerName(slip.to.name) && slip.to.kind !== "merchant"));
  let type;
  if (fromOwn && toOwn && !slip.toIsCard) type = "transfer";
  else if (fromOwn && slip.toIsCard) type = "debt";
  else if (fromOwn) type = "expense";
  else if (toOwn) type = "income";
  else type = "unknown";
  return { type, toAccount: toAcct, payeeKey: slip.to ? (slip.to.kind === "merchant" ? "m:" + slip.to.acct : slip.toIsCard ? "card:" + maskChars(slip.to.card) : "a:" + maskChars(slip.to.acct) + ":" + nameKey(slip.to.name).split(" ")[0]) : null };
}
const CAT_HINTS = [["food", /นม|กาแฟ|ข้าว|อาหาร|ก๋วยเตี๋ยว|ชา|cafe|coffee|7-?eleven|เซเว่น|food|grab\s?food|lineman|kitchen|หมูกระทะ/i], ["fuel", /PTT|ปตท|บางจาก|shell|caltex|น้ำมัน|esso/i],
  ["power", /ไฟฟ้า|PEA|MEA|กฟภ|กฟน/i], ["water", /ประปา|กปภ|กปน/i], ["phone", /AIS|TRUE|DTAC|โทรศัพท์|\bNT\b/i], ["net", /3BB|internet|fiber|อินเทอร์เน็ต/i],
  ["sub", /netflix|spotify|youtube|disney|apple\.com|google/i], ["travel", /bts|mrt|grab|bolt|taxi|ทางด่วน|easy\s?pass/i], ["ins", /ประกัน|insurance/i]];
function guessCat(slip, rules) {
  const key = slip._payeeKey; if (key && rules && rules[key]) return { cat: rules[key], conf: "learned" };
  const txt = [slip.to && slip.to.name, slip.to && slip.to.acct].join(" ");
  for (const [k, re] of CAT_HINTS) if (re.test(txt)) return { cat: k, conf: "hint" };
  return { cat: slip.to && slip.to.kind === "promptpay" ? "other" : "other", conf: "none" };
}
/** Learn the owner's own accounts from a confirmed slip: the payer is always the owner. */
function learnOwner(owner, slip) {
  owner.names = owner.names || []; owner.accounts = owner.accounts || [];
  if (slip.from) {
    if (slip.from.name && !owner.names.some(n => sameName(n, slip.from.name))) owner.names.push(slip.from.name);
    const bank = slip.from.bank || (slip.bank && slip.bank.k);
    let a = findOwnAccount(owner, slip.from.acct, bank);
    if (!a && slip.from.acct) { a = { id: Math.random().toString(36).slice(2, 9), bank, masks: [slip.from.acct], label: "" }; owner.accounts.push(a); }
    else if (a && !a.masks.includes(slip.from.acct)) a.masks.push(slip.from.acct);
  }
  return owner;
}

const API = { BANKS, BANK_BY_KEY, parseQR, parseSlip, acctCompatible, sameName, findOwnAccount, classify, guessCat, learnOwner, nameKey };
if (typeof module !== "undefined") module.exports = API; else root.SLIP = API;
})(this);
