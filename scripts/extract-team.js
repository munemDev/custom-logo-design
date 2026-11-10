const fs = require("fs");
const h = fs.readFileSync("f:/logo-brand/site/about/index.html", "utf8");

const re =
  /<div class="team-card">[\s\S]*?<img src="([^"]+)"[\s\S]*?<div class="team-name">([^<]+)<\/div>[\s\S]*?<div class="team-sub">([^<]+)<\/div>/g;
let m;
while ((m = re.exec(h))) {
  console.log({
    src: m[1],
    name: m[2],
    role: m[3],
  });
}

const popup =
  /team-popup[\s\S]{0,200}?src="([^"]+)"[\s\S]{0,800}?team-popup-name[^>]*>([^<]+)/gi;
while ((m = popup.exec(h))) {
  console.log("popup", m[1], m[2]);
}

console.log("--- hero ---");
const hero = h.match(/Founded[^<]+/);
console.log(hero && hero[0]);
