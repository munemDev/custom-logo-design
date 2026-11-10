const fs = require("fs");
const h = fs.readFileSync("f:/logo-brand/site/index.html", "utf8");

function snippet(around, before = 200, after = 400) {
  const i = h.indexOf(around);
  if (i < 0) return "NOT FOUND: " + around;
  return h.slice(i - before, i + after);
}

// Find hero-video-loop full block bounds
const start = h.indexOf('<div class="hero-video-loop">');
const sectionStart = h.indexOf('<div class="section-hero-wrapper">');
const radial = h.indexOf('section-radial-cards');
const selected = h.indexOf("Selected Works");
const about = h.indexOf("A BIT ABOUT US") !== -1 ? h.indexOf("A BIT ABOUT US") : h.indexOf("Professional overthinkers");

console.log({
  sectionHero: sectionStart,
  heroVideo: start,
  radial,
  selected,
  about,
});

// print from section-hero-wrapper until next major section after video
if (start > -1) {
  // find closing of hero-video-loop roughly by searching next sibling sections
  const afterVideo = h.indexOf("</div></div></div>", start);
  console.log("\n=== HERO VIDEO AREA ===");
  console.log(h.slice(start, start + 2500));
}

console.log("\n=== RADIAL SECTION START ===");
console.log(h.slice(radial - 80, radial + 3500));

// Check if css/js for radial already exists
console.log("\n=== ASSETS CHECK ===");
console.log("radial css?", h.includes("radial-cards"));
console.log("huge-cards folder?", fs.existsSync("f:/logo-brand/site/assets/huge-cards"));
if (fs.existsSync("f:/logo-brand/site/assets/huge-cards")) {
  console.log(fs.readdirSync("f:/logo-brand/site/assets/huge-cards"));
}

// Find style/script for radial
const styleIdx = h.indexOf("radial-cards-marquee");
console.log("occurrences of radial-cards-marquee", (h.match(/radial-cards-marquee/g) || []).length);
