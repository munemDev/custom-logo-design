const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

const startToken = '<div class="hero-video-loop">';
const start = html.indexOf(startToken);
if (start === -1) {
  console.error("hero-video-loop not found");
  process.exit(1);
}

// Walk nested divs from start until this block closes
let i = start;
let depth = 0;
let end = -1;
const tagRe = /<\/?div\b[^>]*>/gi;
tagRe.lastIndex = start;
let m;
while ((m = tagRe.exec(html))) {
  const tag = m[0];
  if (/^<div\b/i.test(tag)) depth++;
  else if (/^<\/div>/i.test(tag)) {
    depth--;
    if (depth === 0) {
      end = m.index + tag.length;
      break;
    }
  }
}

if (end === -1) {
  console.error("could not find closing div for hero-video-loop");
  process.exit(1);
}

const removed = html.slice(start, end);
console.log("Removing block length:", removed.length);
console.log("Preview:", removed.slice(0, 180).replace(/\s+/g, " "));

html = html.slice(0, start) + html.slice(end);
fs.writeFileSync(file, html);
console.log("Done. hero-video-loop removed from homepage.");
console.log("Still has hero-video?", html.includes("hero-video-loop"));
console.log("Still has Hero_mp4?", html.includes("Hero_mp4"));
