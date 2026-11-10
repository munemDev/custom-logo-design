const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

// Update CSS so input sits clearly under headline, above marquee
html = html.replace(
  /<style id="hero-search-input-css">[\s\S]*?<\/style>/,
  `<style id="hero-search-input-css">
.hero-search-wrap{
  width:100%;
  max-width:34em;
  margin:1.25em auto 0;
  position:relative;
  z-index:80;
  padding:0 1.25em;
  box-sizing:border-box;
  pointer-events:auto;
}
.section-hero-wrapper .hero-marquee{
  position:relative;
  z-index:1;
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
.hero-search-input::placeholder{
  color:rgba(17,17,17,.42);
}
.hero-search-input:focus{
  border-color:#ff5400;
  box-shadow:0 10px 32px rgba(255,84,0,.2), 0 0 0 3px rgba(255,84,0,.25);
}
@media (max-width:767px){
  .hero-search-wrap{max-width:100%}
  .hero-search-input{font-size:1em; padding:.95em 1.2em}
}
</style>`
);

// Move input to sit AFTER hero-text but ensure hero-marquee comes after input
// Current order might be: hero-text, input, path svgs..., marquee
// Check if marquee is before input somehow overlapping via absolute

fs.writeFileSync(file, html);
console.log("updated input styles");
