const fs = require("fs");
const html = fs.readFileSync("f:/logo-brand/site/index.html", "utf8");
const markers = [
  "section-slider-showcase",
  "section-projects",
  "section-slider-wrapper",
  "showcase-slider",
];
for (const m of markers) {
  let idx = 0;
  let n = 0;
  while ((idx = html.indexOf(m, idx)) !== -1 && n < 5) {
    console.log(m, idx, JSON.stringify(html.slice(Math.max(0, idx - 40), idx + m.length + 20)));
    idx += m.length;
    n++;
  }
}
