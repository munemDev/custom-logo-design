const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

// Remove previous insert if re-run
html = html.replace(/<style id="hero-search-input-css">[\s\S]*?<\/style>/g, "");
html = html.replace(/<div class="hero-search-wrap">[\s\S]*?<\/div>/, "");

const style = `<style id="hero-search-input-css">
.hero-search-wrap{
  width:100%;
  max-width:36em;
  margin:0.5em auto 2.5em;
  position:relative;
  z-index:6;
  padding:0 1.25em;
  box-sizing:border-box;
}
.hero-search-input{
  width:100%;
  box-sizing:border-box;
  appearance:none;
  border:none;
  outline:none;
  background:#fff;
  color:#111;
  font-family:var(--font-secondary), "Neuemontreal", sans-serif;
  font-size:1.05em;
  font-weight:500;
  line-height:1.2;
  border-radius:100px;
  padding:1em 1.4em;
  box-shadow:0 8px 28px rgba(0,0,0,.08);
}
.hero-search-input::placeholder{
  color:rgba(17,17,17,.45);
}
.hero-search-input:focus{
  box-shadow:0 10px 32px rgba(255,84,0,.18), 0 0 0 2px rgba(255,84,0,.35);
}
@media (max-width:767px){
  .hero-search-wrap{max-width:100%; margin-bottom:2em}
  .hero-search-input{font-size:1em; padding:.95em 1.2em}
}
</style>`;

const inputHtml = `<div class="hero-search-wrap"><input class="hero-search-input" type="text" name="q" placeholder="Search projects, brands, ideas…" autocomplete="off" /></div>`;

// Insert right after .hero-text closes
const heroTextStart = html.indexOf('<div class="hero-text">');
if (heroTextStart < 0) {
  console.error("hero-text not found");
  process.exit(1);
}
const re = /<\/?div\b[^>]*>/gi;
re.lastIndex = heroTextStart;
let depth = 0;
let heroTextEnd = -1;
let m;
while ((m = re.exec(html))) {
  if (/^<div\b/i.test(m[0])) depth++;
  else {
    depth--;
    if (depth === 0) {
      heroTextEnd = m.index + m[0].length;
      break;
    }
  }
}
if (heroTextEnd < 0) {
  console.error("hero-text end not found");
  process.exit(1);
}

html = html.slice(0, heroTextEnd) + inputHtml + html.slice(heroTextEnd);

if (!html.includes('id="hero-search-input-css"')) {
  html = html.replace("</head>", style + "</head>");
}

fs.writeFileSync(file, html);
console.log("Added hero input below headline.");
console.log("has wrap?", html.includes("hero-search-wrap"));
