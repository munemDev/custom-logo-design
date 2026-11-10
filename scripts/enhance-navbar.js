/**
 * Inject polished navbar CSS into every HTML page (idempotent).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");
const STYLE_ID = "navbar-enhance-css";

const CSS = `
<style id="${STYLE_ID}">
@import url("https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&display=swap");

.header{
  position:relative;
  z-index:50;
}

.navbar-wrap{
  width:min(1120px, calc(100% - 1.5rem)) !important;
  margin:0.85rem auto 0 !important;
  padding:0.7rem 0.85rem !important;
  align-items:center !important;
  gap:0.75rem !important;
  background:rgba(253,248,245,0.78) !important;
  border:1px solid rgba(255,84,0,0.14) !important;
  border-radius:999px !important;
  backdrop-filter:blur(16px) saturate(1.2);
  -webkit-backdrop-filter:blur(16px) saturate(1.2);
  box-shadow:
    0 10px 30px rgba(15, 40, 38, 0.06),
    0 1px 0 rgba(255,255,255,0.75) inset !important;
  animation:navBarIn 0.7s cubic-bezier(.22,1,.36,1) both;
}

@keyframes navBarIn{
  from{ opacity:0; transform:translateY(-12px) scale(0.98); }
  to{ opacity:1; transform:none; }
}

.navbar-links{
  min-width:auto !important;
  gap:0.45rem !important;
}

.navbar-right{
  min-width:auto !important;
  gap:1.25rem !important;
}

.navbar-logo{
  width:auto !important;
  min-width:7.5em;
  display:flex !important;
  justify-content:center;
  align-items:center;
  transition:transform 0.35s cubic-bezier(.22,1,.36,1);
}
.navbar-logo:hover{ transform:scale(1.03); }

.navbar-logo .brand-wordmark,
.header .brand-wordmark{
  font-family:"Syne", var(--font-primary), Impact, sans-serif !important;
  font-weight:800 !important;
  font-size:clamp(1.05rem, 1.7vw, 1.55rem) !important;
  letter-spacing:0.01em !important;
  color:var(--brand-primary, #ff5400) !important;
  -webkit-text-fill-color:var(--brand-primary, #ff5400) !important;
  background:none !important;
  -webkit-background-clip:initial;
  background-clip:initial;
  position:relative;
}

.navbar-link-btn{
  height:2.45em !important;
  padding:0 1.2em !important;
  background:rgba(255,255,255,0.92) !important;
  border:1px solid rgba(0,0,0,0.06) !important;
  box-shadow:0 1px 2px rgba(0,0,0,0.04);
  transition:
    transform 0.28s cubic-bezier(.22,1,.36,1),
    background-color 0.28s ease,
    border-color 0.28s ease,
    box-shadow 0.28s ease,
    color 0.28s ease;
}
.navbar-link-btn:hover{
  transform:translateY(-2px);
  background:var(--brand-primary, #ff5400) !important;
  border-color:transparent !important;
  box-shadow:0 8px 18px rgba(255,84,0,0.28);
}
.navbar-link-btn:hover .navlink-text{
  color:#fff !important;
}
.navbar-link-btn .navlink-text{
  font-weight:600 !important;
  letter-spacing:0.01em;
  transition:color 0.28s ease;
}
.navbar-link-btn .stroke-fill{
  opacity:0 !important;
  pointer-events:none !important;
}

.navbar-timing{
  max-width:8.5em !important;
  font-size:0.78em !important;
  font-weight:600 !important;
  line-height:1.25 !important;
  letter-spacing:0.02em;
  color:rgba(0,0,0,0.62) !important;
  text-align:right;
}

.cta-wrap .cta-btn,
a.cta-btn{
  border-radius:999px !important;
  transition:
    transform 0.3s cubic-bezier(.22,1,.36,1),
    box-shadow 0.3s ease,
    background-color 0.3s ease !important;
  box-shadow:0 6px 16px rgba(0,0,0,0.16);
}
.cta-wrap .cta-btn:hover,
a.cta-btn:hover{
  transform:translateY(-2px) scale(1.02);
  box-shadow:0 12px 28px rgba(0,0,0,0.22);
}
.cta-btn-arrow{
  transition:transform 0.3s cubic-bezier(.22,1,.36,1);
}
.cta-btn:hover .cta-btn-arrow{
  transform:translate(2px,-2px) scale(1.06);
}

/* Keep mobile hamburger layout clean */
@media (max-width: 991px){
  .navbar-wrap{
    width:calc(100% - 1rem) !important;
    margin-top:0.65rem !important;
    padding:0.55rem 0.65rem !important;
    border-radius:1.25rem !important;
  }
}
@media (max-width: 767px){
  .navbar-wrap{
    border-radius:1.1rem !important;
  }
  .navbar-timing{ display:none !important; }
}
</style>
`.trim();

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "assets" || ent.name === "node_modules") continue;
      walk(p, files);
    } else if (ent.name.endsWith(".html")) files.push(p);
  }
  return files;
}

let n = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  const blockRe = new RegExp(
    `<style id="${STYLE_ID}">[\\s\\S]*?<\\/style>`,
    "i"
  );
  if (blockRe.test(html)) {
    html = html.replace(blockRe, CSS);
  } else if (html.includes('id="brand-wordmark-css"')) {
    html = html.replace(
      /(<style id="brand-wordmark-css">[\s\S]*?<\/style>)/i,
      `$1${CSS}`
    );
  } else if (html.includes("</head>")) {
    html = html.replace("</head>", `${CSS}</head>`);
  } else {
    console.log("skip", path.relative(ROOT, file));
    continue;
  }
  fs.writeFileSync(file, html);
  n++;
  console.log("nav enhanced", path.relative(ROOT, file));
}
console.log("DONE", n);
