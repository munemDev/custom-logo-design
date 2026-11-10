const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

function extractDivOrSection(html, startToken) {
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

// 1) Extract full showcase section
const sectionToken =
  '<section data-marquee-speed="3" class="section-slider-showcase">';
const section = extractDivOrSection(html, sectionToken);
if (!section) {
  console.error("showcase section not found");
  process.exit(1);
}
console.log("showcase section bytes", section.html.length);

// 2) Find insertion point: right after </div> that closes .hero-text
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

// Avoid double-insert
if (html.includes('class="hero-banner-showcase"')) {
  console.log("Already inserted — removing previous hero-banner-showcase first");
  const prev = extractDivOrSection(
    html,
    '<div class="hero-banner-showcase">'
  );
  if (prev) {
    html = html.slice(0, prev.start) + html.slice(prev.end);
    // re-find positions after mutation
  }
}

// Recompute after possible previous removal
const fresh = fs.readFileSync(file, "utf8");
// use current html variable which may already be modified only if we removed - rewrite cleanly from disk then
html = fresh.includes('class="hero-banner-showcase"')
  ? (() => {
      const p = extractDivOrSection(
        fresh,
        '<div class="hero-banner-showcase">'
      );
      return p ? fresh.slice(0, p.start) + fresh.slice(p.end) : fresh;
    })()
  : fresh;

const section2 = extractDivOrSection(html, sectionToken);
const heroTextStart2 = html.indexOf('<div class="hero-text">');
const re2 = /<\/?div\b[^>]*>/gi;
re2.lastIndex = heroTextStart2;
let d2 = 0;
let heroTextEnd2 = -1;
let m2;
while ((m2 = re2.exec(html))) {
  if (/^<div\b/i.test(m2[0])) d2++;
  else {
    d2--;
    if (d2 === 0) {
      heroTextEnd2 = m2.index + m2[0].length;
      break;
    }
  }
}

// Build banner version of section — keep scripts/styles, reduce outer padding via class
let bannerSection = section2.html.replace(
  'class="section-slider-showcase"',
  'class="section-slider-showcase hero-inline-showcase"'
);

const insert = `<div class="hero-banner-showcase">${bannerSection}</div>`;

// Insert after hero-text
html = html.slice(0, heroTextEnd2) + insert + html.slice(heroTextEnd2);

// Remove the ORIGINAL mid-page showcase section (now duplicated in banner)
// Find the one NOT inside hero-banner-showcase — after insert there are two.
// Remove the later one (original position shifts).
const first = html.indexOf(sectionToken);
const second = html.indexOf(sectionToken, first + 1);
if (second > 0) {
  const orig = extractDivOrSection(html.slice(second), sectionToken);
  // extract relative — compute absolute
  const absStart = second;
  const re3 = /<\/?section\b[^>]*>/gi;
  re3.lastIndex = absStart;
  let d3 = 0;
  let absEnd = -1;
  let m3;
  while ((m3 = re3.exec(html))) {
    if (/^<section\b/i.test(m3[0])) d3++;
    else {
      d3--;
      if (d3 === 0) {
        absEnd = m3.index + m3[0].length;
        break;
      }
    }
  }
  if (absEnd > 0) {
    html = html.slice(0, absStart) + html.slice(absEnd);
    console.log("Removed duplicate mid-page showcase section");
  }
} else {
  console.log("Only one showcase section present");
}

// Inject CSS for banner placement (once)
const styleTag = `<style id="hero-banner-showcase-css">
.hero-banner-showcase {
  width: 100%;
  max-width: 100%;
  margin-top: 1.5em;
  margin-bottom: 2em;
  position: relative;
  z-index: 5;
}
.hero-banner-showcase .section-slider-showcase.hero-inline-showcase {
  padding-top: 0 !important;
  padding-bottom: 2em !important;
  width: 100%;
}
.hero-banner-showcase .showcase-slide {
  width: min(22em, 70vw);
  height: min(22em, 70vw);
}
@media (max-width: 767px) {
  .hero-banner-showcase .showcase-slide {
    width: 16em;
    height: 16em;
  }
}
</style>`;

if (!html.includes('id="hero-banner-showcase-css"')) {
  html = html.replace("</head>", styleTag + "</head>");
}

fs.writeFileSync(file, html);
console.log("Done. Banner now includes showcase slider.");
console.log(
  "hero-banner-showcase count",
  (html.match(/hero-banner-showcase/g) || []).length
);
console.log(
  "section-slider-showcase count",
  (html.match(/section-slider-showcase/g) || []).length
);
