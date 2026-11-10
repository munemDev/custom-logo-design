const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..", "site");
const ORIGIN = "https://two26.studio";
const SEED = [
  "/",
  "/work",
  "/about",
  "/work/heygluco",
  "/work/bagel-bar",
  "/work/tanti-maria",
  "/work/munchies-and-cream",
  "/work/mvp",
  "/work/yum-yum",
];

const visitedPages = new Set();
const downloadedAssets = new Set();
const queue = [...SEED];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

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
          const next = new URL(res.headers.location, url).href;
          res.resume();
          return resolve(fetchBuffer(next, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: res.headers["content-type"] || "",
            finalUrl: url,
          })
        );
      }
    );
    req.on("error", reject);
  });
}

function pageLocalPath(pathname) {
  let p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/") return path.join(ROOT, "index.html");
  return path.join(ROOT, p.slice(1), "index.html");
}

function assetLocalPath(assetUrl) {
  const u = new URL(assetUrl);
  // Keep host folder so CDN paths stay unique
  const host = u.host.replace(/\./g, "_");
  let pathname = decodeURIComponent(u.pathname);
  // strip query for filename
  const localRel = path.join("assets", host, pathname.replace(/^\/+/, ""));
  return {
    abs: path.join(ROOT, localRel),
    web: "/" + localRel.replace(/\\/g, "/"),
  };
}

function collectUrls(html, base) {
  const found = { pages: new Set(), assets: new Set() };
  const patterns = [
    /(?:href|src|poster)=["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    /(?:data-src|data-poster|srcset)=["']([^"']+)["']/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html))) {
      let raw = m[1].trim();
      if (!raw || raw.startsWith("data:") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:") || raw === "#")
        continue;
      // srcset can be "url 1x, url 2x"
      const parts = raw.includes(",") && m[0].toLowerCase().includes("srcset")
        ? raw.split(",").map((s) => s.trim().split(/\s+/)[0])
        : [raw.split(/\s+/)[0]];
      for (let part of parts) {
        try {
          const abs = new URL(part, base).href;
          if (abs.includes("two26.studio") && !abs.includes("cdn.")) {
            const u = new URL(abs);
            if (u.origin === ORIGIN) {
              let p = u.pathname.replace(/\/+$/, "") || "/";
              if (!p.includes(".") || p.endsWith(".html")) found.pages.add(p === "" ? "/" : p);
            }
          } else if (
            abs.includes("cdn.prod.website-files.com") ||
            abs.includes("d3e54v103j8qbb.cloudfront.net") ||
            abs.includes("cdn.jsdelivr.net") ||
            abs.includes("uploads-ssl.webflow.com")
          ) {
            found.assets.add(abs.split("#")[0]);
          }
        } catch {}
      }
    }
  }
  // also catch bare CDN urls in JSON/lottie/script
  const cdnRe =
    /https:\/\/(?:cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net)[^"'\\\s<>)]+/gi;
  let cm;
  while ((cm = cdnRe.exec(html))) {
    found.assets.add(cm[0].replace(/\\u0026/g, "&").split("#")[0]);
  }
  return found;
}

async function downloadAsset(url) {
  const clean = url.split("?")[0];
  const key = clean;
  if (downloadedAssets.has(key)) return assetLocalPath(clean).web;
  downloadedAssets.add(key);
  const { abs, web } = assetLocalPath(clean);
  if (fs.existsSync(abs) && fs.statSync(abs).size > 0) return web;
  ensureDir(path.dirname(abs));
  try {
    const { buffer } = await fetchBuffer(url);
    fs.writeFileSync(abs, buffer);
    process.stdout.write(`  asset ${web} (${buffer.length})\n`);
    // if css, scrape nested assets
    if (abs.endsWith(".css") || url.includes(".css")) {
      const text = buffer.toString("utf8");
      const nested = collectUrls(text, url);
      for (const a of nested.assets) {
        try {
          await downloadAsset(a);
        } catch (e) {
          console.warn("  nested fail", a, e.message);
        }
      }
      // rewrite css urls to local
      let rewritten = text;
      for (const a of nested.assets) {
        const local = assetLocalPath(a.split("?")[0]).web;
        rewritten = rewritten.split(a).join(local);
        const noQuery = a.split("?")[0];
        if (noQuery !== a) rewritten = rewritten.split(noQuery).join(local);
      }
      fs.writeFileSync(abs, rewritten);
    }
    return web;
  } catch (e) {
    console.warn("  FAIL asset", url, e.message);
    downloadedAssets.delete(key);
    return url;
  }
}

function rewriteHtml(html, pageUrl) {
  let out = html;
  // Collect replacements carefully - longest first
  const replacements = [];
  const urls = collectUrls(html, pageUrl);
  for (const a of urls.assets) {
    const local = assetLocalPath(a.split("?")[0]).web;
    replacements.push([a, local]);
    replacements.push([a.split("?")[0], local]);
  }
  // page links
  for (const p of urls.pages) {
    const target = p === "/" ? "/" : p.endsWith("/") ? p : p + "/";
    replacements.push([ORIGIN + p, target]);
    replacements.push([ORIGIN + p + "/", target]);
  }
  replacements.sort((a, b) => b[0].length - a[0].length);
  const seen = new Set();
  for (const [from, to] of replacements) {
    if (seen.has(from)) continue;
    seen.add(from);
    if (!from) continue;
    out = out.split(from).join(to);
  }
  // absolute root links stay fine
  return out;
}

async function downloadPage(pathname) {
  const key = pathname.replace(/\/+$/, "") || "/";
  if (visitedPages.has(key)) return;
  visitedPages.add(key);
  const url = ORIGIN + (key === "/" ? "/" : key);
  process.stdout.write(`PAGE ${url}\n`);
  const { buffer } = await fetchBuffer(url);
  let html = buffer.toString("utf8");
  const found = collectUrls(html, url);
  for (const p of found.pages) {
    if (!visitedPages.has(p.replace(/\/+$/, "") || "/")) queue.push(p);
  }
  for (const a of [...found.assets]) {
    try {
      await downloadAsset(a);
    } catch (e) {
      console.warn("asset err", a, e.message);
    }
  }
  html = rewriteHtml(html, url);
  const outPath = pageLocalPath(key);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, html);
  process.stdout.write(`  wrote ${outPath}\n`);
}

(async () => {
  ensureDir(ROOT);
  while (queue.length) {
    const next = queue.shift();
    try {
      await downloadPage(next);
    } catch (e) {
      console.warn("page fail", next, e.message);
    }
  }
  console.log(
    JSON.stringify(
      { pages: [...visitedPages], assets: downloadedAssets.size },
      null,
      2
    )
  );
})();
