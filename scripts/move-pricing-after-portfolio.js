const fs = require("fs");
const p = "f:/logo-brand/site/index.html";
let h = fs.readFileSync(p, "utf8");

const re = /\n      <section class="section-pricing"[\s\S]*?<\/section>/;
const m = h.match(re);
if (!m) {
  console.error("no pricing section");
  process.exit(1);
}
const block = m[0];
h = h.replace(re, "");

const marker = "\n      <section class=\"section-services\">";
const i = h.indexOf(marker);
if (i < 0) {
  console.error("no services section");
  process.exit(1);
}
h = h.slice(0, i) + block + h.slice(i);
fs.writeFileSync(p, h);

const order = [...h.matchAll(/<section class="(section-[a-z-]+)"/g)].map(
  (x) => x[1]
);
console.log(
  order.filter((s) =>
    [
      "section-projects",
      "section-pricing",
      "section-services",
      "section-testimonials",
      "section-faq",
    ].includes(s)
  )
);
