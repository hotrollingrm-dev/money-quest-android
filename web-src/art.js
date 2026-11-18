/* ═══════════ MONEY QUEST · ART — sticker icons, the cat mascot, scenes ═══════════
   Everything is hand-drawn SVG: no system emoji anywhere in the UI. */

/* shared gradients, injected once */
(function () {
  const g = (id, a, b, cx = "38%", cy = "30%") => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="78%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    ${g("cFur", "#C99A6E", "#7E5233")}${g("cFurL", "#D9B188", "#9A6B45")}${g("cMuz", "#FFF4E4", "#E5C7A2")}${g("cEye", "#FFD27A", "#D9821F", "40%", "35%")}
    ${g("cPink", "#FFC7C2", "#EE8F8A")}${g("cHat", "#FFE683", "#E9AE14")}${g("cCap", "#9FB4F0", "#4F68B8")}${g("cCoin", "#FFF0A0", "#D99A00", "35%", "30%")}
    ${g("cLeaf", "#D9F27F", "#7FA82A")}${g("cShadow", "rgba(70,80,20,.28)", "rgba(70,80,20,0)", "50%", "50%")}
  </defs></svg>`;
  document.body.insertAdjacentHTML("afterbegin", defs);
})();

/* ── sticker icons: a puffy colored tile + a white glyph ── */
const HUE = {
  yel: ["#FFE683", "#F2B21B"], org: ["#FFC890", "#EE8436"], red: ["#FF9F92", "#E0503F"], pink: ["#FFB8D0", "#E2628F"], pur: ["#D2C0FF", "#8C69E6"],
  blu: ["#AFD3FF", "#4C86E3"], sky: ["#A9E8F6", "#2FAED3"], tea: ["#A2EBD3", "#24AE86"], grn: ["#CDEE8A", "#78B536"], brn: ["#E6C09A", "#A26A3C"],
  gry: ["#E6E8DD", "#A5AA95"], nav: ["#A4B2D2", "#4D5B86"]
};
const O = "rgba(40,30,0,.22)"; // glyph shade
const GL = {
  card: ['blu', `<rect x="5" y="8" width="22" height="16" rx="3.5" fill="#fff"/><rect x="5" y="12" width="22" height="3.5" fill="${O}"/><rect x="8" y="18" width="7" height="3" rx="1.2" fill="#FFD25A"/>`],
  atm: ['tea', `<rect x="7" y="4" width="18" height="24" rx="3.5" fill="#fff"/><rect x="10" y="7" width="12" height="7" rx="1.5" fill="${O}"/><g fill="${O}"><circle cx="12" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/><circle cx="20" cy="18" r="1.4"/><circle cx="12" cy="22" r="1.4"/><circle cx="16" cy="22" r="1.4"/><circle cx="20" cy="22" r="1.4"/></g>`],
  people: ['org', `<circle cx="12" cy="11" r="4.2" fill="#fff"/><circle cx="21" cy="12.5" r="3.6" fill="#fff" opacity=".85"/><path d="M4.5 25c.8-5 4-7.5 7.5-7.5s6.7 2.5 7.5 7.5z" fill="#fff"/><path d="M17 25c.6-4 2.6-6 4.6-6s4.3 1.6 5 6z" fill="#fff" opacity=".85"/>`],
  car: ['red', `<path d="M5 20.5l2.6-6.3A3 3 0 0 1 10.4 12h11.2a3 3 0 0 1 2.8 2.2l2.6 6.3V24H5z" fill="#fff"/><path d="M9.6 18l1.6-3.8h9.6l1.6 3.8z" fill="${O}"/><circle cx="10" cy="24" r="3" fill="#3A3226"/><circle cx="22" cy="24" r="3" fill="#3A3226"/>`],
  house: ['org', `<path d="M5 16L16 6.5 27 16v9.5a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 5 25.5z" fill="#fff"/><path d="M3.5 16.5L16 5.5l12.5 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="18" width="6" height="9" rx="1.2" fill="${O}"/>`],
  doc: ['gry', `<path d="M8 4h11l6 6v17a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 7 27V5a1 1 0 0 1 1-1z" fill="#fff"/><path d="M19 4v6h6" fill="${O}"/><path d="M11 15h10M11 19h10M11 23h6" stroke="${O}" stroke-width="2" stroke-linecap="round"/>`],
  check: ['grn', `<circle cx="16" cy="16" r="11" fill="#fff"/><path d="M10.5 16.5l4 4 7.5-8.5" fill="none" stroke="#78B536" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`],
  receipt: ['grn', `<path d="M8 4h16v24l-2.7-2-2.7 2-2.6-2-2.7 2-2.6-2L8 28z" fill="#fff"/><path d="M12 10h8M12 14h8M12 18h5" stroke="${O}" stroke-width="2" stroke-linecap="round"/>`],
  cart: ['yel', `<path d="M4 6h3.5l3 13.5h13L26.5 10H9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 10h17l-2.8 9.5H11.5z" fill="#fff"/><circle cx="12.5" cy="24.5" r="2.4" fill="#fff"/><circle cx="22" cy="24.5" r="2.4" fill="#fff"/>`],
  food: ['org', `<path d="M4.5 15h23a11.5 9 0 0 1-23 0z" fill="#fff"/><path d="M8 15c1-3 4-4 6-2s5 2 6-1" fill="none" stroke="#FFD25A" stroke-width="2.2" stroke-linecap="round"/><path d="M19 4l-5 11M24 5l-7 10" stroke="#fff" stroke-width="2" stroke-linecap="round"/><rect x="11" y="24" width="10" height="3" rx="1.5" fill="#fff"/>`],
  fuel: ['red', `<rect x="6" y="5" width="13" height="22" rx="2.5" fill="#fff"/><rect x="8.5" y="8" width="8" height="6" rx="1.2" fill="${O}"/><path d="M19 10h3l3 3v9a2 2 0 0 1-4 0v-5h-2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`],
  bus: ['blu', `<rect x="6" y="4" width="20" height="21" rx="4" fill="#fff"/><rect x="8.5" y="7.5" width="15" height="8" rx="1.5" fill="${O}"/><circle cx="11" cy="20" r="1.8" fill="#FFD25A"/><circle cx="21" cy="20" r="1.8" fill="#FFD25A"/><rect x="8" y="25" width="4" height="3" rx="1" fill="#fff"/><rect x="20" y="25" width="4" height="3" rx="1" fill="#fff"/>`],
  bulb: ['yel', `<path d="M16 4a8.5 8.5 0 0 0-5 15.4V22h10v-2.6A8.5 8.5 0 0 0 16 4z" fill="#fff"/><rect x="11.5" y="23" width="9" height="2.6" rx="1.2" fill="#fff"/><rect x="13" y="26.3" width="6" height="2.2" rx="1.1" fill="#fff"/><path d="M13.5 13.5l2.5 3 2.5-3" fill="none" stroke="${O}" stroke-width="1.8" stroke-linecap="round"/>`],
  drop: ['sky', `<path d="M16 4C12 10 8 14.5 8 19a8 8 0 0 0 16 0c0-4.5-4-9-8-15z" fill="#fff"/><path d="M12.5 19.5a4 4 0 0 0 3.5 4" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round"/>`],
  wifi: ['pur', `<path d="M5 13a16 16 0 0 1 22 0M9 17.5a10 10 0 0 1 14 0M13 22a4.5 4.5 0 0 1 6 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="25.5" r="2" fill="#fff"/>`],
  phone: ['nav', `<rect x="9" y="3.5" width="14" height="25" rx="3.5" fill="#fff"/><rect x="11" y="7" width="10" height="16" rx="1.5" fill="${O}"/><rect x="14" y="24.6" width="4" height="1.8" rx=".9" fill="${O}"/>`],
  film: ['pink', `<rect x="5" y="12" width="22" height="14" rx="2.5" fill="#fff"/><path d="M5 12l20.5-5.5.8 3.3L6 15z" fill="#fff"/><path d="M9 11l2.5 2.5M14 9.6l2.5 2.5M19 8.3l2.5 2.5" stroke="${O}" stroke-width="2"/><path d="M14 16.5v6l5-3z" fill="${O}"/>`],
  shield: ['tea', `<path d="M16 4l10 3.6v7.2c0 6.7-4.3 11.2-10 13.2C10.3 26 6 21.5 6 14.8V7.6z" fill="#fff"/><path d="M11.5 15.5l3.2 3.2 6-6.5" fill="none" stroke="#24AE86" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`],
  family: ['org', `<circle cx="10" cy="9.5" r="3.6" fill="#fff"/><circle cx="22" cy="9.5" r="3.6" fill="#fff"/><circle cx="16" cy="16" r="2.8" fill="#fff"/><path d="M4 23c.5-5 3-7.5 6-7.5s4 1.6 4.6 3.6M27.9 23c-.5-5-3-7.5-6-7.5s-4 1.6-4.6 3.6" fill="#fff"/><path d="M11.5 27c.4-4 2.2-6 4.5-6s4.1 2 4.5 6z" fill="#fff"/>`],
  cake: ['pink', `<rect x="6" y="15" width="20" height="12" rx="2.5" fill="#fff"/><path d="M6 19c2.5 2 4.5 2 6.7 0s4.4-2 6.6 0 4.2 2 6.7 0" fill="none" stroke="#FFB8D0" stroke-width="2.4"/><rect x="14.8" y="8" width="2.4" height="7" rx="1" fill="#fff"/><path d="M16 3.5c1.6 1.8 1.6 3.4 0 4.2-1.6-.8-1.6-2.4 0-4.2z" fill="#FFD25A"/>`],
  star: ['yel', `<path d="M16 4.5l3.4 7 7.6 1.1-5.5 5.4 1.3 7.6L16 22l-6.8 3.6 1.3-7.6L5 12.6l7.6-1.1z" fill="#fff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`],
  tool: ['nav', `<path d="M21.5 4.5a6 6 0 0 0-6.4 8.1L5.5 22.2a2.4 2.4 0 0 0 3.4 3.4l9.6-9.6a6 6 0 0 0 8.1-6.4l-3.7 3.7-3.4-.6-.6-3.4z" fill="#fff"/>`],
  pin: ['red', `<path d="M11 4h10l-1.5 7 4 4.5H8.5l4-4.5z" fill="#fff"/><path d="M16 15.5v12" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`],
  brief: ['brn', `<rect x="4.5" y="9.5" width="23" height="16" rx="3" fill="#fff"/><path d="M12 9.5V7a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 20 7v2.5" fill="none" stroke="#fff" stroke-width="2.4"/><rect x="4.5" y="15" width="23" height="2.4" fill="${O}"/><rect x="14" y="14" width="4" height="4.4" rx="1" fill="#FFD25A"/>`],
  cal: ['pur', `<rect x="5" y="7" width="22" height="20" rx="3.5" fill="#fff"/><rect x="5" y="7" width="22" height="6" rx="3" fill="#FF8C7E"/><rect x="10" y="4" width="2.6" height="6" rx="1.3" fill="#fff"/><rect x="19.4" y="4" width="2.6" height="6" rx="1.3" fill="#fff"/><g fill="${O}"><rect x="9" y="16" width="3.5" height="3" rx=".8"/><rect x="14.3" y="16" width="3.5" height="3" rx=".8"/><rect x="19.6" y="16" width="3.5" height="3" rx=".8"/><rect x="9" y="21" width="3.5" height="3" rx=".8"/><rect x="14.3" y="21" width="3.5" height="3" rx=".8"/></g>`],
  target: ['red', `<circle cx="15" cy="17" r="10.5" fill="#fff"/><circle cx="15" cy="17" r="6.8" fill="#FF9F92"/><circle cx="15" cy="17" r="3.2" fill="#fff"/><path d="M15 17L26 6" stroke="#3A3226" stroke-width="2.2" stroke-linecap="round"/><path d="M23 4.5l3.5 2.5 1-3.5z" fill="#3A3226"/>`],
  bell: ['yel', `<path d="M8 21v-6.5a8 8 0 0 1 16 0V21l2 3H6z" fill="#fff"/><path d="M13 25.5a3 3 0 0 0 6 0" fill="#fff"/><circle cx="16" cy="5.5" r="1.8" fill="#fff"/>`],
  phonebell: ['blu', `<rect x="7" y="4" width="13" height="24" rx="3" fill="#fff"/><rect x="9" y="7.5" width="9" height="15" rx="1.4" fill="${O}"/><path d="M22 10a5 5 0 0 1 0 8M25 7.5a9 9 0 0 1 0 13" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`],
  camera: ['nav', `<path d="M5 11a2.5 2.5 0 0 1 2.5-2.5h3l2-3h7l2 3h3A2.5 2.5 0 0 1 27 11v12.5A2.5 2.5 0 0 1 24.5 26h-17A2.5 2.5 0 0 1 5 23.5z" fill="#fff"/><circle cx="16" cy="17" r="5.5" fill="${O}"/><circle cx="16" cy="17" r="3" fill="#fff"/>`],
  laptop: ['blu', `<rect x="7" y="6" width="18" height="13" rx="2" fill="#fff"/><rect x="9" y="8" width="14" height="9" rx="1" fill="${O}"/><path d="M3.5 21h25l-2 4.5h-21z" fill="#fff"/>`],
  plane: ['sky', `<path d="M28 6.5c-1.3-1.3-3.4-1-4.7.3l-4 4L8 7.5 5.6 9.9l8.8 4.7-4 4-3.6-.6-2 2 4.3 2.5 2.5 4.3 2-2-.6-3.6 4-4 4.7 8.8L24 25.5l-3.3-11.3 4-4c1.3-1.3 1.6-3.4.3-4.7z" fill="#fff"/>`],
  scooter: ['grn', `<circle cx="8" cy="23" r="4" fill="#fff"/><circle cx="24" cy="23" r="4" fill="#fff"/><circle cx="8" cy="23" r="1.6" fill="${O}"/><circle cx="24" cy="23" r="1.6" fill="${O}"/><path d="M8 23h9l4-12h3M21 11l3 12" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="9" y="15" width="9" height="4" rx="2" fill="#fff"/>`],
  guitar: ['org', `<path d="M17.5 14.5l7-7" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M23 4.5l4.5 4.5-2 2-4.5-4.5z" fill="#fff"/><path d="M14 12.5c-2-.8-4.5-.3-5.5 1.6-.6 1.2-2.2 1.4-3 2.4-2 2.6-1.4 6.2 1.6 8.5 2.3 3 5.9 3.6 8.5 1.6 1-.8 1.2-2.4 2.4-3 1.9-1 2.4-3.5 1.6-5.5z" fill="#fff"/><circle cx="12" cy="20" r="2.2" fill="${O}"/>`],
  buoy: ['red', `<circle cx="16" cy="16" r="11.5" fill="#fff"/><circle cx="16" cy="16" r="5" fill="#E0503F"/><g fill="#FF9F92"><path d="M16 4.5a11.5 11.5 0 0 1 8.1 3.4l-4.6 4.6A5 5 0 0 0 16 11z"/><path d="M27.5 16a11.5 11.5 0 0 1-3.4 8.1l-4.6-4.6A5 5 0 0 0 21 16z"/><path d="M16 27.5a11.5 11.5 0 0 1-8.1-3.4l4.6-4.6A5 5 0 0 0 16 21z"/><path d="M4.5 16a11.5 11.5 0 0 1 3.4-8.1l4.6 4.6A5 5 0 0 0 11 16z"/></g>`],
  ring: ['pur', `<circle cx="16" cy="20" r="7.5" fill="none" stroke="#fff" stroke-width="3.4"/><path d="M12 9l2-4h4l2 4-4 4z" fill="#fff"/><path d="M12 9h8" stroke="${O}" stroke-width="1.4"/>`],
  grad: ['nav', `<path d="M16 6L3 12.5 16 19l13-6.5z" fill="#fff"/><path d="M9 16v5c0 2 3.2 3.5 7 3.5s7-1.5 7-3.5v-5l-7 3.5z" fill="#fff"/><path d="M26 13.5v7" stroke="#FFD25A" stroke-width="2" stroke-linecap="round"/><circle cx="26" cy="21.5" r="1.8" fill="#FFD25A"/>`],
  clip: ['gry', `<path d="M20.5 9.5l-8.4 8.4a2.5 2.5 0 0 0 3.5 3.5l9-9a5 5 0 0 0-7-7l-9.5 9.5a7.4 7.4 0 0 0 10.5 10.5l7-7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`],
  timer: ['blu', `<circle cx="16" cy="18" r="10" fill="#fff"/><rect x="13" y="3.5" width="6" height="3" rx="1.3" fill="#fff"/><path d="M16 12v6.5l4 2.5" fill="none" stroke="#4C86E3" stroke-width="2.6" stroke-linecap="round"/>`],
  tent: ['grn', `<path d="M16 5L4 26h24z" fill="#fff"/><path d="M16 12l-5 14h10z" fill="${O}"/><path d="M16 5V2.5l5 1.6-5 1.6" fill="#FF8C7E" stroke="#FF8C7E" stroke-width="1"/>`],
  lock: ['gry', `<rect x="7" y="14" width="18" height="13" rx="3" fill="#fff"/><path d="M11 14v-3.5a5 5 0 0 1 10 0V14" fill="none" stroke="#fff" stroke-width="3"/><circle cx="16" cy="20" r="2" fill="${O}"/>`],
  peak: ['sky', `<path d="M2.5 26L12 10l4.5 7 3-4.5L29.5 26z" fill="#fff"/><path d="M12 10l3 4.7-1.8-.7-1.2 2-1.4-2-1.8.6z" fill="#A9E8F6"/><circle cx="24" cy="7" r="2.6" fill="#FFD25A"/>`],
  trophy: ['yel', `<path d="M9 5h14v6a7 7 0 0 1-14 0z" fill="#fff"/><path d="M9 7H5.5a4 4 0 0 0 4 5M23 7h3.5a4 4 0 0 1-4 5" fill="none" stroke="#fff" stroke-width="2.2"/><rect x="14.3" y="17" width="3.4" height="5" fill="#fff"/><rect x="10" y="22" width="12" height="4" rx="1.5" fill="#fff"/><path d="M16 7.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" fill="#F2B21B"/>`],
  coin: ['yel', `<circle cx="16" cy="16" r="11" fill="#fff"/><circle cx="16" cy="16" r="7.8" fill="none" stroke="#F2B21B" stroke-width="2"/><text x="16" y="20.5" text-anchor="middle" font-size="12" font-weight="800" fill="#C88A00" font-family="NST,sans-serif">฿</text>`],
  scissors: ['pink', `<circle cx="9" cy="23" r="4" fill="none" stroke="#fff" stroke-width="2.8"/><circle cx="23" cy="23" r="4" fill="none" stroke="#fff" stroke-width="2.8"/><path d="M11.5 20L24 5M20.5 20L8 5" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>`],
  ban: ['red', `<circle cx="16" cy="16" r="10.5" fill="none" stroke="#fff" stroke-width="3.6"/><path d="M8.6 8.6l14.8 14.8" stroke="#fff" stroke-width="3.6"/>`],
  fire: ['org', `<path d="M16 3.5c1 4.5 7.5 7 7.5 14a7.5 7.5 0 0 1-15 0c0-3.6 2-5.6 3.4-7 .3 2.2 1.4 3.6 2.6 3.8-1-4.3.4-8 1.5-10.8z" fill="#fff"/><path d="M16 15c.6 2.4 3.4 3.4 3.4 6.4a3.4 3.4 0 0 1-6.8 0c0-1.6 1-2.6 1.6-3.2.3.9.8 1.3 1.3 1.4-.3-1.6.1-3.2.5-4.6z" fill="#FFD25A"/>`],
  wallet: ['grn', `<path d="M5 10a3 3 0 0 1 3-3h15v4" fill="none" stroke="#fff" stroke-width="2.6"/><rect x="5" y="10" width="22" height="16" rx="3.5" fill="#fff"/><rect x="18" y="15" width="9" height="6" rx="2" fill="${O}"/><circle cx="21.5" cy="18" r="1.5" fill="#fff"/>`],
  scan: ['yel', `<path d="M5 11V7.5A2.5 2.5 0 0 1 7.5 5H11M21 5h3.5A2.5 2.5 0 0 1 27 7.5V11M27 21v3.5a2.5 2.5 0 0 1-2.5 2.5H21M11 27H7.5A2.5 2.5 0 0 1 5 24.5V21" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/><rect x="10" y="9" width="12" height="14" rx="1.5" fill="#fff"/><path d="M12.5 13h7M12.5 16h7M12.5 19h4" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/><path d="M6 16h20" stroke="#FF6B57" stroke-width="2" stroke-linecap="round"/>`],
  chart: ['tea', `<rect x="5" y="15" width="5" height="11" rx="1.5" fill="#fff"/><rect x="13.5" y="9" width="5" height="17" rx="1.5" fill="#fff"/><rect x="22" y="5" width="5" height="21" rx="1.5" fill="#fff"/>`],
  pie: ['pur', `<path d="M16 4.5V16h11.5A11.5 11.5 0 0 0 16 4.5z" fill="#FFD25A"/><path d="M14 6.5A11 11 0 1 0 25.5 18H14z" fill="#fff"/>`],
  gear: ['gry', `<path d="M14 4h4l.7 3.2 2.5 1 2.8-1.8 2.8 2.8-1.8 2.8 1 2.5L29 15v4l-3.2.7-1 2.5 1.8 2.8-2.8 2.8-2.8-1.8-2.5 1L18 30h-4l-.7-3.2-2.5-1-2.8 1.8-2.8-2.8 1.8-2.8-1-2.5L3 19v-4l3.2-.7 1-2.5-1.8-2.8 2.8-2.8 2.8 1.8 2.5-1z" fill="#fff" transform="translate(0 -1)"/><circle cx="16" cy="16" r="4" fill="${O}"/>`],
  list: ['tea', `<rect x="5" y="5" width="22" height="22" rx="4" fill="#fff"/><path d="M10 11l1.5 1.5 3-3M10 17l1.5 1.5 3-3M10 23h.01" fill="none" stroke="#24AE86" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 11.5h6M17 17.5h6M17 23h6" stroke="${O}" stroke-width="2" stroke-linecap="round"/>`],
  up: ['blu', `<path d="M16 22V7M10 12.5L16 6.5l6 6" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 21v3.5A2.5 2.5 0 0 0 8.5 27h15a2.5 2.5 0 0 0 2.5-2.5V21" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`],
  down: ['tea', `<path d="M16 5v15M10 14.5l6 6 6-6" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 21v3.5A2.5 2.5 0 0 0 8.5 27h15a2.5 2.5 0 0 0 2.5-2.5V21" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`],
  plus: ['yel', `<path d="M16 7v18M7 16h18" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`],
  sun: ['org', `<circle cx="16" cy="16" r="6.5" fill="#fff"/><g stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M16 3.5v3M16 25.5v3M3.5 16h3M25.5 16h3M7.2 7.2l2.1 2.1M22.7 22.7l2.1 2.1M7.2 24.8l2.1-2.1M22.7 9.3l2.1-2.1"/></g>`],
  moon: ['nav', `<path d="M20 4.5A11.5 11.5 0 1 0 27.5 21 9 9 0 0 1 20 4.5z" fill="#fff"/><circle cx="24" cy="9" r="1.3" fill="#FFD25A"/><circle cx="27" cy="14" r="1" fill="#FFD25A"/>`],
  sofa: ['grn', `<rect x="6" y="9" width="20" height="9" rx="3" fill="#fff"/><rect x="3.5" y="14" width="25" height="9" rx="3" fill="#fff"/><rect x="9" y="17" width="14" height="3" rx="1" fill="${O}"/><rect x="6" y="23" width="2.6" height="3" rx="1" fill="#fff"/><rect x="23.4" y="23" width="2.6" height="3" rx="1" fill="#fff"/>`],
  factory: ['gry', `<path d="M4 27V14l6 4v-4l6 4v-4l6 4V6h5v21z" fill="#fff"/><rect x="8" y="21" width="3" height="3" fill="${O}"/><rect x="14" y="21" width="3" height="3" fill="${O}"/><rect x="20" y="21" width="3" height="3" fill="${O}"/>`],
  paw: ['brn', `<ellipse cx="16" cy="21" rx="6.5" ry="5.5" fill="#fff"/><circle cx="8.5" cy="14" r="2.8" fill="#fff"/><circle cx="12.6" cy="9" r="2.8" fill="#fff"/><circle cx="19.4" cy="9" r="2.8" fill="#fff"/><circle cx="23.5" cy="14" r="2.8" fill="#fff"/>`],
  user: ['org', `<circle cx="16" cy="11.5" r="5.5" fill="#fff"/><path d="M5.5 27c1-6 5.2-9 10.5-9s9.5 3 10.5 9z" fill="#fff"/>`],
  trash: ['red', `<path d="M8 10h16l-1.5 16a2 2 0 0 1-2 1.8h-9a2 2 0 0 1-2-1.8z" fill="#fff"/><rect x="5.5" y="6.5" width="21" height="3.4" rx="1.7" fill="#fff"/><rect x="12.5" y="4" width="7" height="3" rx="1.2" fill="#fff"/>`],
  edit: ['blu', `<path d="M21.5 5.5l5 5L12 25l-6 1 1-6z" fill="#fff"/><path d="M18.5 8.5l5 5" stroke="${O}" stroke-width="2"/>`],
  heart: ['pink', `<path d="M16 26.5S4.5 19.8 4.5 12.2A6 6 0 0 1 16 9.4a6 6 0 0 1 11.5 2.8c0 7.6-11.5 14.3-11.5 14.3z" fill="#fff"/>`],
  gift: ['pink', `<rect x="5" y="12" width="22" height="6" rx="1.6" fill="#fff"/><rect x="7" y="18" width="18" height="9" rx="1.6" fill="#fff"/><rect x="14.5" y="12" width="3" height="15" fill="#FFD25A"/><path d="M16 12c-3-5-8-4-6.5-1s6.5 1 6.5 1 5 2 6.5-1-3.5-4-6.5 1z" fill="#fff"/>`],
  bank: ['tea', `<path d="M4 12L16 5l12 7z" fill="#fff"/><rect x="5" y="23" width="22" height="3.6" rx="1" fill="#fff"/><g fill="#fff"><rect x="7.5" y="13.5" width="3" height="8.5"/><rect x="14.5" y="13.5" width="3" height="8.5"/><rect x="21.5" y="13.5" width="3" height="8.5"/></g>`],
  party: ['pink', `<path d="M5 27l6-17 11 11z" fill="#fff"/><path d="M9 21l4 4M7 25l2 1" stroke="#E2628F" stroke-width="2" stroke-linecap="round"/><path d="M14 7c1-3 4-3 5-1M22 12c2-1 4 0 5 2M18 5l1-2M25 8l2-1M26 18l3 1" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/><circle cx="22" cy="5" r="1.8" fill="#FFD25A"/><circle cx="28" cy="13" r="1.6" fill="#FFD25A"/><circle cx="16" cy="12" r="1.5" fill="#A9E8F6"/>`],
  swap: ['grn', `<path d="M7 11h16l-4-4M25 21H9l4 4" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`],
  piggy: ['pink', `<path d="M7 14a9 7.5 0 0 1 16.5-2.5l3.5-.5-1 4.2a7.5 7.5 0 0 1-2 6.3V26h-3.6v-2.4a11 11 0 0 1-5.4 0V26h-3.6v-3.6A7 7 0 0 1 7 14z" fill="#fff"/><circle cx="20.5" cy="14" r="1.3" fill="#3A3226"/><rect x="13" y="8.3" width="5" height="1.8" rx=".9" fill="#E2628F"/><path d="M5 15.5c-1.5 0-2-1.5-1-2.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`],
};
const EMO = { "💳": "card", "🏧": "atm", "🤝": "people", "🚗": "car", "🏠": "house", "📄": "doc", "✅": "check", "🧾": "receipt", "🛒": "cart", "🍜": "food", "⛽": "fuel", "🚌": "bus", "💡": "bulb", "💧": "drop", "📶": "wifi", "📱": "phone", "🎬": "film", "🛡️": "shield", "🛡": "shield", "👪": "family", "🎂": "cake", "⭐": "star", "🛠️": "tool", "🛠": "tool", "📌": "pin", "💼": "brief", "🗓️": "cal", "🗓": "cal", "🎯": "target", "🔔": "bell", "📲": "phonebell", "📷": "camera", "💻": "laptop", "✈️": "plane", "✈": "plane", "🛵": "scooter", "🎸": "guitar", "🛟": "buoy", "💍": "ring", "🎓": "grad", "📎": "clip", "⏱️": "timer", "⏱": "timer", "⛺": "tent", "🔒": "lock", "🏔️": "peak", "🏔": "peak", "🏆": "trophy", "🪙": "coin", "✂️": "scissors", "🚫": "ban", "🔥": "fire" };
/* art("card") or art("💳") → sticker; size in px */
function art(k, size = 42, cls = "") {
  const key = GL[k] ? k : EMO[k] || EMO[(k || "").replace(/️/g, "")];
  if (!key) return `<span class="stk txt ${cls}" style="width:${size}px;height:${size}px;font-size:${size * .5}px">${typeof esc === "function" ? esc(k || "") : k}</span>`;
  const [hue, body] = GL[key], [a, b] = HUE[hue];
  return `<span class="stk ${cls}" style="--a:${a};--b:${b};width:${size}px;height:${size}px" aria-hidden="true"><svg viewBox="0 0 32 32">${body}</svg></span>`;
}
/* just the glyph (for nav), tinted by currentColor-free white on a hue disc */
const GOAL_ICONS = ["target", "camera", "car", "phone", "laptop", "plane", "house", "scooter", "guitar", "buoy", "ring", "grad", "gift", "piggy", "heart", "star"];

/* ── the mascot: MILO, a one-eyed jelly alien drawn like a 2D animation model sheet ──
   organic inked shapes, cel shading (flat base + hard shadow + highlight), white 5-finger gloves, Jill cap. */
const MINK = "#1D3B12", MG1 = "#9BE24A", MG2 = "#6CC02C", MG3 = "#4E9A1E", MHL = "#F2FFD2";
const mTube = (d, w = 12) => `<path d="${d}" fill="none" stroke="${MINK}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${MG2}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${MG1}" stroke-width="${w * .45}" stroke-linecap="round" transform="translate(-1.5 -1)"/>`;
function mGlove(x, y, rot, type = "open", s = 1) {
  const W = (d) => `<path d="${d}" stroke="${MINK}" stroke-width="13" stroke-linecap="round"/><path d="${d}" stroke="#fff" stroke-width="8.5" stroke-linecap="round"/>`;
  const F = type === "open" ? [[-13, -22], [-5, -30], [4, -31], [12, -25]] : type === "fist" || type === "thumb" ? [[-9, -9], [-3, -11], [3, -11], [9, -9]] : [[-11, -14], [-4, -17], [4, -17], [11, -14]];
  const th = type === "thumb" ? "M-14 -2L-24 -20" : type === "open" ? "M-12 2L-27 -6" : "M-12 2L-22 -2";
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${F.map(([fx, fy]) => W(`M${fx * .55} -4L${fx} ${fy}`)).join("")}${W(th)}
    <path d="M-15 -4C-17 -14 -8 -18 0 -17C9 -17 17 -13 15 -3C14 7 8 12 0 12C-9 12 -14 6 -15 -4Z" fill="#fff" stroke="${MINK}" stroke-width="3.2"/>
    <path d="M-3 -12v8M3 -12v8M9 -11v7" stroke="#C9CDC2" stroke-width="1.6" stroke-linecap="round"/><path d="M10 2C12 6 8 10 2 10" fill="none" stroke="#D3D8CC" stroke-width="3" stroke-linecap="round"/>
    <path d="M-12 10C-13 18 13 18 12 10C12 16 -12 16 -12 10Z" fill="#fff" stroke="${MINK}" stroke-width="3" stroke-linejoin="round"/></g>`;
}
function mFoot(x, y, flip = 1) {
  return `<g transform="translate(${x} ${y}) scale(${flip} 1)"><path d="M-14 -2C-16 -10 -4 -12 6 -10C18 -8 26 -2 24 4C22 9 6 10 -6 9C-14 8 -13 4 -14 -2Z" fill="${MG2}" stroke="${MINK}" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M-6 -6C2 -9 12 -7 18 -3" fill="none" stroke="${MG1}" stroke-width="3.5" stroke-linecap="round"/><path d="M-10 6C2 9 14 8 22 5" fill="none" stroke="${MG3}" stroke-width="3" stroke-linecap="round"/></g>`;
}
const mProps = {
  doc: `<g transform="translate(40 168) rotate(-12)"><path d="M-16 -22h26l8 8v34h-34z" fill="#fff" stroke="${MINK}" stroke-width="3" stroke-linejoin="round"/><path d="M10 -22v8h8" fill="#E6EADF" stroke="${MINK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-10 -10h18M-10 -3h18M-10 4h12" stroke="#9AA585" stroke-width="2.6" stroke-linecap="round"/><path d="M-9 12l4 4 8-9" fill="none" stroke="#5DAA45" stroke-width="3" stroke-linecap="round"/></g>`,
  coin: `<g transform="translate(196 172)"><circle r="17" fill="#FFC928" stroke="${MINK}" stroke-width="3"/><circle r="11.5" fill="none" stroke="#C88A00" stroke-width="2.4"/><text y="6" text-anchor="middle" font-size="16" font-weight="800" fill="#8A5A00" font-family="NST,sans-serif">฿</text><path d="M-9-9a13 13 0 0 1 8-5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
  map: `<g transform="translate(196 160) rotate(10)"><path d="M-24-18l15 5 16-5 15 5v38l-15-5-16 5-15-5z" fill="#FFF3D0" stroke="${MINK}" stroke-width="2.8" stroke-linejoin="round"/><path d="M-9-13v38M7-18v38" stroke="#E2C89A" stroke-width="2"/><path d="M-16 8q8-10 16 0t14-6" fill="none" stroke="#FF6B57" stroke-width="2.6" stroke-dasharray="4 3"/><path d="M12-4l4 4m0-4l-4 4" stroke="#FF6B57" stroke-width="2.6"/></g>`,
  flag: `<g transform="translate(202 20)"><path d="M0 0v120" stroke="${MINK}" stroke-width="7" stroke-linecap="round"/><path d="M0 0v120" stroke="#A8743F" stroke-width="3.5" stroke-linecap="round"/><path d="M3 4h40l-10 13 10 13H3z" fill="#FF6B57" stroke="${MINK}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="18" cy="17" r="4.5" fill="#FFD24A"/></g>`
};
const mStar = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-13C2-5 5-2 13 0C5 2 2 5 0 13C-2 5-5 2-13 0C-5-2-2-5 0-13Z" fill="#FFD43B" stroke="${MINK}" stroke-width="2.4" stroke-linejoin="round"/>`;
/* pose map: shift codes D/N/H/S and named poses */
const MPOSE = { D: "work", N: "sleep", H: "wave", S: "idle" };
function catSVG(mood = "H", opts = {}) { return miloSVG(MPOSE[mood] || mood, opts); }
function miloSVG(pose = "idle", opts = {}) {
  const B = "M118 46C92 44 68 60 58 90C48 120 46 152 54 177C61 198 80 210 108 212C136 214 162 207 174 190C186 170 184 130 174 98C164 66 145 47 118 46Z";
  const shade = "M170 98C181 132 182 170 170 189C158 206 130 212 103 210C131 202 152 186 160 158C166 134 167 114 170 98Z";
  const happy = pose === "cheer" || pose === "victory" || pose === "thumbs", sleep = pose === "sleep", wide = pose === "surprised";
  const look = pose === "think" ? "translate(6px,-8px)" : "";
  const eye = happy ? `<path d="M90 104C100 84 128 82 138 102" fill="none" stroke="${MINK}" stroke-width="7" stroke-linecap="round"/><path d="M94 92l-6-6M114 84l1-9M134 92l6-6" stroke="${MINK}" stroke-width="3" stroke-linecap="round"/>`
    : sleep ? `<path d="M88 106C100 118 128 118 140 106" fill="none" stroke="${MINK}" stroke-width="6" stroke-linecap="round"/><path d="M94 114l-4 6M114 118v7M134 114l4 6" stroke="${MINK}" stroke-width="2.6" stroke-linecap="round"/>`
    : `<path d="M84 104C82 84 96 72 114 72C134 72 146 86 144 104C143 122 130 134 113 134C95 134 85 122 84 104Z" fill="#fff" stroke="${MINK}" stroke-width="3.6"/>
       <path d="M140 108C137 124 126 132 112 132C124 126 134 118 140 108Z" fill="#DCE6D6"/>
       <g class="c-pup" style="${look ? `transform:${look}` : ""}">${wide ? `<circle cx="115" cy="104" r="9" fill="#2FB6D6" stroke="${MINK}" stroke-width="2.2"/><circle cx="115" cy="104" r="4.5" fill="${MINK}"/><circle cx="112" cy="101" r="2" fill="#fff"/>`
         : `<path d="M100 106C99 94 106 87 116 87C127 87 132 95 131 106C130 117 123 123 115 123C106 123 101 116 100 106Z" fill="#2FB6D6" stroke="${MINK}" stroke-width="2.4"/>
         <path d="M102 110C104 119 110 122 116 122C125 121 130 115 130 108C126 116 112 118 102 110Z" fill="#167EA6"/>
         <ellipse cx="116" cy="105" rx="7" ry="8" fill="${MINK}"/><path d="M106 96C108 92 112 90 116 91C113 93 110 96 109 99Z" fill="#fff"/><circle cx="122" cy="113" r="2.2" fill="#fff"/>`}</g>
       <g class="c-lid"><path d="M83 104C82 84 96 71 114 71C134 71 147 86 145 104C130 98 98 98 83 104Z" fill="${MG1}"/><path d="M84 104C98 98 130 98 144 104" fill="none" stroke="${MINK}" stroke-width="3.6" stroke-linecap="round"/></g>
       <path d="M82 96C88 78 104 68 120 69C134 70 145 79 148 92" fill="none" stroke="${MINK}" stroke-width="5.5" stroke-linecap="round" ${pose === "think" ? 'transform="translate(0 -4) rotate(-6 114 80)"' : ""}/>`;
  const mouth = happy || pose === "wave" ? `<path d="M90 150C98 172 128 176 140 150C126 156 104 156 90 150Z" fill="#4A1616" stroke="${MINK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M102 164C110 172 124 172 130 163C122 159 110 159 102 164Z" fill="#FF8E9E"/>`
    : wide ? `<path d="M108 152C108 144 122 144 122 152C122 162 108 162 108 152Z" fill="#4A1616" stroke="${MINK}" stroke-width="3"/>`
    : sleep ? `<path d="M108 154C110 150 118 150 120 154C118 158 110 158 108 154Z" fill="#4A1616" stroke="${MINK}" stroke-width="2.6"/>`
    : pose === "think" ? `<path d="M104 154C110 150 120 152 126 156" fill="none" stroke="${MINK}" stroke-width="4.5" stroke-linecap="round"/>`
    : `<path d="M100 152C108 160 120 160 128 151" fill="none" stroke="${MINK}" stroke-width="4.5" stroke-linecap="round"/>`;
  const capTilt = sleep ? 8 : pose === "cheer" ? -6 : -10;
  const cap = `<g class="c-cap" transform="translate(116 52) rotate(${capTilt})">
      <path d="M-48 10C-52 -18 -30 -36 0 -37C30 -38 52 -20 48 10C24 2 -24 2 -48 10Z" fill="#2B57E0" stroke="${MINK}" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M20 -32C38 -26 48 -10 46 8C38 5 30 4 24 3C28 -10 26 -22 20 -32Z" fill="#1C3DAE"/><path d="M-30 -24C-20 -32 -6 -34 6 -33" fill="none" stroke="#7FA2FF" stroke-width="4" stroke-linecap="round"/>
      <path d="M-50 8C-30 2 30 2 56 10C40 26 -30 30 -50 8Z" fill="#2047C4" stroke="${MINK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M-40 16C-14 22 20 22 44 14" fill="none" stroke="#132E8A" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="0" cy="-37" rx="6" ry="3.6" fill="#2B57E0" stroke="${MINK}" stroke-width="2.6"/>
      <path d="M-15 -11C-15 -21 -8 -27 0 -27C9 -27 16 -21 16 -12C16 -2 9 4 0 4C-9 4 -15 -2 -15 -11Z" fill="#fff" stroke="${MINK}" stroke-width="2.6"/>
      <text x="0.5" y="-5" text-anchor="middle" font-family="Chewy,NST,sans-serif" font-size="15.5" fill="#1E45C8" transform="rotate(-4)">Jill</text></g>`;
  const armDown = (side) => side === "R" ? mTube("M174 128C186 140 190 156 188 172") + mGlove(186, 184, -14, "rest", .92) : mTube("M58 128C46 140 42 156 44 172") + mGlove(46, 184, 14, "rest", .92);
  let aR, aL, legs = mTube("M98 206C98 222 96 234 94 246", 13) + mTube("M134 206C136 222 138 234 140 246", 13) + mFoot(88, 252, -1) + mFoot(146, 252, 1), fx = "", prop = "";
  switch (pose) {
    case "wave": aR = mTube("M172 124C188 116 196 100 198 82C199 70 197 62 196 56") + mGlove(196, 46, 8, "open"); aL = armDown("L"); break;
    case "cheer": case "victory": aR = mTube("M170 120C184 104 192 84 196 62") + mGlove(198, 50, 14, "open"); aL = mTube("M64 120C50 104 42 84 38 62") + mGlove(36, 50, -14, "open");
      fx = mStar(24, 96, 1) + mStar(214, 104, .8) + mStar(118, 10, .7); if (pose === "victory") { prop = mProps.flag; aR = mTube("M170 120C184 108 194 96 200 84") + mGlove(202, 78, 8, "fist"); } break;
    case "work": aR = armDown("R"); aL = mTube("M60 128C48 138 42 150 42 162") + mGlove(40, 170, 10, "fist", .9); prop = mProps.doc; break;
    case "coin": aL = armDown("L"); aR = mTube("M174 128C186 140 192 152 194 160") + mGlove(196, 168, -30, "fist", .9); prop = mProps.coin; break;
    case "map": aL = armDown("L"); aR = mTube("M174 128C184 138 190 146 192 152") + mGlove(194, 158, -30, "fist", .9); prop = mProps.map; break;
    case "think": aL = armDown("L"); aR = mTube("M172 130C176 150 160 166 140 166") + mGlove(132, 164, -70, "fist", .85); fx = `<text x="186" y="62" font-size="40" font-weight="800" fill="#4D5B86" stroke="${MINK}" stroke-width="1.5" font-family="Chewy,NST">?</text>`; break;
    case "thumbs": aL = armDown("L"); aR = mTube("M172 126C188 118 196 104 198 90") + mGlove(198, 80, 0, "thumb"); fx = mStar(30, 70, .8); break;
    case "surprised": aR = mTube("M170 120C186 110 196 96 200 80") + mGlove(202, 70, 10, "open"); aL = mTube("M64 120C48 110 38 96 34 80") + mGlove(32, 70, -10, "open");
      fx = `<g fill="#FF6B57" stroke="${MINK}" stroke-width="2.4"><path d="M205 6h10l-2 30h-6z"/><circle cx="210" cy="46" r="5"/></g>`; break;
    case "sign": aL = armDown("L"); aR = `<path d="M196 70L262 -6" stroke="${MINK}" stroke-width="9" stroke-linecap="round"/><path d="M196 70L262 -6" stroke="#C99560" stroke-width="5" stroke-linecap="round"/>` + mTube("M172 126C186 116 194 100 196 86") + mGlove(198, 78, 40, "fist", .95); break;
    case "sleep": aR = armDown("R"); aL = armDown("L"); fx = `<g font-family="Chewy,NST" fill="#4D5B86" stroke="${MINK}" stroke-width="1.2"><text class="c-z" x="182" y="40" font-size="30">z</text><text class="c-z" style="animation-delay:.8s" x="204" y="18" font-size="20">z</text></g>`; break;
    case "walk": aR = mTube("M174 128C188 136 196 146 200 156") + mGlove(204, 166, -40, "rest", .9); aL = mTube("M58 128C48 120 40 110 36 100") + mGlove(34, 90, 160, "rest", .9);
      legs = mTube("M98 206C94 222 86 232 78 240", 13) + mTube("M134 206C140 220 148 230 158 236", 13) + mFoot(72, 246, -1) + mFoot(164, 242, 1); break;
    default: aR = armDown("R"); aL = armDown("L");
  }
  return `<svg class="cat milo-ch p-${pose} ${opts.cls || ""}" viewBox="0 0 240 280" aria-hidden="true">
    <ellipse class="c-shadow" cx="118" cy="258" rx="70" ry="9" fill="rgba(80,120,30,.22)"/>${fx}
    <g class="c-all" ${pose === "sleep" ? 'transform="rotate(4 118 250)"' : ""}>
      <g class="c-legs">${legs}</g>
      <g class="c-armL">${aL}</g>
      <g class="c-body">
        <path d="${B}" fill="${MG1}"/><path d="${shade}" fill="${MG2}"/>
        <path d="M62 178C80 198 140 202 166 184C150 200 120 206 98 205C80 204 68 194 62 178Z" fill="${MG3}" opacity=".55"/>
        <path d="M70 186C92 196 136 198 158 188" fill="none" stroke="${MHL}" stroke-width="3" stroke-linecap="round" opacity=".9"/>
        <g fill="none" stroke="${MINK}" stroke-width="1.8" opacity=".55"><path d="M72 162c-4 0-7 3-7 7s3 7 7 7 7-3 7-7"/><path d="M152 170c-3 0-5 2-5 5"/></g>
        <path d="M72 84C80 64 96 54 114 53C100 60 88 70 82 88C79 92 72 90 72 84Z" fill="#fff" opacity=".9"/><path d="M66 104c-2 4-2 8 0 11" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>
        <path d="${B}" fill="none" stroke="${MINK}" stroke-width="4"/>
        <path d="M176 120C182 150 180 178 168 194C156 208 128 214 100 212" fill="none" stroke="${MINK}" stroke-width="7.5" stroke-linecap="round"/>
        ${eye}
        <path d="M68 136c6-3 14-3 20 0" stroke="#FF88A6" stroke-width="5" stroke-linecap="round" opacity=".8"/><path d="M142 136c6-3 14-3 20 0" stroke="#FF88A6" stroke-width="5" stroke-linecap="round" opacity=".8"/>
        ${mouth}${cap}
      </g>
      <g class="c-armR">${aR}</g>${prop}
    </g></svg>`;
}
/* eyes follow the finger / pointer a little */
document.addEventListener("pointermove", e => {
  document.querySelectorAll(".cat .c-pup").forEach(p => {
    const r = p.ownerSVGElement.getBoundingClientRect(); if (!r.width) return;
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 260)), dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * .45)) / 260));
    p.style.transform = `translate(${dx * 4}px,${dy * 3}px)`;
  });
}, { passive: true });
const CAT_LINES = {
  D: ["สู้ ๆ นะ กะเช้า!", "ใบ OT เดี๋ยว MILO ช่วยสแกน", "อย่าลืมพักดื่มน้ำนะ"],
  N: ["กะดึกคืนนี้ งีบก่อนไปนะ", "ง่วงก็ต้องสู้…", "กลับมานอนให้เต็มอิ่มนะ"],
  H: ["วันหยุด! ไปเที่ยวกัน", "วันนี้ไม่ใช้เงินเกินนะ", "เช็กหนี้ที่ต้องจ่ายกันหน่อยไหม"],
  S: ["โรงงานปิด พักยาว ๆ", "เที่ยวไหนดีน้า"]
};

/* decorated scene behind the cat, changes with the shift */
function catScene(c) {
  const night = c === "N";
  const sky = night ? ["#2B3566", "#4A4F8C"] : c === "D" ? ["#9FDBFF", "#E8F7FF"] : ["#BDEBFF", "#F1FBEA"];
  const stars = night ? [[40, 30], [90, 60], [160, 22], [250, 48], [330, 30], [300, 80], [60, 90], [210, 74]].map(([x, y], i) => `<circle class="tw" style="animation-delay:${i * .4}s" cx="${x}" cy="${y}" r="${i % 3 ? 1.6 : 2.4}" fill="#FFF4C2"/>`).join("") : "";
  const cloud = (x, y, s, o = 1) => `<g class="cl" style="animation-duration:${30 + x / 10}s" transform="translate(${x} ${y}) scale(${s})" opacity="${o}"><ellipse cx="0" cy="0" rx="26" ry="12" fill="#fff"/><ellipse cx="16" cy="-6" rx="18" ry="14" fill="#fff"/><ellipse cx="-14" cy="-3" rx="14" ry="10" fill="#fff"/></g>`;
  const tree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="0" width="10" height="34" rx="4" fill="${night ? "#5B4636" : "#A8743F"}"/><circle cy="-6" r="24" fill="${night ? "#3E6B3A" : "#8CC63F"}"/><circle cx="-9" cy="-14" r="11" fill="${night ? "#4E7F45" : "#B2DE6A"}"/><circle cx="12" cy="2" r="12" fill="${night ? "#365E33" : "#7AB534"}"/></g>`;
  const flower = (x, y, col) => `<g transform="translate(${x} ${y})"><path d="M0 0v10" stroke="#5E9A2A" stroke-width="2"/><circle cy="-2" r="3" fill="${col}"/><circle cx="3" cy="1" r="3" fill="${col}"/><circle cx="-3" cy="1" r="3" fill="${col}"/><circle cy="0" r="1.8" fill="#FFE683"/></g>`;
  return `<svg class="scene-bg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="skyG${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
      <linearGradient id="hill1${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? "#4F7A45" : "#C2E883"}"/><stop offset="1" stop-color="${night ? "#3A5E33" : "#9BD05A"}"/></linearGradient>
      <linearGradient id="hill2${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? "#3E6537" : "#A6D95C"}"/><stop offset="1" stop-color="${night ? "#2E4D29" : "#7EBE3A"}"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#skyG${c})"/>${stars}
    ${night ? `<g transform="translate(320 64)"><circle r="26" fill="#FFF0B8"/><circle cx="11" cy="-8" r="22" fill="#2F3A6E"/></g>` : `<g class="sunray" transform="translate(${c === "D" ? 330 : 60} 62)"><circle r="40" fill="#FFF3B0" opacity=".45"/><circle r="24" fill="#FFD84D"/><circle cx="-7" cy="-8" r="8" fill="#FFF0A0" opacity=".8"/></g>`}
    ${cloud(90, 70, 1, night ? .25 : 1)}${cloud(250, 40, .7, night ? .2 : .9)}${cloud(370, 110, .8, night ? .2 : .85)}
    <path d="M-10 212C70 170 150 182 230 200S360 178 410 190V300H-10z" fill="url(#hill1${c})"/>
    ${tree(46, 200, 1)}${tree(352, 196, 1.15)}${tree(318, 214, .7)}
    ${c === "D" ? `<g transform="translate(250 176)" opacity=".9"><path d="M0 34V12l14 8v-8l14 8v-8l14 8V0h10v34z" fill="#fff"/><rect x="44" y="-14" width="6" height="16" fill="#E6E8DD"/><circle class="smoke" cx="47" cy="-20" r="6" fill="#fff"/></g>` : ""}
    <path d="M-10 238C90 214 180 236 270 232S370 222 410 226V300H-10z" fill="url(#hill2${c})"/>
    ${night ? "" : flower(110, 250, "#FFB8D0") + flower(300, 254, "#FFFFFF") + flower(130, 262, "#FFD25A") + flower(282, 266, "#FFB8D0")}
    ${night ? `<rect x="88" y="218" width="44" height="30" rx="4" fill="#7A5A42"/><path d="M84 220l26-22 26 22z" fill="#8C6A4E"/><rect x="104" y="228" width="12" height="20" fill="#FFD36B"/>` : ""}
  </svg>`;
}
