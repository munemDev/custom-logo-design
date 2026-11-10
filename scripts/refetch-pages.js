const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ORIGIN = "https://two26.studio";
const ROOT = path.join(__dirname, "..", "site");

const PAGES = [
  "/",
  "/work",
  "/about",
  "/work/heygluco",
  "/work/bagel-bar",
  "/work/tanti-maria",
  "/work/munchies-and-cream",
  "/work/mvp",
  "/work/yum-yum",
  "/work/merci",
  "/work/lpi",
];

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
        },
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirects < 8
        ) {
          res.resume();
          return resolve(
            fetchBuffer(new URL(res.headers.location, url).href, redirects + 1)
          );
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

function assetLocal(assetUrl) {
  const clean = assetUrl.split("#")[0].split("?")[0];
  const u = new URL(clean);
  const host = u.host.replace(/\./g, "_");
  const pathname = decodeURIComponent(u.pathname).replace(/^\/+/, "");
  const rel = path.join("assets", host, pathname);
  return { abs: path.join(ROOT, rel), web: "/" + rel.replace(/\\/g, "/") };
}

function pageLocal(pathname) {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/") return path.join(ROOT, "index.html");
  return path.join(ROOT, p.slice(1), "index.html");
}

function splitCandidates(raw, attrName) {
  if (!raw) return [];
  const name = attrName.toLowerCase();
  if (name.includes("data-video-urls")) {
    // comma-separated full URLs; filenames may contain spaces
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (name.includes("srcset")) {
    return raw
      .split(",")
      .map((s) => s.trim().split(/\s+/)[0])
      .filter(Boolean);
  }
  // normal src/href — keep full value (may include spaces in filename)
  return [raw.trim()];
}

function collectAssetUrls(html, base) {
  const assets = new Set();
  const attrRe =
    /(?:href|src|poster|data-src|data-poster|srcset|data-video-urls)=["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html))) {
    for (const piece of splitCandidates(m[1], m[0])) {
      if (
        !piece ||
        piece.startsWith("data:") ||
        piece.startsWith("mailto:") ||
        piece.startsWith("#") ||
        piece.startsWith("javascript:") ||
        piece.startsWith("http://localhost")
      ) {
        continue;
      }
      try {
        // encode spaces for URL parsing, but keep original path decode for filesystem
        const encoded = piece.replace(/ /g, "%20");
        const abs = new URL(encoded, base).href;
        if (
          /cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net|uploads-ssl\.webflow/.test(
            abs
          )
        ) {
          const u = new URL(abs);
          if (u.pathname && u.pathname !== "/") assets.add(abs.split("#")[0]);
        }
      } catch {}
    }
  }
  const cdnRe =
    /https:\/\/(?:cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net)\/[^"'\\\s<>),]+/gi;
  while ((m = cdnRe.exec(html))) {
    assets.add(m[0].replace(/\\u0026/g, "&").split("#")[0]);
  }
  return [...assets];
}

async function ensureAsset(url) {
  try {
    if (!url || url.includes(",") || url.includes("\\")) return null;
    const u = new URL(url.split("?")[0]);
    if (!u.pathname || u.pathname === "/") return null;
    // skip malformed truncated urls
    const decoded = decodeURIComponent(u.pathname);
    if (/%20\($/.test(u.pathname) || /\($/.test(decoded)) {
      return null;
    }
  } catch {
    return null;
  }
  const { abs, web } = assetLocal(url);
  if (fs.existsSync(abs) && fs.statSync(abs).size > 0) return web;
  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const buf = await fetchBuffer(url);
    fs.writeFileSync(abs, buf);
    console.log("  +", web, buf.length);
    return web;
  } catch (e) {
    console.warn("  fail", url, e.message);
    return null;
  }
}

function rewriteHtml(html) {
  let out = html;
  out = out.replace(/\s+integrity="[^"]*"/g, "");
  out = out.replace(
    /<link[^>]+href="https:\/\/cdn\.prod\.website-files\.com"[^>]*>/g,
    ""
  );
  out = out.split("https://two26.studio/").join("/");
  out = out.split("https://two26.studio").join("/");
  out = out.split("/./assets/").join("/assets/");
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/([^"'>\s]+(?: [^"'>\s]+)*)/g,
    (_m, p) => "/assets/cdn_prod_website-files_com/" + decodeURIComponent(p)
  );
  out = out.replace(
    /https:\/\/d3e54v103j8qbb\.cloudfront\.net\/([^"'>\s]+)/g,
    (_m, p) =>
      "/assets/d3e54v103j8qbb_cloudfront_net/" + decodeURIComponent(p)
  );
  out = out.replace(
    /https:\/\/cdn\.jsdelivr\.net\/([^"'>\s]+)/g,
    (_m, p) => "/assets/cdn_jsdelivr_net/" + decodeURIComponent(p)
  );
  out = out
    .split("https://cdn.prod.website-files.com%2F")
    .join("/assets/cdn_prod_website-files_com/");
  return out;
}

function extractHeadings(html) {
  const out = [];
  const re = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = m[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push(`${m[1]}: ${text}`);
  }
  return out;
}

(async () => {
  const report = {};
  for (const p of PAGES) {
    const url = ORIGIN + (p === "/" ? "/" : p);
    console.log("PAGE", url);
    const buf = await fetchBuffer(url);
    const html = buf.toString("utf8");
    const assets = collectAssetUrls(html, url);
    for (const a of assets) await ensureAsset(a);

    // known full-res case study headers that may be truncated in attrs
    const extras = [
      "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1).webp",
      "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1).jpg",
    ];
    if (p.includes("heygluco") || p === "/work") {
      for (const e of extras) await ensureAsset(e);
    }

    const out = rewriteHtml(html);
    const outPath = pageLocal(p);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, out);
    const headings = extractHeadings(html);
    report[p] = { bytes: out.length, headings, assetCandidates: assets.length };
    console.log(
      "  wrote",
      outPath,
      "headings=",
      headings.length,
      "assets=",
      assets.length
    );
  }
  fs.writeFileSync(
    path.join(__dirname, "..", "page-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("DONE");
})();
