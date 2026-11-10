const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");
const ASSETS = path.join(ROOT, "assets");

function walk(dir, files = [], pred) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files, pred);
    else if (!pred || pred(p)) files.push(p);
  }
  return files;
}

const assetFiles = walk(ASSETS);
// map: directory -> list of basenames
const byDir = new Map();
for (const abs of assetFiles) {
  const dir = path.dirname(abs);
  if (!byDir.has(dir)) byDir.set(dir, []);
  byDir.get(dir).push(path.basename(abs));
}

function resolveTruncated(webPath) {
  // webPath like /assets/host/id/truncatedName
  const absTry = path.join(
    ROOT,
    webPath.replace(/^\//, "").replace(/\//g, path.sep)
  );
  if (fs.existsSync(absTry)) return webPath;

  const dir = path.dirname(absTry);
  const base = path.basename(webPath);
  const list = byDir.get(dir) || [];
  // prefer exact startsWith match, longest basename
  const matches = list
    .filter((b) => b === base || b.startsWith(base))
    .sort((a, b) => b.length - a.length);
  if (matches.length) {
    const resolved =
      "/" +
      path
        .relative(ROOT, path.join(dir, matches[0]))
        .split(path.sep)
        .join("/");
    return resolved;
  }
  return null;
}

const htmlFiles = walk(
  ROOT,
  [],
  (p) => p.endsWith(".html") && !p.includes(`${path.sep}assets${path.sep}`)
);

let totalFixes = 0;
for (const file of htmlFiles) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  // Fix jquery querystring path
  html = html.replace(
    /\/assets\/d3e54v103j8qbb_cloudfront_net\/js\/jquery-3\.5\.1\.min\.dc5e7f18c8\.js\?site=[^"']+/g,
    "/assets/d3e54v103j8qbb_cloudfront_net/js/jquery-3.5.1.min.dc5e7f18c8.js"
  );

  // Inside quotes, find /assets/... tokens that may be truncated before a space
  // Strategy: for each /assets/cdn.../id/filename without extension or missing file,
  // resolve against disk.
  html = html.replace(/\/assets\/[a-z0-9_./%-]+/gi, (web) => {
    // ignore if looks like already has common image/video/font ext and exists
    const abs = path.join(
      ROOT,
      web.replace(/^\//, "").replace(/\//g, path.sep)
    );
    if (fs.existsSync(abs)) return web;
    const resolved = resolveTruncated(web);
    if (resolved && resolved !== web) {
      totalFixes++;
      return resolved;
    }
    return web;
  });

  // Also fix srcset entries where local path has spaces: ensure we didn't split them.
  // Rewrite patterns like: ..._Shot 2-p-500.jpg — if left as ..._Shot + " 2-p-500.jpg"
  // Look for: /assets/.../ID_Shot" followed later — already handled if truncated token replaced.

  // Fix srcset: "LOCALPATH 500w" where LOCALPATH contains spaces — files should exist.
  // Nothing to do if paths are correct.

  if (html !== before) {
    fs.writeFileSync(file, html);
    console.log("updated", path.relative(ROOT, file));
  }
}

// verify remaining missing with space-aware extractor
function extract(html) {
  const urls = new Set();
  let m;
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html))) {
    // parse srcset properly: url can have spaces if encoded, but ours decoded.
    // Use: split on ", " then take from start until last size descriptor
    for (const part of m[1].split(",")) {
      const trimmed = part.trim();
      // descriptor is last token if it matches \d+w or [\d.]+x
      const tokens = trimmed.split(/\s+/);
      let url;
      if (tokens.length >= 2 && /^\d+w$/.test(tokens[tokens.length - 1])) {
        url = tokens.slice(0, -1).join(" ");
      } else if (tokens.length >= 2 && /^[\d.]+x$/.test(tokens[tokens.length - 1])) {
        url = tokens.slice(0, -1).join(" ");
      } else {
        url = trimmed;
      }
      if (url.startsWith("/assets/")) urls.add(url);
    }
  }
  const vRe = /data-video-urls=["']([^"']+)["']/gi;
  while ((m = vRe.exec(html))) {
    for (const part of m[1].split(",")) {
      const u = part.trim();
      if (u.startsWith("/assets/")) urls.add(u);
    }
  }
  const aRe =
    /\b(?:src|href|poster|data-src|data-poster)=["'](\/assets\/[^"']+)["']/gi;
  while ((m = aRe.exec(html))) urls.add(m[1].split("?")[0]);
  return urls;
}

const still = new Set();
const pageHeadings = {};
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  pageHeadings[path.relative(ROOT, file).replace(/\\/g, "/")] = [
    ...html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi),
  ]
    .map((m) =>
      m[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
  for (const u of extract(html)) {
    const abs = path.join(ROOT, u.replace(/^\//, "").replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) still.add(u);
  }
}

console.log(
  JSON.stringify(
    {
      totalFixes,
      stillMissing: [...still],
      headings: Object.fromEntries(
        Object.entries(pageHeadings).map(([k, v]) => [k, v])
      ),
    },
    null,
    2
  )
);
