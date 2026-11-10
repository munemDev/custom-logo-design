const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..", "site");

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

function localPath(assetUrl) {
  const u = new URL(assetUrl);
  const host = u.host.replace(/\./g, "_");
  const pathname = decodeURIComponent(u.pathname).replace(/^\/+/, "");
  return {
    abs: path.join(ROOT, "assets", host, pathname),
    web: "/assets/" + host + "/" + pathname.replace(/\\/g, "/"),
  };
}

async function ensure(url) {
  const { abs, web } = localPath(url);
  if (fs.existsSync(abs) && fs.statSync(abs).size > 0) {
    console.log("ok", web, fs.statSync(abs).size);
    return web;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const { status, buffer } = await fetchBuffer(url);
  if (status !== 200) throw new Error("HTTP " + status + " " + url);
  fs.writeFileSync(abs, buffer);
  console.log("got", web, buffer.length);
  return web;
}

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

function extractHeadings(html) {
  return [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)].map((x) =>
    x[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
  );
}

(async () => {
  // Known tricky assets (spaces / parentheses)
  const extras = [
    "https://cdn.prod.website-files.com/6a7d9d7d7c99784ba2cac874/6a7db9b17a581584f4171aad_Hero_poster.0000000.jpg",
    "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f52049/6ab26381b5a759b6db4cec12_Shot%201_poster.0000000.jpg",
    "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f52049/6ab263f29cc7204d5832b66d_Shot%203_poster.0000000.jpg",
    "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1).webp",
    "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1).jpg",
    "https://cdn.prod.website-files.com/6aaad679fdb9d914f7f5203c/6ab38e4c47df4db39f2476ae_Gluco%20case_header%20%20(1).png",
    "https://cdn.prod.website-files.com/static/page-not-found.211a85e40c.svg",
    "https://cdn.prod.website-files.com/static/utility-lock.ae54711958.svg",
  ];

  // Scan HTML for any remaining remote CDN urls (including with spaces)
  const remote = new Set(extras);
  for (const file of walk(ROOT)) {
    const html = fs.readFileSync(file, "utf8");
    const re =
      /https:\/\/cdn\.prod\.website-files\.com\/[^"'\\\s<>)]+(?:\([^"'\\\s<>)]*\))?[^"'\\\s<>)]*/gi;
    let m;
    while ((m = re.exec(html))) remote.add(m[0].replace(/&quot;?/g, "").replace(/"$/, ""));
    // also src="/assets/..." broken as still remote encoded
    const enc =
      /https:\/\/cdn\.prod\.website-files\.com%2F[A-Za-z0-9%._~\-()]+/gi;
    while ((m = enc.exec(html))) {
      try {
        remote.add(decodeURIComponent(m[0]));
      } catch {}
    }
  }

  // Find Gluco header filename from heygluco page source if needed
  try {
    const { buffer } = await fetchBuffer("https://two26.studio/work/heygluco");
    const html = buffer.toString("utf8");
    const gluco = [
      ...html.matchAll(
        /https:\/\/cdn\.prod\.website-files\.com\/[^"'\\\s]+Gluco[^"'\\\s]*/gi
      ),
    ].map((x) => x[0]);
    gluco.forEach((u) => remote.add(u.split("?")[0]));
    console.log("gluco urls from live:", gluco.slice(0, 10));
  } catch (e) {
    console.warn("could not refetch heygluco", e.message);
  }

  const map = new Map();
  for (const url of remote) {
    try {
      const web = await ensure(url);
      map.set(url, web);
      map.set(decodeURI(url), web);
    } catch (e) {
      console.warn("fail", url, e.message);
    }
  }

  // Rewrite leftovers in HTML
  for (const file of walk(ROOT)) {
    let html = fs.readFileSync(file, "utf8");
    const before = html;
    const keys = [...map.keys()].sort((a, b) => b.length - a.length);
    for (const k of keys) html = html.split(k).join(map.get(k));
    html = html.split("/./assets/").join("/assets/");
    html = html.replace(/https:\/\/two26\.studio\//g, "/");
    html = html.replace(/\s+integrity="[^"]*"/g, "");
    // remove bogus template pages links if any
    if (html !== before) {
      fs.writeFileSync(file, html);
      console.log("patched", path.relative(ROOT, file));
    }
  }

  // Section audit
  const audit = {};
  for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const page =
      rel === "index.html"
        ? "/"
        : "/" + rel.replace(/\/index\.html$/, "");
    const html = fs.readFileSync(file, "utf8");
    const remoteLeft = (html.match(/https:\/\/cdn\.prod\.website-files/g) || [])
      .length;
    audit[page] = {
      headings: extractHeadings(html),
      remoteLeft,
      size: fs.statSync(file).size,
      imgs: (html.match(/<img\b/gi) || []).length,
      videos: (html.match(/<video\b/gi) || []).length,
      lottie: (html.match(/\.json/gi) || []).length,
    };
  }
  fs.writeFileSync(
    path.join(__dirname, "..", "section-audit.json"),
    JSON.stringify(audit, null, 2)
  );
  console.log("\nSECTION AUDIT");
  for (const [p, a] of Object.entries(audit)) {
    console.log(
      `${p} | h=${a.headings.length} img=${a.imgs} video=${a.videos} remote=${a.remoteLeft}`
    );
    console.log("  ", a.headings.filter((h) => h && !/^want to|^start$|^a new$|^project\?$/i.test(h)).join(" | "));
  }
})();
