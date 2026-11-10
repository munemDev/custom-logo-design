const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

// Remove mid-page showcase that is NOT inside hero-banner-showcase
// Find all section-slider-showcase sections
const starts = [];
let idx = 0;
while (true) {
  const i = html.indexOf('class="section-slider-showcase', idx);
  if (i < 0) break;
  // walk back to <section
  const secStart = html.lastIndexOf("<section", i);
  starts.push(secStart);
  idx = i + 1;
}
console.log("showcase sections at", starts);

function extractSection(html, start) {
  const re = /<\/?section\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (/^<section\b/i.test(m[0])) depth++;
    else {
      depth--;
      if (depth === 0) return { start, end: m.index + m[0].length };
    }
  }
  return null;
}

// Keep only the one inside hero-banner-showcase; remove others
const keep = [];
const remove = [];
for (const s of starts) {
  const before = html.slice(Math.max(0, s - 200), s);
  if (before.includes("hero-banner-showcase")) keep.push(s);
  else remove.push(s);
}
console.log("keep", keep.length, "remove", remove.length);

// Remove from end to start so indexes stay valid
for (const s of remove.sort((a, b) => b - a)) {
  const block = extractSection(html, s);
  if (block) {
    html = html.slice(0, block.start) + html.slice(block.end);
    console.log("removed section at", s);
  }
}

fs.writeFileSync(file, html);
console.log(
  "remaining section-slider-showcase",
  (html.match(/section-slider-showcase/g) || []).length
);
console.log(
  "hero-banner-showcase present",
  html.includes("hero-banner-showcase")
);
