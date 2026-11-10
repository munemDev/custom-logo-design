const fs = require("fs");
const h = fs.readFileSync("f:/logo-brand/site/index.html", "utf8");

const keys = [
  "w-background-video",
  "Hero",
  "hero",
  "Partnerships",
  "Never one and done",
  "data-video-urls",
  "LOOKING SUSPICIOUSLY",
  "about-section",
  "selected",
];
for (const k of keys) {
  console.log(k, h.includes(k) ? h.indexOf(k) : "NO");
}

// extract video blocks
const re = /<div[^>]*w-background-video[\s\S]*?<\/div>\s*<\/div>/gi;
let m;
let n = 0;
while ((m = re.exec(h)) && n < 5) {
  console.log("\nVIDEO BLOCK", n, "at", m.index, "len", m[0].length);
  console.log(m[0].slice(0, 400));
  n++;
}

// find section around hero characters / banner
const idx = h.indexOf("LOOKING SUSPICIOUSLY");
console.log("\naround heading", idx);
console.log(h.slice(Math.max(0, idx - 500), idx + 800).replace(/\s+/g, " ").slice(0, 1200));

const pIdx = h.indexOf("Never one and done");
console.log("\npartnerships idx", pIdx);
if (pIdx > -1) console.log(h.slice(pIdx - 300, pIdx + 500).replace(/\s+/g, " ").slice(0, 900));
