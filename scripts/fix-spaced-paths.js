const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");
const ASSETS = path.join(ROOT, "assets");

function walk(dir, files = [], filter) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files, filter);
    else if (!filter || filter(p)) files.push(p);
  }
  return files;
}

// Build index of asset basenames / prefixes -> web path
const assetFiles = walk(ASSETS);
const byPrefix = new Map();
for (const abs of assetFiles) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
  const web = "/" + rel;
  const base = path.basename(abs);
  // index full basename
  byPrefix.set(base.toLowerCase(), web);
  // index without extension
  byPrefix.set(base.replace(/\.[^.]+$/, "").toLowerCase(), web);
  // index truncated prefixes for common broken refs (before space)
  const beforeSpace = base.split(" ")[0];
  if (beforeSpace !== base) {
    const key = beforeSpace.toLowerCase();
    if (!byPrefix.has(key)) byPrefix.set(key, web);
    // also id_prefix like 6ab26349..._Shot
    const m = base.match(/^([a-f0-9]+_[^ ]+)/i);
    if (m && !byPrefix.has(m[1].toLowerCase())) byPrefix.set(m[1].toLowerCase(), web);
  }
}

function resolveBroken(webPath) {
  if (!webPath.startsWith("/assets/")) return null;
  const abs = path.join(ROOT, webPath.replace(/^\//, "").replace(/\//g, path.sep));
  if (fs.existsSync(abs)) return webPath;

  const base = path.basename(webPath);
  const decoded = decodeURIComponent(base);
  const candidates = [
    decoded,
    decoded.replace(/\.[^.]+$/, ""),
    decoded.split(" ")[0],
  ];
  for (const c of candidates) {
    const hit = byPrefix.get(c.toLowerCase());
    if (hit && fs.existsSync(path.join(ROOT, hit.slice(1).replace(/\//g, path.sep)))) {
      return hit;
    }
  }

  // fuzzy: find file whose basename starts with this truncated name
  const needle = decoded.toLowerCase();
  for (const abs of assetFiles) {
    const b = path.basename(abs).toLowerCase();
    if (b.startsWith(needle) || needle.startsWith(b.split(" ")[0])) {
      if (needle.length >= 10 && b.startsWith(needle)) {
        return "/" + path.relative(ROOT, abs).replace(/\\/g, "/");
      }
    }
  }
  return null;
}

const htmlFiles = walk(ROOT, [], (p) => p.endsWith(".html") && !p.includes(`${path.sep}assets${path.sep}`));

let fixes = 0;
for (const file of htmlFiles) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  // Fix srcset entries and normal attrs pointing at /assets/... truncated names
  html = html.replace(
    /(\/assets\/cdn_prod_website-files_com\/[a-z0-9]+\/)([a-z0-9]+_[^"'>\s,]+)/gi,
    (full, prefix, name) => {
      // if already has extension and file exists, keep
      const trial = prefix + name;
      const abs = path.join(ROOT, trial.slice(1).replace(/\//g, path.sep));
      if (fs.existsSync(abs)) return full;

      // try resolve
      const resolved = resolveBroken(trial);
      if (resolved) {
        fixes++;
        return resolved;
      }
      return full;
    }
  );

  // Also expand known truncated patterns by scanning all /assets refs without valid files
  html = html.replace(/\/assets\/[^"'>\s]+/g, (web) => {
    const clean = web.split(",")[0];
    const abs = path.join(ROOT, clean.replace(/^\//, "").replace(/\//g, path.sep));
    if (fs.existsSync(abs)) return web;
    const resolved = resolveBroken(clean);
    if (resolved) {
      fixes++;
      return resolved;
    }
    return web;
  });

  if (html !== before) {
    fs.writeFileSync(file, html);
    console.log("fixed", path.relative(ROOT, file));
  }
}

// recount missing
let missing = 0;
const missList = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const refs = html.match(/\/assets\/[^"'>\s]+/g) || [];
  for (const web of refs) {
    const abs = path.join(ROOT, web.replace(/^\//, "").replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) {
      missing++;
      missList.push(web);
    }
  }
}

console.log(
  JSON.stringify(
    {
      fixes,
      missing,
      uniqueMissing: [...new Set(missList)].slice(0, 40),
    },
    null,
    2
  )
);
