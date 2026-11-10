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

const EXTRA = [
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1).png",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1)-p-500.png",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1)-p-800.png",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1)-p-1080.png",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1)-p-1600.png",
  "https://cdn.prod.website-files.com/6a7d9d7d7c99784ba2cac874/6a7db9b17a581584f4171aad_Hero_poster.0000000.jpg",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f52049/6ab26381b5a759b6db4cec12_Shot%201_poster.0000000.jpg",
  "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f52049/6ab263f29cc7204d5832b66d_Shot%203_poster.0000000.jpg",
];

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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
            return reject(new Error("HTTP " + res.statusCode));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      )
      .on("error", reject);
  });
}

/** Disk path uses decoded filename; HTML keeps %20 */
function pathsFor(assetUrl) {
  const clean = assetUrl.split("#")[0].split("?")[0];
  const u = new URL(clean);
  const host = u.host.replace(/\./g, "_");
  // pathname may be encoded; decode for filesystem
  const decodedPath = decodeURIComponent(u.pathname).replace(/^\/+/, "");
  // encoded path for HTML (keep encoding of special chars)
  const encodedPath = u.pathname.replace(/^\/+/, "");
  const abs = path.join(ROOT, "assets", host, ...decodedPath.split("/"));
  const web =
    "/assets/" +
    host +
    "/" +
    encodedPath
      .split("/")
      .map((seg) => {
        // ensure each segment is encoded (avoid double-encoding)
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join("/");
  return { abs, web, clean };
}

async function ensureAsset(url) {
  try {
    if (!url || url.includes(",") || /&quot/.test(url)) return null;
    const u = new URL(url.split("?")[0]);
    if (!u.pathname || u.pathname === "/") return null;
    const { abs, web } = pathsFor(url);
    if (!(fs.existsSync(abs) && fs.statSync(abs).size > 0)) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const buf = await fetchBuffer(url.split("?")[0]);
      fs.writeFileSync(abs, buf);
      console.log("  +", web, buf.length);
    }
    return web;
  } catch (e) {
    console.warn("  fail", String(url).slice(0, 140), e.message);
    return null;
  }
}

function collect(html, base) {
  const set = new Set();
  const re =
    /\b(href|src|poster|data-src|data-poster|srcset|data-video-urls)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const name = m[1].toLowerCase();
    const raw = m[2];
    let parts = [];
    if (name === "data-video-urls") parts = raw.split(",").map((s) => s.trim());
    else if (name === "srcset")
      parts = raw.split(",").map((s) => s.trim().split(/\s+/)[0]);
    else parts = [raw.trim()];
    for (const piece of parts) {
      if (
        !piece ||
        /^(data:|mailto:|tel:|#|javascript:)/i.test(piece)
      )
        continue;
      try {
        const abs = new URL(piece, base).href;
        if (
          /cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net/.test(
            abs
          )
        ) {
          set.add(abs.split("#")[0]);
        }
      } catch {}
    }
  }
  const bare =
    /https:\/\/(?:cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net)\/[^\s"'<>),&]+/gi;
  while ((m = bare.exec(html))) set.add(m[0].split("#")[0]);
  return [...set];
}

function rewrite(html, urlMap) {
  let out = html;
  out = out.replace(/\s+integrity="[^"]*"/g, "");
  out = out.replace(
    /<link[^>]+href="https:\/\/cdn\.prod\.website-files\.com"[^>]*>/g,
    ""
  );
  out = out.split("https://two26.studio/").join("/");
  out = out.split("https://two26.studio").join("/");

  // longest CDN urls first
  const keys = [...urlMap.keys()].sort((a, b) => b.length - a.length);
  for (const from of keys) {
    const to = urlMap.get(from);
    out = out.split(from).join(to);
    // also replace queryless variant
    const noQ = from.split("?")[0];
    if (noQ !== from) out = out.split(noQ).join(to);
  }

  // leftover CDN absolute -> encoded local
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/([^"'>\s]+)/g,
    (_m, p) => {
      const { web } = pathsFor("https://cdn.prod.website-files.com/" + p);
      return web;
    }
  );
  out = out.replace(
    /https:\/\/d3e54v103j8qbb\.cloudfront\.net\/([^"'>\s?]+)/g,
    (_m, p) => {
      const { web } = pathsFor(
        "https://d3e54v103j8qbb.cloudfront.net/" + p
      );
      return web;
    }
  );
  out = out.replace(
    /https:\/\/cdn\.jsdelivr\.net\/([^"'>\s]+)/g,
    (_m, p) => {
      const { web } = pathsFor("https://cdn.jsdelivr.net/" + p);
      return web;
    }
  );

  // strip query on local jquery
  out = out.replace(
    /(\/assets\/d3e54v103j8qbb_cloudfront_net\/js\/jquery-3\.5\.1\.min\.dc5e7f18c8\.js)\?[^"']+/g,
    "$1"
  );
  return out;
}

function pagePath(p) {
  const key = p.replace(/\/+$/, "") || "/";
  if (key === "/") return path.join(ROOT, "index.html");
  return path.join(ROOT, key.slice(1), "index.html");
}

function headings(html) {
  return [
    ...html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi),
  ]
    .map((m) =>
      m[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

function missingFrom(html) {
  const miss = [];
  const re =
    /\b(?:src|href|poster|data-src|data-poster)=["'](\/assets\/[^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const web = decodeURIComponent(m[1].split("?")[0]);
    const abs = path.join(ROOT, web.replace(/^\//, "").replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) miss.push(m[1]);
  }
  const srcset = /srcset=["']([^"']+)["']/gi;
  while ((m = srcset.exec(html))) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (!u.startsWith("/assets/")) continue;
      const web = decodeURIComponent(u);
      const abs = path.join(
        ROOT,
        web.replace(/^\//, "").replace(/\//g, path.sep)
      );
      if (!fs.existsSync(abs)) miss.push(u);
    }
  }
  const vids = /data-video-urls=["']([^"']+)["']/gi;
  while ((m = vids.exec(html))) {
    for (const part of m[1].split(",")) {
      const u = part.trim();
      if (!u.startsWith("/assets/")) continue;
      const web = decodeURIComponent(u);
      const abs = path.join(
        ROOT,
        web.replace(/^\//, "").replace(/\//g, path.sep)
      );
      if (!fs.existsSync(abs)) miss.push(u);
    }
  }
  return [...new Set(miss)];
}

(async () => {
  for (const e of EXTRA) await ensureAsset(e);

  const report = {};
  for (const p of PAGES) {
    const url = ORIGIN + (p === "/" ? "/" : p);
    console.log("PAGE", url);
    const html = (await fetchBuffer(url)).toString("utf8");
    const assets = collect(html, url);
    const urlMap = new Map();
    for (const a of assets) {
      const web = await ensureAsset(a);
      if (web) {
        urlMap.set(a, web);
        urlMap.set(a.split("?")[0], web);
      }
    }
    const out = rewrite(html, urlMap);
    const outPath = pagePath(p);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, out);
    const miss = missingFrom(out);
    report[p] = { headings: headings(html), missing: miss };
    console.log(
      "  headings",
      report[p].headings.length,
      "missing",
      miss.length,
      miss.slice(0, 3)
    );
  }

  fs.writeFileSync(
    path.join(__dirname, "..", "clean-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("DONE pages", PAGES.length);
})();
