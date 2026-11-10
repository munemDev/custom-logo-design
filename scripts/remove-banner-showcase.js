const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

function extractByStart(html, startToken) {
  const start = html.indexOf(startToken);
  if (start < 0) return null;
  const tag = startToken.match(/^<(\w+)/)[1];
  const re = new RegExp(`</?${tag}\\b[^>]*>`, "gi");
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (new RegExp(`^<${tag}\\b`, "i").test(m[0])) depth++;
    else {
      depth--;
      if (depth === 0) {
        return {
          start,
          end: m.index + m[0].length,
          html: html.slice(start, m.index + m[0].length),
        };
      }
    }
  }
  return null;
}

// Remove every hero-banner-showcase block
let removed = 0;
while (html.includes('<div class="hero-banner-showcase">')) {
  const block = extractByStart(html, '<div class="hero-banner-showcase">');
  if (!block) break;
  html = html.slice(0, block.start) + html.slice(block.end);
  removed++;
}

// Also remove any leftover mid-page showcase sections
while (html.includes('class="section-slider-showcase')) {
  const i = html.indexOf('class="section-slider-showcase');
  const start = html.lastIndexOf("<section", i);
  if (start < 0) break;
  const re = /<\/?section\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  let end = -1;
  let m;
  while ((m = re.exec(html))) {
    if (/^<section\b/i.test(m[0])) depth++;
    else {
      depth--;
      if (depth === 0) {
        end = m.index + m[0].length;
        break;
      }
    }
  }
  if (end < 0) break;
  html = html.slice(0, start) + html.slice(end);
  removed++;
  console.log("removed leftover section-slider-showcase");
}

// Remove injected CSS
html = html.replace(
  /<style id="hero-banner-showcase-css">[\s\S]*?<\/style>/,
  ""
);

fs.writeFileSync(file, html);
console.log("removed blocks:", removed);
console.log(
  "still has hero-banner-showcase?",
  html.includes("hero-banner-showcase")
);
console.log(
  "still has section-slider-showcase?",
  html.includes("section-slider-showcase")
);
console.log("still has showcase-slider?", html.includes("showcase-slider"));
