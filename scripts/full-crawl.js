const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const ORIGIN = "https://two26.studio";
const ROOT = path.join(__dirname, "..", "site");
const REPORT = path.join(__dirname, "..", "crawl-report.json");

const SEED = ["/", "/work", "/about", "/404", "/401", "/utility-page"];

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept: "*/*",
        },
        timeout: 60000,
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
          resolve({
            status: res.statusCode,
            buffer: Buffer.concat(chunks),
            contentType: res.headers["content-type"] || "",
          })
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout " + url));
    });
  });
}

function normalizePage(pathname) {
  let p = pathname.split("?")[0].split("#")[0];
  p = p.replace(/\/+$/, "") || "/";
  return p;
}

function pageOutPath(pathname) {
  const p = normalizePage(pathname);
  if (p === "/") return path.join(ROOT, "index.html");
  return path.join(ROOT, p.slice(1), "index.html");
}

function assetLocal(assetUrl) {
  const u = new URL(assetUrl);
  const host = u.host.replace(/\./g, "_");
  const pathname = decodeURIComponent(u.pathname).replace(/^\/+/, "");
  const rel = path.join("assets", host, pathname);
  return {
    abs: path.join(ROOT, rel),
    web: "/" + rel.replace(/\\/g, "/"),
  };
}

function extractAll(html, baseUrl) {
  const pages = new Set();
  const assets = new Set();

  const addMaybe = (raw) => {
    if (!raw) return;
    let s = String(raw).trim();
    if (!s) return;
    if (
      s.startsWith("data:") ||
      s.startsWith("mailto:") ||
      s.startsWith("tel:") ||
      s.startsWith("javascript:") ||
      s === "#"
    )
      return;

    // srcset pieces
    const candidates = s.includes(",")
      ? s.split(",").map((part) => part.trim().split(/\s+/)[0])
      : [s.split(/\s+/)[0]];

    for (let c of candidates) {
      if (!c) continue;
      try {
        // fix broken single-slash
        c = c.replace(/^https:\/(?!\/)/, "https://");
        const abs = new URL(c, baseUrl).href.split("#")[0];
        const u = new URL(abs);
        if (u.origin === ORIGIN) {
          // ignore file-like paths that aren't pages
          const p = normalizePage(u.pathname);
          if (!/\.(css|js|json|svg|png|jpe?g|webp|gif|mp4|webm|woff2?|ttf|otf|ico|map)$/i.test(p)) {
            pages.add(p);
          }
        } else if (
          /cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net|uploads-ssl\.webflow\.com|assets-global\.website-files\.com/.test(
            u.host
          )
        ) {
          if (u.pathname && u.pathname !== "/") assets.add(abs.split("?")[0]);
        }
      } catch {}
    }
  };

  // attributes
  const attrRe =
    /(?:href|src|poster|data-src|data-poster|data-bg|data-image|data-video-urls|srcset|data-srcset)=["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html))) addMaybe(m[1]);

  // css urls
  const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = urlRe.exec(html))) addMaybe(m[1]);

  // bare CDN urls anywhere (scripts, json, escaped)
  const cdnRe =
    /https:\/\/(?:cdn\.prod\.website-files\.com|assets-global\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net|uploads-ssl\.webflow\.com)[^"'\\\s<>)]+/gi;
  while ((m = cdnRe.exec(html))) {
    let u = m[0]
      .replace(/\\u0026/g, "&")
      .replace(/\\u002F/gi, "/")
      .replace(/%2F/gi, "/");
    // truncate trailing punctuation
    u = u.replace(/[.,;)\]]+$/, "");
    addMaybe(u);
  }

  // encoded CDN
  const encRe =
    /https:\/\/cdn\.prod\.website-files\.com%2F[A-Za-z0-9%._~-]+/gi;
  while ((m = encRe.exec(html))) {
    try {
      addMaybe(decodeURIComponent(m[0]));
    } catch {
      addMaybe(m[0]);
    }
  }

  return { pages, assets };
}

async function downloadAsset(url, downloaded) {
  const clean = url.split("?")[0];
  if (downloaded.has(clean)) return assetLocal(clean).web;
  downloaded.add(clean);
  const { abs, web } = assetLocal(clean);
  if (fs.existsSync(abs) && fs.statSync(abs).size > 0) {
    // still scrape css for nested
    if (/\.css$/i.test(abs)) {
      const text = fs.readFileSync(abs, "utf8");
      const nested = extractAll(text, clean);
      for (const a of nested.assets) {
        try {
          await downloadAsset(a, downloaded);
        } catch {}
      }
    }
    return web;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  try {
    const { status, buffer } = await fetchBuffer(url);
    if (status !== 200) throw new Error("HTTP " + status);
    fs.writeFileSync(abs, buffer);
    process.stdout.write(`  + asset ${web} (${buffer.length})\n`);
    if (/\.css$/i.test(abs) || /webflow.*\.css/i.test(url)) {
      const text = buffer.toString("utf8");
      const nested = extractAll(text, url);
      let rewritten = text;
      for (const a of nested.assets) {
        try {
          const local = await downloadAsset(a, downloaded);
          rewritten = rewritten.split(a).join(local);
          rewritten = rewritten.split(a.split("?")[0]).join(local);
        } catch {}
      }
      fs.writeFileSync(abs, rewritten);
    }
    return web;
  } catch (e) {
    downloaded.delete(clean);
    console.warn("  ! asset fail", clean, e.message);
    return null;
  }
}

function rewriteHtml(html, pageUrl, assetMap) {
  let out = html;
  // fix broken https:/
  out = out.replace(/https:\/(?!\/)(cdn\.prod\.website-files\.com)/gi, "https://$1");

  const keys = [...assetMap.keys()].sort((a, b) => b.length - a.length);
  for (const from of keys) {
    out = out.split(from).join(assetMap.get(from));
  }

  out = out.split("/./assets/").join("/assets/");
  out = out.replace(/\s+integrity="[^"]*"/g, "");
  out = out.replace(/<link[^>]+href="https:\/\/cdn\.prod\.website-files\.com"[^>]*>/g, "");
  out = out.replace(/https:\/\/two26\.studio\//g, "/");
  out = out.replace(/https:\/\/two26\.studio/g, "/");

  // leftover CDN with spaces
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/([^"'>\s]+(?: [^"'>\s]+)*)/g,
    (_m, p) => "/assets/cdn_prod_website-files_com/" + decodeURIComponent(p)
  );
  out = out
    .split("https://cdn.prod.website-files.com%2F")
    .join("/assets/cdn_prod_website-files_com/");

  return out;
}

function collectSections(html) {
  const sections = [];
  const re =
    /<(?:section|div)[^>]*(?:class|data-w-id)=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const cls = m[1];
    if (/section|hero|footer|header|faq|testimonial|work|about|contact|services|cta/i.test(cls)) {
      sections.push(cls.split(/\s+/).slice(0, 4).join(" "));
    }
  }
  // headings as section markers
  const heads = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)].map((x) =>
    x[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
  );
  return { classHints: [...new Set(sections)].slice(0, 80), headings: heads };
}

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const queue = [...SEED];
  const visited = new Set();
  const downloaded = new Set();
  const pageReport = {};
  const failedPages = [];
  const failedAssets = [];

  while (queue.length) {
    const raw = queue.shift();
    const page = normalizePage(raw);
    if (visited.has(page)) continue;
    visited.add(page);

    const url = ORIGIN + (page === "/" ? "/" : page);
    process.stdout.write(`\nPAGE ${url}\n`);
    let html;
    try {
      const res = await fetchBuffer(url);
      if (res.status !== 200) {
        failedPages.push({ page, status: res.status });
        console.warn("  skip status", res.status);
        continue;
      }
      html = res.buffer.toString("utf8");
      // skip pure utility 404 if title is Not Found AND not intentionally 404 page with content
      if (
        /<title>Not Found<\/title>/i.test(html) &&
        page !== "/404" &&
        !html.includes("utility-page-content")
      ) {
        // still might be 404 template - keep if seeded utility
      }
    } catch (e) {
      failedPages.push({ page, error: e.message });
      console.warn("  page fail", e.message);
      continue;
    }

    const found = extractAll(html, url);
    for (const p of found.pages) {
      if (!visited.has(p)) queue.push(p);
    }

    const assetMap = new Map();
    for (const a of found.assets) {
      try {
        const local = await downloadAsset(a, downloaded);
        if (local) {
          assetMap.set(a, local);
          assetMap.set(a.split("?")[0], local);
        } else {
          failedAssets.push(a);
        }
      } catch (e) {
        failedAssets.push(a);
      }
    }

    const sections = collectSections(html);
    const outHtml = rewriteHtml(html, url, assetMap);
    const outPath = pageOutPath(page);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, outHtml);

    pageReport[page] = {
      out: path.relative(ROOT, outPath),
      bytes: Buffer.byteLength(outHtml),
      assetsOnPage: found.assets.size,
      headings: sections.headings,
      sectionHints: sections.classHints.slice(0, 40),
    };
    console.log(
      `  wrote ${page} | headings=${sections.headings.length} assets=${found.assets.size}`
    );
  }

  // second pass: scan all local html for any remaining remote CDN and fetch
  function walkHtml(dir, files = []) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "assets") continue;
        walkHtml(p, files);
      } else if (ent.name.endsWith(".html")) files.push(p);
    }
    return files;
  }

  console.log("\nSECOND PASS: leftover remote assets in local HTML...");
  for (const file of walkHtml(ROOT)) {
    let text = fs.readFileSync(file, "utf8");
    const found = extractAll(text, ORIGIN + "/");
    let changed = false;
    for (const a of found.assets) {
      if (!a.startsWith("http")) continue;
      try {
        const local = await downloadAsset(a, downloaded);
        if (local) {
          text = text.split(a).join(local);
          text = text.split(a.split("?")[0]).join(local);
          changed = true;
        }
      } catch {}
    }
    // final cleanup
    const cleaned = rewriteHtml(text, ORIGIN + "/", new Map());
    if (cleaned !== text) {
      text = cleaned;
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(file, text);
      console.log("  cleaned", path.relative(ROOT, file));
    }
  }

  const report = {
    pages: Object.keys(pageReport).sort(),
    pageDetails: pageReport,
    assetCount: downloaded.size,
    failedPages,
    failedAssets: [...new Set(failedAssets)].slice(0, 100),
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log("\nDONE");
  console.log("pages:", report.pages.length);
  console.log("assets tracked:", downloaded.size);
  console.log("failed pages:", failedPages.length);
  console.log("failed assets:", report.failedAssets.length);
  console.log("report:", REPORT);
})();
