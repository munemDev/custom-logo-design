const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
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
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "*/*",
        },
        timeout: 90000,
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
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) })
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function localFor(assetUrl) {
  const u = new URL(assetUrl);
  const host = u.host.replace(/\./g, "_");
  const pathname = decodeURIComponent(u.pathname).replace(/^\/+/, "");
  return {
    abs: path.join(ROOT, "assets", host, pathname),
    web: "/assets/" + host + "/" + pathname.split("\\").join("/"),
  };
}

function collectAssets(html) {
  const set = new Set();
  const add = (raw) => {
    if (!raw) return;
    let s = String(raw).trim();
    if (!s || s.startsWith("data:") || s.startsWith("mailto:")) return;
    const parts = s.includes(",")
      ? s.split(",").map((p) => p.trim().split(/\s+/)[0])
      : [s];
    for (let p of parts) {
      try {
        p = p.replace(/^https:\/(?!\/)/, "https://");
        const abs = new URL(p, ORIGIN).href.split("?")[0].split("#")[0];
        if (/website-files\.com|cloudfront\.net|jsdelivr\.net/.test(abs)) {
          if (new URL(abs).pathname.length > 1) set.add(abs);
        }
      } catch {}
    }
  };

  let m;
  const attr =
    /(?:href|src|poster|srcset|data-src|data-srcset|data-poster|data-video-urls)=["']([^"']+)["']/gi;
  while ((m = attr.exec(html))) add(m[1]);
  const url = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = url.exec(html))) add(m[1]);
  const bare =
    /https:\/\/(?:cdn\.prod\.website-files\.com|assets-global\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net)[^"'\\\s<>]+/gi;
  while ((m = bare.exec(html))) {
    let u = m[0].replace(/\\u0026/g, "&").replace(/&quot;?$/g, "");
    // keep parentheses in filenames
    u = u.replace(/[.,;]+$/g, "");
    add(u);
  }
  return [...set];
}

async function ensure(url) {
  const { abs, web } = localFor(url);
  if (fs.existsSync(abs) && fs.statSync(abs).size > 0) return { web, skipped: true };
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const { status, buffer } = await fetchBuffer(url);
  if (status !== 200) throw new Error("HTTP " + status);
  fs.writeFileSync(abs, buffer);
  return { web, skipped: false, size: buffer.length };
}

(async () => {
  let downloaded = 0;
  let failed = 0;
  const replaceMap = new Map();

  for (const page of PAGES) {
    const url = ORIGIN + (page === "/" ? "/" : page);
    process.stdout.write(`\nSCAN ${url}\n`);
    const { status, buffer } = await fetchBuffer(url);
    if (status !== 200) {
      console.warn("skip", status);
      continue;
    }
    const html = buffer.toString("utf8");
    const assets = collectAssets(html);
    console.log("  assets found", assets.length);
    for (const a of assets) {
      try {
        const res = await ensure(a);
        replaceMap.set(a, res.web);
        replaceMap.set(decodeURI(a), res.web);
        if (!res.skipped) {
          downloaded++;
          console.log("  +", res.web, res.size);
        }
      } catch (e) {
        failed++;
        console.warn("  !", a, e.message);
      }
    }
  }

  // rewrite local HTML with any new mappings + force rewrite from live-collected urls
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

  const keys = [...replaceMap.keys()].sort((a, b) => b.length - a.length);
  for (const file of walk(ROOT)) {
    let html = fs.readFileSync(file, "utf8");
    const before = html;
    for (const k of keys) html = html.split(k).join(replaceMap.get(k));
    html = html.replace(
      /https:\/\/cdn\.prod\.website-files\.com\/([^"'>\s]+(?: [^"'>\s]*)*)/g,
      (_m, p) =>
        "/assets/cdn_prod_website-files_com/" + decodeURIComponent(p)
    );
    html = html.split("/./assets/").join("/assets/");
    html = html.replace(/https:\/\/two26\.studio\//g, "/");
    if (html !== before) {
      fs.writeFileSync(file, html);
      console.log("patched", path.relative(ROOT, file));
    }
  }

  console.log("\nDONE downloaded", downloaded, "failed", failed);
})();
