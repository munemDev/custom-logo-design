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

function headings(html) {
  const out = [];
  const re = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = m[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push(text);
  }
  return out;
}

function localPathFromWeb(webPath) {
  const clean = decodeURIComponent(webPath.split("?")[0].split("#")[0]);
  return path.join(ROOT, clean.replace(/^\//, "").replace(/\//g, path.sep));
}

function fetchBuffer(url) {
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
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return resolve(fetchBuffer(new URL(res.headers.location, url).href));
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

(async () => {
  const pages = walkHtml(ROOT);
  const report = {};
  const missing = new Set();
  const remotes = new Set();

  for (const file of pages) {
    let html = fs.readFileSync(file, "utf8");
    // cleanup entity-corrupted urls
    html = html.replace(/&quot;/g, '"');
    html = html.replace(/https:\/\/cdn\.prod\.website-files\.com\/[^"'\s>]*&quot;/g, "");

    // rewrite any leftover remotes if local exists or mark missing
    const remoteRe =
      /https:\/\/cdn\.prod\.website-files\.com\/([^"'>\s]+(?: [^"'>\s]+)*)/g;
    html = html.replace(remoteRe, (full, p) => {
      const web = "/assets/cdn_prod_website-files_com/" + decodeURIComponent(p);
      const abs = localPathFromWeb(web);
      if (fs.existsSync(abs)) return web;
      remotes.add(full);
      return web;
    });

    fs.writeFileSync(file, html);

    const refs = [
      ...html.matchAll(
        /(?:src|href|poster|data-src)=["'](\/assets\/[^"']+)["']/g
      ),
      ...[...html.matchAll(/data-video-urls=["']([^"']+)["']/g)].flatMap((m) =>
        m[1].split(",").map((s) => ["", s.trim()])
      ),
      ...[...html.matchAll(/srcset=["']([^"']+)["']/g)].flatMap((m) =>
        m[1].split(",").map((part) => ["", part.trim().split(/\s+/)[0]])
      ),
    ];

    let miss = 0;
    for (const row of refs) {
      const u = row[1];
      if (!u || !u.startsWith("/assets/")) continue;
      const abs = localPathFromWeb(u);
      if (!fs.existsSync(abs)) {
        miss++;
        missing.add(u);
      }
    }

    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    report[rel] = {
      headings: headings(html),
      missingRefs: miss,
      size: html.length,
    };
  }

  // try download missing from original CDN
  let downloaded = 0;
  for (const web of missing) {
    const rel = web.replace(/^\/assets\/cdn_prod_website-files_com\//, "");
    const url =
      "https://cdn.prod.website-files.com/" +
      rel
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/");
    const abs = localPathFromWeb(web);
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const buf = await fetchBuffer(url);
      fs.writeFileSync(abs, buf);
      downloaded++;
      missing.delete(web);
      console.log("recovered", web, buf.length);
    } catch (e) {
      console.warn("still missing", web, e.message);
    }
  }

  const out = {
    pages: report,
    stillMissing: [...missing],
    downloaded,
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "audit-report.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(
    JSON.stringify(
      {
        pageCount: pages.length,
        downloaded,
        stillMissing: missing.size,
        pages: Object.fromEntries(
          Object.entries(report).map(([k, v]) => [
            k,
            { headings: v.headings.length, missingRefs: v.missingRefs },
          ])
        ),
      },
      null,
      2
    )
  );
})();
