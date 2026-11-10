const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

const inputBlock =
  '<div class="hero-search-wrap"><input class="hero-search-input" type="text" name="q" placeholder="Search projects, brands, ideas…" autocomplete="off" /></div>';

// Remove existing wrap wherever it is
html = html.replace(
  /<div class="hero-search-wrap"><input class="hero-search-input"[^>]*\/?><\/div>/,
  ""
);

// Insert inside .hero-text, after the last hero-pill (before hero-text closes)
const pillThree =
  '<div class="hero-pill three"><div class="hero-pill-text">No funny business</div></div>';
const pillIdx = html.indexOf(pillThree);
if (pillIdx < 0) {
  console.error("pill three not found");
  process.exit(1);
}
const insertAt = pillIdx + pillThree.length;
html = html.slice(0, insertAt) + inputBlock + html.slice(insertAt);

// Refresh CSS
html = html.replace(
  /<style id="hero-search-input-css">[\s\S]*?<\/style>/,
  `<style id="hero-search-input-css">
.hero-text{ z-index:80; }
.hero-search-wrap{
  width:min(34em, 92vw);
  margin:1.5em auto 0;
  position:relative;
  z-index:80;
}
.hero-marquee, .hero-path-svg-left, .hero-path-svg-right{
  z-index:1 !important;
}
.hero-search-input{
  width:100%;
  box-sizing:border-box;
  appearance:none;
  -webkit-appearance:none;
  border:2px solid #111;
  outline:none;
  background:#fff;
  color:#111;
  font-family:var(--font-secondary), "Neuemontreal", sans-serif;
  font-size:1.05em;
  font-weight:500;
  line-height:1.2;
  border-radius:100px;
  padding:1.05em 1.5em;
  box-shadow:0 10px 30px rgba(0,0,0,.12);
}
.hero-search-input::placeholder{ color:rgba(17,17,17,.42); }
.hero-search-input:focus{
  border-color:#ff5400;
  box-shadow:0 10px 32px rgba(255,84,0,.2), 0 0 0 3px rgba(255,84,0,.25);
}
@media (max-width:767px){
  .hero-search-input{font-size:1em; padding:.95em 1.2em}
}
</style>`
);

fs.writeFileSync(file, html);
console.log("input moved inside hero-text");
console.log(
  "order check",
  html.includes(
    'No funny business</div></div><div class="hero-search-wrap">'
  )
);
