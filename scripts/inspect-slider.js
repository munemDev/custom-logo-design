const fs = require("fs");
const h = fs.readFileSync("f:/logo-brand/site/index.html", "utf8");
const start = h.indexOf('class="section-slider-showcase"');
console.log("start", start);
console.log(h.slice(start, start + 3500));
const endMarker = h.indexOf('class="section-projects"');
console.log("\nprojects at", endMarker);
// find closing - rough: from slider to projects
console.log("\n--- length between slider and projects ---", endMarker - start);
