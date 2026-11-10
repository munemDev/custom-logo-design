const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "site");
const blockRe =
  /<div class="footer-top-right-btm"><div class="footer-links-block"><a href="#" class="footer-link">Handmade by humans\.<br\/>Well, digitally<\/a><\/div><div class="footer-address">Bucharest,<br\/>Romania<\/div><\/div>/g;

let files = 0;
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === "assets" || e.name === "node_modules") continue;
      walk(p);
    } else if (/\.html?$/i.test(e.name)) {
      let h = fs.readFileSync(p, "utf8");
      if (!h.includes("Handmade by humans")) continue;
      const next = h.replace(blockRe, "");
      if (next === h) {
        console.log("NO MATCH", path.relative(root, p));
        continue;
      }
      fs.writeFileSync(p, next);
      files++;
      console.log("updated", path.relative(root, p));
    }
  }
}
walk(root);
console.log("DONE files", files);
