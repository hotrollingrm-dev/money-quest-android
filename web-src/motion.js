/* MONEY QUEST — motion layer. Pure presentation: never touches data, only what's already rendered.
   Respects prefers-reduced-motion and pauses when the app is in the background. */
const RM = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAB_ORDER = ["home", "money", "journey", "planner", "profile"];
const motion = { lastTab: null, nums: new Map() };
document.addEventListener("visibilitychange", () => document.documentElement.classList.toggle("paused", document.hidden));

/* count a money figure from its previous value; the final text is always the exact rendered text */
function countUp(el, key) {
  const txt = el.textContent, m = txt.match(/^(.*?)(-?[\d,]+(?:\.\d+)?)(.*)$/s); if (!m) return;
  const to = parseFloat(m[2].replace(/,/g, "")), dec = (m[2].split(".")[1] || "").length;
  const from = motion.nums.has(key) ? motion.nums.get(key) : (to > 0 ? 0 : to); motion.nums.set(key, to);
  if (RM() || from === to || !isFinite(to)) return;
  const t0 = performance.now(), dur = Math.min(900, 380 + Math.abs(to - from) / 50);
  const fmtN = v => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = k < 1 ? m[1] + fmtN(from + (to - from) * e) + m[3] : txt; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function afterRender() {
  const main = $("#main"); if (!main) return;
  const tab = view.tab + ":" + (view.tab === "money" ? view.money + (view.debt || "") : view.tab === "planner" ? view.planner : "");
  const changed = motion.lastTab !== tab;
  if (changed && !RM()) {
    const a = TAB_ORDER.indexOf((motion.lastTab || "").split(":")[0]), b = TAB_ORDER.indexOf(view.tab);
    main.classList.remove("pg-l", "pg-r", "pg-in"); void main.offsetWidth;
    main.classList.add(a < 0 || a === b ? "pg-in" : b > a ? "pg-r" : "pg-l");
    // stagger the first cards on screen
    [...main.querySelectorAll(".card, .metric, .quick > button, .tchip, .instrow, .ccard, .apc")].slice(0, 14).forEach((c, i) => { c.style.setProperty("--i", i); c.classList.add("st-in"); });
  }
  motion.lastTab = tab;
  main.querySelectorAll(".money, .metric b, .kv b, .four b, .cc-due b, .daypill b, .pp").forEach((el, i) => countUp(el, tab + i));
}
/* render() is the single place the screen is rebuilt — run the motion pass after it */
const _mRender = render;
render = function () { _mRender.apply(this, arguments); try { afterRender(); } catch (e) {} };

/* celebration: MILO pops up with stars; called wherever the app already celebrates a real, saved event */
const _mConfetti = confetti;
confetti = function () {
  _mConfetti.apply(this, arguments);
  if (RM()) return;
  const host = document.createElement("div"); host.className = "milo-pop";
  host.innerHTML = `${miloSVG("cheer")}<div class="mp-burst">${Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg;--d:${i * 30}ms"></i>`).join("")}</div>`;
  document.body.appendChild(host); setTimeout(() => host.classList.add("out"), 1500); setTimeout(() => host.remove(), 1900);
};

/* OT scanner: scan line + MILO at work while OCR actually runs; result state only after it really returns */
function scanFx(url, n) {
  let o = $("#scanFx");
  if (url) {
    if (o) o.remove();
    o = document.createElement("div"); o.id = "scanFx"; o.className = "scanfx";
    o.innerHTML = `<div class="sf-card"><div class="sf-doc"><img src="${url}" alt=""><i class="sf-line"></i><i class="sf-box"></i></div>
      <div class="sf-milo">${miloSVG("work")}</div><b>MILO กำลังอ่านแถวรวม…</b><small>ใช้เวลาประมาณ 10–40 วินาที</small><div class="sf-dots"><i></i><i></i><i></i></div></div>`;
    document.body.appendChild(o); return;
  }
  if (!o) return;
  const ok = n > 0;
  o.querySelector(".sf-card").innerHTML = `<div class="sf-milo">${miloSVG(ok ? "cheer" : "surprised")}</div>${ok ? `<svg class="sf-check" viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-16"/></svg><b>อ่านได้ ${n}/9 ช่อง</b><small>ตรวจตัวเลขทุกช่องก่อนบันทึก</small>` : `<b>อ่านไม่สำเร็จ</b><small>ลองถ่ายใหม่ให้เห็นแถวรวมชัด ๆ หรือกรอกเอง</small>`}`;
  o.classList.add("done"); setTimeout(() => { o.classList.add("out"); setTimeout(() => o.remove(), 350); }, ok ? 1300 : 2200);
}

/* tapping MILO: hop + a small burst of particles, a random reaction pose */
document.addEventListener("click", e => {
  const b = e.target.closest(".catbtn"); if (!b || RM()) return;
  const r = b.getBoundingClientRect(), host = document.createElement("div"); host.className = "tap-burst";
  host.style.left = r.left + r.width / 2 + "px"; host.style.top = r.top + r.height * .35 + "px";
  host.innerHTML = Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg"></i>`).join("");
  document.body.appendChild(host); setTimeout(() => host.remove(), 700);
});
