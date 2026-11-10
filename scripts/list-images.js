const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");
const exts = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (exts.has(path.extname(ent.name).toLowerCase())) files.push(p);
  }
  return files;
}

const all = walk(path.join(ROOT, "assets"));
console.log("total asset images:", all.length);

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const refs = [
  ...html.matchAll(
    /(?:src|srcset|poster|data-poster-url|content)=["']([^"']+\.(?:jpg|jpeg|png|webp|avif|gif))[^"']*["']/gi
  ),
].map((m) => m[1].split(" ")[0]);

const unique = [...new Set(refs.map((u) => decodeURIComponent(u)))];
console.log("homepage image refs:", unique.length);

// showcase slides specifically
const showcase = unique.filter(
  (u) => /Shot|showcase|6ab263|6ab26|hero/i.test(u) || u.includes("Shot")
);
console.log("\nshowcase-ish:");
showcase.slice(0, 40).forEach((u) => console.log(u));

fs.writeFileSync(
  path.join(__dirname, "..", "image-inventory.json"),
  JSON.stringify({ totalAssets: all.length, homepageRefs: unique }, null, 2)
);
