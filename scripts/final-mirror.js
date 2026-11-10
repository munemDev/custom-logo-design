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

const EXTRA_ASSETS = [
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1).png",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1)-p-500.png",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1)-p-800.png",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1)-p-1080.png",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1)-p-1600.png",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1)-p-2000.png",
  "https://cdn.prod.website-files.com/6a7d9d7d7c99784ba2cac874/6a7db9b17a581584f4171aad_Hero_poster.0000000.jpg",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f52049/6ab26381b5a759b6db4cec12_Shot%201_poster.0000000.jpg",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f52049/6ab263f29cc7204d5832b66d_Shot%203_poster.0000000.jpg",
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
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("error", reject);
  });
}

function toLocal(assetUrl) {
  const u = new URL(assetUrl.split("#")[0].split("?")[0]);
  const host = u.host.replace(/\./g, "_");
  const pathname = decodeURIComponent(u.pathname).replace(/^\/+/, "");
  const rel = path.join("assets", host, pathname);
  return {
    abs: path.join(ROOT, rel),
    web: "/" + rel.split(path.sep).join("/"),
  };
}

function pagePath(p) {
  const key = p.replace(/\/+$/, "") || "/";
  if (key === "/") return path.join(ROOT, "index.html");
  return path.join(ROOT, key.slice(1), "index.html");
}

async function ensureAsset(url) {
  try {
    if (!url || url.includes(",") || /&quot;|\\/.test(url)) return;
    const u = new URL(url);
    if (!u.pathname || u.pathname === "/") return;
    const { abs, web } = toLocal(url);
    if (fs.existsSync(abs) && fs.statSync(abs).size > 0) return web;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const buf = await fetchBuffer(url);
    fs.writeFileSync(abs, buf);
    console.log("  +", web, buf.length);
    return web;
  } catch (e) {
    console.warn("  fail", url.slice(0, 120), e.message);
  }
}

function collectUrls(html, base) {
  const assets = new Set();

  // attribute values — allow spaces inside quotes
  const attrRe =
    /\b(href|src|poster|data-src|data-poster|srcset|data-video-urls)=["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html))) {
    const name = m[1].toLowerCase();
    const raw = m[2];
    let parts = [];
    if (name === "data-video-urls") {
      parts = raw.split(",").map((s) => s.trim());
    } else if (name === "srcset") {
      parts = raw.split(",").map((s) => s.trim().split(/\s+/)[0]);
    } else {
      parts = [raw.trim()];
    }
    for (let piece of parts) {
      if (
        !piece ||
        piece.startsWith("data:") ||
        piece.startsWith("mailto:") ||
        piece.startsWith("#") ||
        piece.startsWith("javascript:")
      )
        continue;
      try {
        const abs = new URL(piece.replace(/ /g, "%20"), base).href;
        if (
          /cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net/.test(
            abs
          )
        ) {
          assets.add(abs.split("#")[0]);
        }
      } catch {}
    }
  }

  // css url() and bare urls — stop at quote/space/comma/paren
  const bareRe =
    /https:\/\/(?:cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net)\/[^\s"'<>),]+/gi;
  while ((m = bareRe.exec(html))) {
    let u = m[0].replace(/&quot;.*$/, "").replace(/\\u0026/g, "&");
    if (!u.includes(",") && !u.endsWith("&quot")) assets.add(u.split("#")[0]);
  }

  return [...assets];
}

function rewrite(html) {
  let out = html;
  out = out.replace(/\s+integrity="[^"]*"/g, "");
  out = out.replace(
    /<link[^>]+href="https:\/\/cdn\.prod\.website-files\.com"[^>]*>/g,
    ""
  );
  out = out.split("https://two26.studio/").join("/");
  out = out.split("https://two26.studio").join("/");

  // Replace CDN urls longest-first using collected absolute urls from original
  // Match encoded and space-containing filenames inside quotes carefully
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/([^"']+?)(?=["'])/g,
    (_m, p) => "/assets/cdn_prod_website-files_com/" + decodeURIComponent(p)
  );
  out = out.replace(
    /https:\/\/d3e54v103j8qbb\.cloudfront\.net\/([^"']+?)(?=["'])/g,
    (_m, p) =>
      "/assets/d3e54v103j8qbb_cloudfront_net/" + decodeURIComponent(p)
  );
  out = out.replace(
    /https:\/\/cdn\.jsdelivr\.net\/([^"']+?)(?=["'])/g,
    (_m, p) => "/assets/cdn_jsdelivr_net/" + decodeURIComponent(p)
  );

  // url() in inline styles / css embeds without quotes
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/([^\s"')]+)/g,
    (_m, p) => "/assets/cdn_prod_website-files_com/" + decodeURIComponent(p)
  );
  out = out.replace(
    /https:\/\/d3e54v103j8qbb\.cloudfront\.net\/([^\s"')]+)/g,
    (_m, p) =>
      "/assets/d3e54v103j8qbb_cloudfront_net/" + decodeURIComponent(p)
  );
  out = out.replace(
    /https:\/\/cdn\.jsdelivr\.net\/([^\s"')]+)/g,
    (_m, p) => "/assets/cdn_jsdelivr_net/" + decodeURIComponent(p)
  );

  out = out
    .split("https://cdn.prod.website-files.com%2F")
    .join("/assets/cdn_prod_website-files_com/");
  out = out.split("/./assets/").join("/assets/");
  return out;
}

function headings(html) {
  const out = [];
  const re = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const t = m[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (t) out.push(t);
  }
  return out;
}

function checkMissing(html) {
  const missing = [];
  // match asset paths inside quotes so spaces are preserved
  const re = /["'](\/assets\/[^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) {
    const web = m[1].split(",")[0].trim();
    // for srcset, value may include "url 800w" — already handled by attr quotes; video lists are separate
    if (web.includes(" ")) {
      // could be srcset densites — skip if looks like descriptor only
    }
    const abs = path.join(ROOT, web.replace(/^\//, "").replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) missing.push(web);
  }
  // data-video-urls
  const vre = /data-video-urls=["']([^"']+)["']/g;
  while ((m = vre.exec(html))) {
    for (const part of m[1].split(",")) {
      const web = part.trim();
      if (!web.startsWith("/assets/")) continue;
      const abs = path.join(
        ROOT,
        web.replace(/^\//, "").replace(/\//g, path.sep)
      );
      if (!fs.existsSync(abs)) missing.push(web);
    }
  }
  return [...new Set(missing)];
}

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  for (const a of EXTRA_ASSETS) await ensureAsset(a);

  const report = {};
  for (const p of PAGES) {
    const url = ORIGIN + (p === "/" ? "/" : p);
    console.log("PAGE", url);
    const buf = await fetchBuffer(url);
    const html = buf.toString("utf8");
    const assets = collectUrls(html, url);
    for (const a of assets) await ensureAsset(a);
    const out = rewrite(html);
    const outPath = pagePath(p);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, out);
    const miss = checkMissing(out);
    report[p] = {
      headings: headings(html),
      assets: assets.length,
      missing: miss,
    };
    console.log(
      "  ok headings=",
      report[p].headings.length,
      "missing=",
      miss.length
    );
  }

  // rewrite css font urls if needed
  const cssFiles = [];
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (p.endsWith(".css")) cssFiles.push(p);
    }
  }
  walk(path.join(ROOT, "assets"));
  for (const css of cssFiles) {
    let text = fs.readFileSync(css, "utf8");
    const next = rewrite(text);
    if (next !== text) {
      fs.writeFileSync(css, next);
      console.log("css rewritten", path.relative(ROOT, css));
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "..", "final-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("DONE");
  for (const [k, v] of Object.entries(report)) {
    console.log(
      k,
      "->",
      v.headings.length,
      "sections/headings, missing",
      v.missing.length,
      v.missing.slice(0, 3)
    );
  }
})();
