const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "assets") continue;
      walk(p, files);
    } else if (/\.(html|css|js)$/i.test(ent.name)) files.push(p);
  }
  return files;
}

function pagePath(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel === "index.html") return "/";
  return "/" + rel.replace(/\/index\.html$/, "/");
}

const EXTERNAL_RE =
  /(?:href|src|action|poster|data-src|data-video-urls|content)=["'](https?:\/\/[^"']+)["']/gi;
const BARE_URL_RE = /https?:\/\/[^\s"'<>)\\]+/gi;

const ALLOW_HOST_SNIPPETS = [
  // local / relative only — nothing remote should remain for assets
];

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function classify(url) {
  const h = hostOf(url) || "";
  if (/two26\.studio$/i.test(h) || h.includes("two26.studio")) return "two26-site";
  if (/website-files\.com|uploads-ssl\.webflow|cloudfront\.net|jsdelivr\.net/i.test(h))
    return "cdn-asset";
  if (/webflow\.com/i.test(h)) return "webflow";
  if (/instagram\.com|linkedin\.com|behance\.net|facebook\.com|twitter\.com|x\.com|youtube\.com|vimeo\.com/i.test(h))
    return "social";
  if (/mailto:/i.test(url)) return "mailto";
  if (/fonts\.google|typekit|fonts\.gstatic/i.test(h)) return "fonts";
  if (/google-analytics|googletagmanager|facebook\.net|hotjar|segment|mixpanel/i.test(h))
    return "tracking";
  return "other-external";
}

const byPage = {};
const byClass = {};
const unique = new Map(); // url -> {class, pages:Set}

for (const file of walk(ROOT)) {
  if (!file.endsWith(".html")) continue;
  const route = pagePath(file);
  const html = fs.readFileSync(file, "utf8");
  const found = new Set();

  let m;
  while ((m = EXTERNAL_RE.exec(html))) found.add(m[1].split("#")[0]);
  // also catch bare urls in scripts/json rarely
  while ((m = BARE_URL_RE.exec(html))) {
    const u = m[0].replace(/[.,;)\]]+$/, "");
    if (/^https?:\/\//i.test(u)) found.add(u.split("#")[0]);
  }

  const list = [];
  for (const url of found) {
    // skip data and relative that somehow matched
    if (!/^https?:\/\//i.test(url)) continue;
    // skip our localhost
    if (/localhost|127\.0\.0\.1/i.test(url)) continue;
    const cls = classify(url);
    list.push({ url, cls });
    if (!unique.has(url)) unique.set(url, { cls, pages: new Set() });
    unique.get(url).pages.add(route);
    byClass[cls] = (byClass[cls] || 0) + 1;
  }
  byPage[route] = list;
}

// Also scan CSS for remote urls
const cssFiles = walk(ROOT).filter((f) => f.endsWith(".css"));
const cssExternal = [];
for (const file of cssFiles) {
  const css = fs.readFileSync(file, "utf8");
  let m;
  while ((m = BARE_URL_RE.exec(css))) {
    const u = m[0].replace(/[.,;)\]]+$/, "");
    if (/^https?:\/\//i.test(u) && !/localhost/i.test(u)) {
      cssExternal.push({ file: path.relative(ROOT, file), url: u, cls: classify(u) });
    }
  }
}

const report = {
  summary: {
    uniqueExternalUrls: unique.size,
    byClass: Object.fromEntries(
      Object.entries(
        [...unique.values()].reduce((acc, v) => {
          acc[v.cls] = (acc[v.cls] || 0) + 1;
          return acc;
        }, {})
      )
    ),
    cssExternalCount: cssExternal.length,
  },
  unique: [...unique.entries()]
    .map(([url, v]) => ({
      url,
      cls: v.cls,
      pages: [...v.pages].sort(),
    }))
    .sort((a, b) => a.cls.localeCompare(b.cls) || a.url.localeCompare(b.url)),
  byPage,
  cssExternal: cssExternal.slice(0, 50),
};

fs.writeFileSync(
  path.join(__dirname, "..", "external-links-report.json"),
  JSON.stringify(report, null, 2)
);

console.log("=== EXTERNAL LINKS AUDIT ===\n");
console.log("Unique external URLs:", report.summary.uniqueExternalUrls);
console.log("By class:", report.summary.byClass);
console.log("CSS remote urls:", report.summary.cssExternalCount);
console.log("\n--- All unique external links ---\n");
for (const item of report.unique) {
  console.log(`[${item.cls}] ${item.url}`);
  console.log(`  pages: ${item.pages.join(", ")}`);
}
