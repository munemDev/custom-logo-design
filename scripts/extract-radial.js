const fs = require("fs");
const h = fs.readFileSync("f:/logo-brand/site/index.html", "utf8");

// Find style blocks mentioning radial
const styles = [];
const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m;
while ((m = styleRe.exec(h))) {
  if (/radial-card/i.test(m[1])) styles.push(m[1]);
}
console.log("style blocks with radial:", styles.length);
styles.forEach((s, i) => {
  fs.writeFileSync(`f:/logo-brand/scripts/_radial-style-${i}.css`, s);
  console.log("wrote style", i, "len", s.length);
});

const scripts = [];
const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
while ((m = scriptRe.exec(h))) {
  if (/radial-card/i.test(m[1])) scripts.push(m[1]);
}
console.log("script blocks with radial:", scripts.length);
scripts.forEach((s, i) => {
  fs.writeFileSync(`f:/logo-brand/scripts/_radial-script-${i}.js`, s);
  console.log("wrote script", i, "len", s.length);
});

// Find end of radial section
const start = h.indexOf('<section class="section-radial-cards"');
const end = h.indexOf("</section>", start);
console.log("radial section length", end - start);
fs.writeFileSync(
  "f:/logo-brand/scripts/_radial-section.html",
  h.slice(start, end + "</section>".length)
);

// Find hero-video-loop exact end - next sibling is hero-path-svg-left
const hv = h.indexOf('<div class="hero-video-loop">');
const after = h.indexOf('<div class="hero-path-svg-left">', hv);
console.log("hero-video-loop block:\n", h.slice(hv, after));
