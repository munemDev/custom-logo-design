const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.join(__dirname, "..", "site");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "assets") continue;
      walk(p, files);
    } else if (ent.name.endsWith(".html")) files.push(p);
  }
  return files;
}

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        resolve(res.statusCode);
        res.resume();
      })
      .on("error", reject);
  });
}

(async () => {
  const pages = walk(ROOT);
  console.log("HTML pages:", pages.length);
  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const remote = (html.match(/https:\/\/cdn\.prod\.website-files\.com/g) || [])
      .length;
    const heads = [
      ...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi),
    ].map((x) =>
      x[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&#x27;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
    );
    const meaningful = heads.filter(
      (h) => h && !/^(want to|start|a new|project\?)$/i.test(h)
    );
    console.log("\n" + rel);
    console.log("  remote CDN leftovers:", remote);
    console.log("  sections:", meaningful.join(" || "));
  }

  const checks = [
    "http://localhost:3000/",
    "http://localhost:3000/about/",
    "http://localhost:3000/work/",
    "http://localhost:3000/work/heygluco/",
    "http://localhost:3000/work/bagel-bar/",
    "http://localhost:3000/work/tanti-maria/",
    "http://localhost:3000/work/munchies-and-cream/",
    "http://localhost:3000/work/mvp/",
    "http://localhost:3000/work/yum-yum/",
    "http://localhost:3000/work/merci/",
    "http://localhost:3000/work/lpi/",
    "http://localhost:3000/404/",
    "http://localhost:3000/401/",
  ];
  console.log("\nHTTP CHECKS");
  for (const u of checks) {
    try {
      const code = await get(u);
      console.log(code, u);
    } catch (e) {
      console.log("ERR", u, e.message);
    }
  }

  const assetCount = (function count(dir) {
    let n = 0;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) n += count(p);
      else n++;
    }
    return n;
  })(path.join(ROOT, "assets"));
  console.log("\nTotal asset files:", assetCount);
})();
