const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");
const BTN =
  '<a href="/pricing" class="navbar-link-btn w-inline-block"><div class="navlink-text">Pricing</div></a>';

function addNav(html) {
  if (
    html.includes('href="/pricing" class="navbar-link-btn') ||
    html.includes('href="/pricing" aria-current')
  ) {
    return html;
  }
  return html.replace(
    /<a href="\/about"[^>]*class="navbar-link-btn[^"]*"[^>]*>[\s\S]*?<\/a>/g,
    (m) => m + BTN
  );
}

function addFooter(html) {
  if (html.includes('href="/pricing" class="footer-link"')) return html;
  return html.replace(
    /(<a\s+href="\/about"[^>]*class="footer-link[^"]*"[^>]*>About us<\/a>)/g,
    '$1<a href="/pricing" class="footer-link">Pricing</a>'
  );
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "assets" || ent.name === "node_modules") continue;
      walk(p);
    } else if (ent.name.endsWith(".html")) {
      let html = fs.readFileSync(p, "utf8");
      const before = html;
      html = addNav(html);
      html = addFooter(html);
      const rel = path.relative(ROOT, p).replace(/\\/g, "/");
      if (rel.startsWith("pricing/")) {
        html = html.replace(
          /<a href="\/pricing" class="navbar-link-btn w-inline-block"><div class="navlink-text">Pricing<\/div><\/a>/g,
          '<a href="/pricing" aria-current="page" class="navbar-link-btn w-inline-block w--current"><div class="navlink-text">Pricing</div></a>'
        );
      }
      if (html !== before) {
        fs.writeFileSync(p, html);
        console.log("fixed", rel);
      } else if (!html.includes('href="/pricing"')) {
        console.log("still missing", rel);
      }
    }
  }
}

walk(ROOT);
console.log("done");
