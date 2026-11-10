const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..", "site");

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

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
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

function extractAssetUrls(html) {
  const urls = new Set();
  // srcset
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  let m;
  while ((m = srcsetRe.exec(html))) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (u.startsWith("/assets/")) urls.add(u);
    }
  }
  // data-video-urls
  const vRe = /data-video-urls=["']([^"']+)["']/gi;
  while ((m = vRe.exec(html))) {
    for (const part of m[1].split(",")) {
      const u = part.trim();
      if (u.startsWith("/assets/")) urls.add(u);
    }
  }
  // normal quoted attrs
  const aRe = /\b(?:src|href|poster|data-src|data-poster)=["'](\/assets\/[^"']+)["']/gi;
  while ((m = aRe.exec(html))) urls.add(m[1]);
  return [...urls];
}

function absFromWeb(web) {
  return path.join(ROOT, web.replace(/^\//, "").replace(/\//g, path.sep));
}

function cdnFromWeb(web) {
  if (web.startsWith("/assets/cdn_prod_website-files_com/")) {
    const rest = web.slice("/assets/cdn_prod_website-files_com/".length);
    return (
      "https://cdn.prod.website-files.com/" +
      rest
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/")
    );
  }
  if (web.startsWith("/assets/d3e54v103j8qbb_cloudfront_net/")) {
    const rest = web.slice("/assets/d3e54v103j8qbb_cloudfront_net/".length);
    return (
      "https://d3e54v103j8qbb.cloudfront.net/" +
      rest
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/")
    );
  }
  if (web.startsWith("/assets/cdn_jsdelivr_net/")) {
    const rest = web.slice("/assets/cdn_jsdelivr_net/".length);
    return (
      "https://cdn.jsdelivr.net/" +
      rest
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/")
    );
  }
  return null;
}

(async () => {
  const pages = walkHtml(ROOT);
  const all = new Set();
  const pageInfo = {};

  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    const urls = extractAssetUrls(html);
    const headings = [
      ...html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi),
    ].map((m) =>
      m[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
    pageInfo[path.relative(ROOT, file).replace(/\\/g, "/")] = {
      headings: headings.filter(Boolean),
      assetRefs: urls.length,
    };
    urls.forEach((u) => all.add(u));
  }

  const missing = [];
  for (const web of all) {
    if (!fs.existsSync(absFromWeb(web))) missing.push(web);
  }

  console.log("total asset refs", all.size, "missing", missing.length);

  let downloaded = 0;
  for (const web of missing) {
    const cdn = cdnFromWeb(web);
    if (!cdn) {
      console.warn("no cdn map", web);
      continue;
    }
    try {
      const abs = absFromWeb(web);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const buf = await fetchBuffer(cdn);
      fs.writeFileSync(abs, buf);
      downloaded++;
      console.log("got", web, buf.length);
    } catch (e) {
      console.warn("fail", web, e.message);
    }
  }

  // recount
  const still = [];
  for (const web of all) {
    if (!fs.existsSync(absFromWeb(web))) still.push(web);
  }

  const summary = {
    pages: Object.fromEntries(
      Object.entries(pageInfo).map(([k, v]) => [
        k,
        { headings: v.headings, count: v.headings.length, assetRefs: v.assetRefs },
      ])
    ),
    downloaded,
    stillMissing: still,
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "verify-report.json"),
    JSON.stringify(summary, null, 2)
  );
  console.log(
    JSON.stringify(
      {
        pages: Object.keys(pageInfo).length,
        downloaded,
        stillMissing: still.length,
        still: still.slice(0, 20),
        headingCounts: Object.fromEntries(
          Object.entries(pageInfo).map(([k, v]) => [k, v.headings.length])
        ),
      },
      null,
      2
    )
  );
})();
