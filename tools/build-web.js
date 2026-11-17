/* Assemble the web app into www/ (used by the Android app and the claude.ai artifact).
   usage: node tools/build-web.js [webVersion] */
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, ".."), W = path.join(R, "web-src"), OUT = path.join(R, "www"), NM = path.join(R, "node_modules");
const ver = process.argv[2] || "0";
const read = f => fs.readFileSync(path.join(W, f), "utf8");
let html = read("shell.html")
  .replace("/*CSS*/", () => read("app.css")).replace("/*ROSTER*/", () => read("roster.js"))
  .replace("/*ENGINE*/", () => read("engine.js") + "\n" + read("debt.js")).replace("/*SLIP*/", () => read("slip.js"))
  .replace("/*APP*/", () => ["art.js", "app1.js", "app2.js", "app3.js", "debtui.js", "app4.js"].map(read).join("\n"))
  .replace("__MQ_WEB_VERSION__", ver);
fs.rmSync(OUT, { recursive: true, force: true });
for (const d of ["vendor/core", "vendor/lang", "vendor/fonts"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), html);
const cp = (a, b) => fs.copyFileSync(path.join(NM, a), path.join(OUT, b));
cp("tesseract.js/dist/tesseract.min.js", "vendor/tesseract.min.js");
cp("tesseract.js-core/tesseract-core-lstm.wasm.js", "vendor/core/tesseract-core-lstm.wasm.js");
cp("tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "vendor/core/tesseract-core-simd-lstm.wasm.js");
cp("@tesseract.js-data/tha/4.0.0_best_int/tha.traineddata.gz", "vendor/lang/tha.traineddata.wasm");   // some hosts refuse .gz
cp("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "vendor/lang/eng.traineddata.wasm");
cp("jsqr/dist/jsQR.js", "vendor/jsQR.js");
for (const s of ["thai", "latin"]) for (const w of [400, 600, 700, 800]) cp(`@fontsource/noto-sans-thai/files/noto-sans-thai-${s}-${w}-normal.woff2`, `vendor/fonts/nst-${s}-${w}.woff2`);
cp("@capacitor/core/dist/capacitor.js", "vendor/capacitor.js");
const shim = '/* language files are served as .wasm */(function(){var f=self.fetch;self.fetch=function(u,o){return f(String(u).replace(/\\.traineddata\\.gz$/,".traineddata.wasm"),o)}})();\n';
fs.writeFileSync(path.join(OUT, "vendor/worker.min.js"), shim + fs.readFileSync(path.join(NM, "tesseract.js/dist/worker.min.js"), "utf8"));
console.log(`www/ built · web v${ver} · ${(html.length / 1024).toFixed(0)} KB`);
