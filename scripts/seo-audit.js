const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.join(__dirname, "..", "site");

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

function get(urlPath) {
  return new Promise((resolve) => {
    http
      .get("http://localhost:3000" + urlPath, (res) => {
        resolve(res.statusCode);
        res.resume();
      })
      .on("error", () => resolve(0));
  });
}

function text(html, re) {
  const m = html.match(re);
  return m ? m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null;
}

function all(html, re) {
  return [...html.matchAll(re)].map((m) =>
    m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  );
}

function pagePath(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel === "index.html") return "/";
  return "/" + rel.replace(/\/index\.html$/, "/");
}

(async () => {
  const files = walk(ROOT);
  const report = [];

  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    const route = pagePath(file);
    const issues = [];
    const ok = [];

    const title = text(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const desc = text(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
    ) || text(
      html,
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i
    );
    const canonical = text(
      html,
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
    );
    const robots = text(
      html,
      /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>/i
    );
    const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const charset = /<meta[^>]+charset=/i.test(html);
    const lang = text(html, /<html[^>]+lang=["']([^"']+)["']/i);
    const h1s = all(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    const h2s = all(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi);
    const h3s = all(html, /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi);
    const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    const imgsNoAlt = imgs.filter((t) => !/\balt=/i.test(t));
    const imgsEmptyAlt = imgs.filter((t) => /\balt=["']\s*["']/i.test(t));
    const ogTitle = text(html, /property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || text(html, /content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const ogDesc = text(html, /property=["']og:description["'][^>]+content=["']([^"']+)["']/i) || text(html, /content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const ogImage = text(html, /property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || text(html, /content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const twCard = text(html, /name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i) || text(html, /content=["']([^"']+)["'][^>]+name=["']twitter:card["']/i);
    const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
    const hasMain = /<main\b/i.test(html);
    const hasHeader = /<header\b/i.test(html);
    const hasNav = /<nav\b/i.test(html);
    const hasFooter = /<footer\b/i.test(html);
    const hasSkip = /skip.*content|skip-link/i.test(html);
    const a11yLinks = (html.match(/<a\b[^>]*>/gi) || []).length;
    const linksNoHref = (html.match(/<a\b(?![^>]*href=)[^>]*>/gi) || []).length;

    // Checks
    if (charset) ok.push("charset"); else issues.push({ sev: "high", msg: "Missing <meta charset>" });
    if (viewport) ok.push("viewport"); else issues.push({ sev: "high", msg: "Missing viewport meta" });
    if (lang) ok.push("lang=" + lang); else issues.push({ sev: "high", msg: "Missing html lang" });

    if (!title) issues.push({ sev: "high", msg: "Missing <title>" });
    else {
      ok.push("title");
      if (title.length < 30) issues.push({ sev: "med", msg: `Title short (${title.length} chars): "${title}"` });
      if (title.length > 60) issues.push({ sev: "med", msg: `Title long (${title.length} chars): "${title}"` });
    }

    if (!desc) issues.push({ sev: "high", msg: "Missing meta description" });
    else {
      ok.push("description");
      if (desc.length < 70) issues.push({ sev: "med", msg: `Description short (${desc.length})` });
      if (desc.length > 160) issues.push({ sev: "med", msg: `Description long (${desc.length})` });
    }

    if (!canonical) issues.push({ sev: "med", msg: "Missing canonical link" });
    else ok.push("canonical");

    if (robots && /noindex/i.test(robots)) issues.push({ sev: "high", msg: "robots noindex set: " + robots });

    if (h1s.length === 0) issues.push({ sev: "high", msg: "No H1" });
    else if (h1s.length > 1) issues.push({ sev: "med", msg: `Multiple H1 (${h1s.length}): ${h1s.slice(0, 4).join(" | ")}` });
    else ok.push("single H1");

    // heading order rough check: h3 without h2
    if (h3s.length && !h2s.length) issues.push({ sev: "low", msg: "H3 present without H2" });

    if (imgs.length) {
      if (imgsNoAlt.length) issues.push({ sev: "high", msg: `${imgsNoAlt.length}/${imgs.length} images missing alt` });
      else ok.push("all imgs have alt attr");
      if (imgsEmptyAlt.length) issues.push({ sev: "low", msg: `${imgsEmptyAlt.length} images with empty alt (ok if decorative)` });
    }

    if (!ogTitle) issues.push({ sev: "med", msg: "Missing og:title" }); else ok.push("og:title");
    if (!ogDesc) issues.push({ sev: "med", msg: "Missing og:description" }); else ok.push("og:description");
    if (!ogImage) issues.push({ sev: "med", msg: "Missing og:image" }); else ok.push("og:image");
    if (!twCard) issues.push({ sev: "low", msg: "Missing twitter:card" }); else ok.push("twitter:card");

    if (!jsonLd.length) issues.push({ sev: "med", msg: "No JSON-LD structured data" });
    else ok.push("json-ld x" + jsonLd.length);

    if (!hasMain) issues.push({ sev: "med", msg: "No <main> landmark" }); else ok.push("main");
    if (!hasNav) issues.push({ sev: "low", msg: "No <nav> landmark" }); else ok.push("nav");
    if (!hasHeader) issues.push({ sev: "low", msg: "No <header> landmark" }); else ok.push("header");
    if (!hasFooter) issues.push({ sev: "low", msg: "No <footer> landmark" }); else ok.push("footer");
    if (!hasSkip) issues.push({ sev: "low", msg: "No skip-to-content link" });

    // Webflow leftovers / SEO risks
    if (/data-wf-domain="two26\.studio"/i.test(html)) issues.push({ sev: "info", msg: "Still has Webflow data-wf-domain=two26.studio" });
    if (/https:\/\/two26\.studio/i.test(html)) issues.push({ sev: "med", msg: "Hardcoded two26.studio absolute URLs remain" });
    if (/bogdan@two26\.studio/i.test(html)) issues.push({ sev: "info", msg: "Contact emails still two26.studio" });

    report.push({
      route,
      title,
      desc: desc ? desc.slice(0, 120) + (desc.length > 120 ? "…" : "") : null,
      h1s,
      h2Count: h2s.length,
      imgCount: imgs.length,
      issues,
      ok,
    });
  }

  // site-level files
  const siteFiles = {
    robotsTxt: fs.existsSync(path.join(ROOT, "robots.txt")),
    sitemapXml: fs.existsSync(path.join(ROOT, "sitemap.xml")) || fs.existsSync(path.join(ROOT, "sitemap_index.xml")),
    manifest: fs.existsSync(path.join(ROOT, "manifest.json")) || fs.existsSync(path.join(ROOT, "site.webmanifest")),
  };

  const httpChecks = {};
  for (const p of ["/", "/about/", "/work/", "/robots.txt", "/sitemap.xml"]) {
    httpChecks[p] = await get(p);
  }

  const out = { generatedAt: new Date().toISOString(), siteFiles, httpChecks, pages: report };
  const outPath = path.join(__dirname, "..", "seo-audit-report.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  // Print summary
  console.log("=== SEO AUDIT SUMMARY ===\n");
  console.log("Site files:", siteFiles);
  console.log("HTTP:", httpChecks);
  console.log("");

  let high = 0, med = 0, low = 0;
  for (const p of report) {
    const hs = p.issues.filter((i) => i.sev === "high");
    const ms = p.issues.filter((i) => i.sev === "med");
    const ls = p.issues.filter((i) => i.sev === "low" || i.sev === "info");
    high += hs.length; med += ms.length; low += ls.length;
    console.log(`\n${p.route}`);
    console.log(`  title: ${p.title || "(missing)"}`);
    console.log(`  desc:  ${p.desc || "(missing)"}`);
    console.log(`  h1:    ${p.h1s.length ? p.h1s.join(" | ") : "(none)"}`);
    console.log(`  h2s=${p.h2Count} imgs=${p.imgCount}`);
    if (p.issues.length) {
      for (const i of p.issues) console.log(`  [${i.sev}] ${i.msg}`);
    } else console.log("  OK");
  }
  console.log(`\nTOTAL issues — high:${high} med:${med} low/info:${low}`);
  console.log("Report:", outPath);
})();
