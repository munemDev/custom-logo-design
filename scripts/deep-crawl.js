const https = require("https");
const http = require("http");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");

const ORIGIN = "https://two26.studio";
const ROOT = path.join(__dirname, "..", "site");
const queue = ["/", "/work", "/about"];
const visited = new Set();
const allAssets = new Set();
const pageMeta = {};

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,*/*",
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
            fetchText(new URL(res.headers.location, url).href, redirects + 1)
          );
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} ${url}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            text: Buffer.concat(chunks).toString("utf8"),
            status: res.statusCode,
          })
        );
      }
    );
    req.on("error", reject);
  });
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

function normalizePath(pathname) {
  let p = pathname.replace(/\/+$/, "") || "/";
  if (p.includes("${") || p.includes("%24%7B") || p.includes("%7B")) return null;
  if (p.includes(".")) return null;
  return p;
}

function extract(html, base) {
  const pages = new Set();
  const assets = new Set();
  const headings = [];
  const sections = [];

  const hRe = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = hRe.exec(html))) {
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) headings.push({ tag: m[1].toLowerCase(), text: text.slice(0, 120) });
  }

  const secRe = /<(section|header|footer|main)[^>]*(?:class|id)=["']([^"']+)["'][^>]*>/gi;
  while ((m = secRe.exec(html))) {
    sections.push(`${m[1]}.${m[2]}`);
  }
  // also class-only wrappers common in webflow
  const divSec = /<div[^>]*class=["']([^"']*(?:section|hero|footer|nav|header|works|about|faq|testimonial|contact|services)[^"']*)["'][^>]*>/gi;
  while ((m = divSec.exec(html))) {
    sections.push("div." + m[1].split(/\s+/).slice(0, 3).join("."));
  }

  const attrRe =
    /(?:href|src|poster|data-src|data-poster|srcset|data-video-urls)=["']([^"']+)["']/gi;
  while ((m = attrRe.exec(html))) {
    let raw = m[1].trim();
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:") || raw.startsWith("data:") || raw === "#")
      continue;
    const pieces =
      m[0].toLowerCase().includes("srcset") || m[0].toLowerCase().includes("data-video-urls")
        ? raw.split(",").map((s) => s.trim().split(/\s+/)[0])
        : [raw.split(/\s+/)[0]];
    for (const piece of pieces) {
      try {
        const abs = new URL(piece, base).href;
        const u = new URL(abs);
        if (u.origin === ORIGIN) {
          const np = normalizePath(u.pathname);
          if (np) pages.add(np);
        } else if (
          /cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net|uploads-ssl\.webflow/.test(
            u.host
          )
        ) {
          assets.add(abs.split("#")[0]);
        }
      } catch {}
    }
  }

  const cdnRe =
    /https:\/\/(?:cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net)[^"'\\\s<>)]+/gi;
  while ((m = cdnRe.exec(html))) {
    assets.add(m[0].replace(/\\u0026/g, "&").split("#")[0]);
  }

  return { pages, assets, headings, sections };
}

function assetLocal(assetUrl) {
  const u = new URL(assetUrl.split("?")[0]);
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

function rewriteHtml(html) {
  let out = html;
  out = out.replace(/\s+integrity="[^"]*"/g, "");
  out = out.replace(/<link[^>]+href="https:\/\/cdn\.prod\.website-files\.com"[^>]*>/g, "");
  out = out.split("https://two26.studio/").join("/");
  out = out.split("https://two26.studio").join("/");
  out = out.split("/./assets/").join("/assets/");

  // rewrite CDN urls
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/([^"'>\s]+(?: [^"'>\s]+)*)/g,
    (_m, p) => "/assets/cdn_prod_website-files_com/" + decodeURIComponent(p)
  );
  out = out.replace(
    /https:\/\/d3e54v103j8qbb\.cloudfront\.net\/([^"'>\s]+)/g,
    (_m, p) => "/assets/d3e54v103j8qbb_cloudfront_net/" + decodeURIComponent(p)
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

async function ensureAsset(url) {
  if (!url || url.endsWith("://cdn.prod.website-files.com/") || /\/$/.test(new URL(url).pathname) && !path.extname(new URL(url).pathname)) {
    const u = new URL(url);
    if (u.pathname === "/" || u.pathname === "") return;
  }
  try {
    const u = new URL(url.split("?")[0]);
    if (u.pathname === "/" || !u.pathname) return;
  } catch {
    return;
  }
  allAssets.add(url);
  const { abs, web } = assetLocal(url);
  if (fs.existsSync(abs) && fs.statSync(abs).size > 0) return web;
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  try {
    const buf = await fetchBuffer(url);
    fs.writeFileSync(abs, buf);
    console.log("  +asset", web, buf.length);
    if (/\.css(\?|$)/i.test(url) || abs.endsWith(".css")) {
      const text = buf.toString("utf8");
      const nested = extract(text, url).assets;
      let rewritten = text;
      for (const a of nested) {
        try {
          const local = await ensureAsset(a);
          if (local) {
            rewritten = rewritten.split(a).join(local);
            rewritten = rewritten.split(a.split("?")[0]).join(local);
          }
        } catch {}
      }
      // also rewrite absolute CDN in css
      rewritten = rewriteHtml(rewritten);
      fs.writeFileSync(abs, rewritten);
    }
    return web;
  } catch (e) {
    console.warn("  asset fail", url, e.message);
  }
}

async function crawlPage(pathname) {
  const key = pathname.replace(/\/+$/, "") || "/";
  if (visited.has(key)) return;
  visited.add(key);
  const url = ORIGIN + (key === "/" ? "/" : key);
  console.log("PAGE", url);
  const { text } = await fetchText(url);
  const found = extract(text, url);
  pageMeta[key] = {
    headings: found.headings,
    sectionCount: found.sections.length,
    sections: [...new Set(found.sections)].slice(0, 40),
    assetCount: found.assets.size,
  };
  for (const p of found.pages) {
    if (!visited.has(p)) queue.push(p);
  }
  for (const a of found.assets) {
    await ensureAsset(a);
  }
  const out = rewriteHtml(text);
  const outPath = pageLocal(key);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out);
  console.log("  wrote", outPath, "sections~", found.sections.length, "h:", found.headings.length);
}

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  while (queue.length) {
    const next = queue.shift();
    try {
      await crawlPage(next);
    } catch (e) {
      console.warn("page fail", next, e.message);
    }
  }

  // compare local vs expected
  const report = {
    pages: [...visited].sort(),
    assetsTracked: allAssets.size,
    pageMeta,
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "crawl-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("DONE pages=", visited.size, "assets=", allAssets.size);
})();
