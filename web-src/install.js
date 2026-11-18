/* Install UAดิวะ! on the phone (PWA). Hidden inside the claude.ai artifact frame, in the Android app and once installed. */
const INST = { ev: null };
const inFrame = (() => { try { return window.top !== window; } catch (e) { return true; } })();
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const canOfferInstall = () => !inFrame && !standalone() && !(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) && location.protocol === "https:";
if (!inFrame && "serviceWorker" in navigator && location.protocol === "https:") addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
addEventListener("beforeinstallprompt", e => { e.preventDefault(); INST.ev = e; if (view.tab === "home" || view.tab === "profile") render(); });
addEventListener("appinstalled", () => { INST.ev = null; toast("ติดตั้ง UAดิวะ! แล้ว เปิดจากหน้าจอโฮมได้เลย"); confetti(); render(); });
function installCard(compact) {
  if (!canOfferInstall()) return "";
  if (compact) { let until = 0; try { until = +localStorage.getItem("uadiwa:installLater") || 0; } catch (e) {} if (Date.now() < until) return ""; }
  return `<div class="card instcard"><img src="icon-192.png" alt="" width="58" height="58"><div class="t"><b>ติดตั้ง UAดิวะ! ลงมือถือ</b><small>เปิดเร็วจากหน้าจอโฮม เต็มจอ ใช้ได้แม้เน็ตหลุด</small></div>
    <div class="ia"><button class="btn primary sm" data-act="install">${art("down", 22, "flat")} ติดตั้ง</button>${compact ? `<button class="link" data-act="installLater">ไว้ทีหลัง</button>` : ""}</div></div>`;
}
async function doInstall() {
  if (INST.ev) { INST.ev.prompt(); const r = await INST.ev.userChoice.catch(() => null); INST.ev = null; if (r && r.outcome === "accepted") return; render(); return; }
  const steps = isIOS
    ? [["1", "แตะปุ่ม แชร์ (สี่เหลี่ยมมีลูกศรชี้ขึ้น) ที่แถบล่างของ Safari"], ["2", "เลื่อนลงแล้วแตะ “เพิ่มไปยังหน้าจอโฮม”"], ["3", "แตะ “เพิ่ม” — ไอคอน UAดิวะ! จะอยู่บนหน้าจอ"]]
    : [["1", "แตะเมนู ⋮ มุมขวาบนของ Chrome"], ["2", "เลือก “ติดตั้งแอป” หรือ “เพิ่มลงในหน้าจอหลัก”"], ["3", "แตะ “ติดตั้ง” — ไอคอน UAดิวะ! จะอยู่บนหน้าจอ"]];
  openSheet(`<div class="grab"></div><div class="row" style="gap:14px;align-items:center"><img src="icon-192.png" alt="" width="72" height="72" style="border-radius:20px;box-shadow:0 6px 14px rgba(60,80,10,.25)"><div><h3 style="margin:0">ติดตั้ง UAดิวะ!</h3><small class="muted">${isIOS ? "บน iPhone ต้องเปิดด้วย Safari" : "บน Android แนะนำ Chrome"}</small></div></div>
    <div class="stack" style="margin-top:14px">${steps.map(([n, t]) => `<div class="li"><span class="tl-d">${n}</span><div class="t"><b>${t}</b></div></div>`).join("")}</div>
    <div class="acts"><button class="btn primary" data-act="closeSheet">เข้าใจแล้ว</button></div>`);
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act=install],[data-act=installLater]"); if (!b) return; e.preventDefault();
  if (b.dataset.act === "install") doInstall();
  else { try { localStorage.setItem("uadiwa:installLater", Date.now() + 14 * 864e5); } catch (x) {} render(); }
});
/* home-screen shortcuts */
addEventListener("load", () => { const g = new URLSearchParams(location.search).get("go"); if (g === "scan") setTimeout(() => go("money", "ot"), 300); if (g === "spend") setTimeout(() => sheetSpend(""), 400); });
