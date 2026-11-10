const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
const html = fs.readFileSync(file, "utf8");

function extractBlock(html, startToken) {
  const start = html.indexOf(startToken);
  if (start < 0) return null;
  // If starts with <section, match section; if div, match div
  const openTag = startToken.match(/^<(\w+)/)[1];
  const re = new RegExp(`</?${openTag}\\b[^>]*>`, "gi");
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (new RegExp(`^<${openTag}\\b`, "i").test(m[0])) depth++;
    else if (new RegExp(`^</${openTag}>`, "i").test(m[0])) {
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

const section = extractBlock(html, '<section data-marquee-speed="3" class="section-slider-showcase">');
console.log("section found", !!section, section && section.html.length);

// Find the actual slides markup
const wrapStart = html.indexOf('<div class="section-slider-wrapper">');
console.log("wrapper", wrapStart);
if (wrapStart > 0) {
  const wrap = extractBlock(html.slice(wrapStart), '<div class="section-slider-wrapper">');
  // extractBlock relative - fix
}
const wrapper = (() => {
  const start = html.indexOf('<div class="section-slider-wrapper">');
  if (start < 0) return null;
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (/^<div\b/i.test(m[0])) depth++;
    else {
      depth--;
      if (depth === 0) return { start, end: m.index + m[0].length, html: html.slice(start, m.index + m[0].length) };
    }
  }
  return null;
})();

console.log("wrapper len", wrapper && wrapper.html.length);
console.log("wrapper preview", wrapper && wrapper.html.slice(0, 800));
console.log("---slides count---", (wrapper.html.match(/showcase-slide/g) || []).length);

// hero insertion point - after hero-text closes, before section-hero-wrapper closes
const heroText = html.indexOf('<div class="hero-text">');
console.log("hero-text", heroText);
const heroWrapperCloseHint = html.indexOf('</div></div><div data-w-id', html.indexOf('section-hero-wrapper'));
// find section-hero-wrapper block end area
const shw = html.indexOf('class="section-hero-wrapper"');
console.log("near hero end sample:");
const afterHeroText = html.indexOf('</div>', html.indexOf('hero-pill three'));
console.log(html.slice(html.indexOf('<div class="hero-text">'), html.indexOf('<div class="hero-text">') + 1200));
