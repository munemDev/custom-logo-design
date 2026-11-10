const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..", "site");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.(html|css|js)$/i.test(ent.name)) files.push(p);
  }
  return files;
}

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "*/*",
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 8) {
          res.resume();
          return resolve(fetchBuffer(new URL(res.headers.location, url).href, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} ${url}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("error", reject);
  });
}

function assetPaths(assetUrl) {
  const u = new URL(assetUrl);
  const host = u.host.replace(/\./g, "_");
  const pathname = decodeURIComponent(u.pathname).replace(/^\/+/, "");
  const rel = path.join("assets", host, pathname);
  return { abs: path.join(ROOT, rel), web: "/" + rel.replace(/\\/g, "/") };
}

async function ensureAsset(url) {
  const clean = url.split("#")[0].split("?")[0];
  if (!/^https?:\/\//i.test(clean)) return null;
  if (!/website-files\.com|cloudfront\.net|jsdelivr\.net|uploads-ssl\.webflow/.test(clean)) return null;
  // skip bare host
  const u = new URL(clean);
  if (u.pathname === "/" || u.pathname === "") return null;
  const { abs, web } = assetPaths(clean);
  if (!fs.existsSync(abs) || fs.statSync(abs).size === 0) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    try {
      const buf = await fetchBuffer(clean);
      fs.writeFileSync(abs, buf);
      console.log("downloaded", web, buf.length);
    } catch (e) {
      console.warn("fail", clean, e.message);
      return null;
    }
  }
  return { from: clean, to: web, url };
}

(async () => {
  const files = walk(ROOT);
  const urlRe =
    /https:\/(?:\/)?(?:cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net|uploads-ssl\.webflow\.com)[^"'\\\s<>)]*/gi;

  for (const file of files) {
    let text = fs.readFileSync(file, "utf8");
    // fix broken https:/cdn (single slash)
    text = text.replace(/https:\/(?!\/)(cdn\.prod\.website-files\.com)/gi, "https://$1");

    const matches = [...text.matchAll(urlRe)].map((m) => m[0]);
    const unique = [...new Set(matches)];
    const map = new Map();
    for (const raw of unique) {
      const fixed = raw.replace(/^https:\/(?!\/)/, "https://");
      const ensured = await ensureAsset(fixed);
      if (ensured) {
        map.set(raw, ensured.to);
        map.set(fixed, ensured.to);
        map.set(fixed.split("?")[0], ensured.to);
      }
    }
    // also map common encoded variants
    let out = text;
    const keys = [...map.keys()].sort((a, b) => b.length - a.length);
    for (const k of keys) out = out.split(k).join(map.get(k));

    // remove SRI that can break offline if any byte differs
    out = out.replace(/\s+integrity="[^"]*"/g, "");
    // drop preconnect to remote CDN
    out = out.replace(/<link[^>]+href="https:\/\/cdn\.prod\.website-files\.com"[^>]*>/g, "");
    // fix absolute site links still pointing to two26
    out = out.replace(/https:\/\/two26\.studio\//g, "/");
    out = out.replace(/https:\/\/two26\.studio/g, "/");

    if (out !== text) {
      fs.writeFileSync(file, out);
      console.log("fixed", path.relative(ROOT, file));
    }
  }
  console.log("done");
})();
