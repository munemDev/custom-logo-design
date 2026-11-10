const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "site", "index.html"), "utf8");

const markers = [
  "hero-banner-showcase",
  "section-slider-showcase",
  "section-slider-wrapper",
  "showcase-slider",
  "Shot 2.jpg",
  "Vitabun",
  "section-about",
  "section-projects",
];

for (const m of markers) {
  let i = 0;
  let n = 0;
  const positions = [];
  while ((i = html.indexOf(m, i)) !== -1) {
    n++;
    positions.push(i);
    i += m.length;
  }
  console.log(m, "count=", n, "pos=", positions.slice(0, 8).join(","));
}

// Show context around each section-slider-wrapper
let idx = 0;
let n = 0;
while ((idx = html.indexOf('<div class="section-slider-wrapper">', idx)) !== -1) {
  n++;
  const ctx = html.slice(Math.max(0, idx - 120), idx + 80).replace(/\s+/g, " ");
  console.log("\nwrapper#", n, "at", idx);
  console.log(ctx);
  idx += 10;
}
