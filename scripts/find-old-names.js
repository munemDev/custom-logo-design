const fs = require("fs");
const h = fs.readFileSync("f:/logo-brand/site/about/index.html", "utf8");
for (const name of ["Bogdan", "Andreea", "Diana", "Apalaghiei", "Liche"]) {
  let idx = 0;
  let n = 0;
  while ((idx = h.toLowerCase().indexOf(name.toLowerCase(), idx)) >= 0) {
    n++;
    console.log(name, n, JSON.stringify(h.slice(Math.max(0, idx - 60), idx + 80)));
    idx += name.length;
  }
}
