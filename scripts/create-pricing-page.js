const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");
const ABOUT = path.join(ROOT, "about", "index.html");
const OUT_DIR = path.join(ROOT, "pricing");
const OUT = path.join(OUT_DIR, "index.html");
const HOME = path.join(ROOT, "index.html");

const home = fs.readFileSync(HOME, "utf8");
const pricingMatch = home.match(
  /<section class="section-pricing"[\s\S]*?<\/section>\s*(?=<section class="section-testimonials")/
);
if (!pricingMatch) {
  console.error("Pricing section not found on homepage");
  process.exit(1);
}
let pricingSection = pricingMatch[0].trim();
// On dedicated page, give more top padding under navbar
pricingSection = pricingSection.replace(
  /padding: clamp\(4em, 8vw, 7em\) 1\.25em;/,
  "padding: clamp(6em, 10vw, 8.5em) 1.25em clamp(4em, 8vw, 7em);"
);

const PRICING_BTN =
  '<a href="/pricing" class="navbar-link-btn w-inline-block"><div class="navlink-text">Pricing</div></a>';

function addNavLinks(html) {
  if (html.includes('href="/pricing" class="navbar-link-btn')) return html;
  return html.replace(
    /(<a href="\/about" class="navbar-link-btn[^"]*"[^>]*>[\s\S]*?<\/a>)/g,
    `$1${PRICING_BTN}`
  );
}

function addFooterLink(html) {
  if (html.includes('href="/pricing" class="footer-link"')) return html;
  return html.replace(
    /(<a\s+href="\/about" class="footer-link">About us<\/a>)/g,
    '$1<a href="/pricing" class="footer-link">Pricing</a>'
  );
}

// Build pricing page from about shell
let page = fs.readFileSync(ABOUT, "utf8");
page = page
  .replace(
    /<title>[^<]*<\/title>/,
    "<title>Pricing - Logo Design | Boutique Design Studio</title>"
  )
  .replace(
    /name="description" content="[^"]*"/g,
    'name="description" content="Clear logo and brand identity plans from Logo Design. Logo Mark, Full Identity, and Care Plan — no surprises."'
  )
  .replace(
    /property="og:title" content="[^"]*"/g,
    'property="og:title" content="Pricing - Logo Design | Boutique Design Studio"'
  )
  .replace(
    /property="og:description" content="[^"]*"/g,
    'property="og:description" content="Clear logo and brand identity plans from Logo Design. Logo Mark, Full Identity, and Care Plan — no surprises."'
  )
  .replace(
    /name="twitter:title" content="[^"]*"/g,
    'name="twitter:title" content="Pricing - Logo Design | Boutique Design Studio"'
  )
  .replace(
    /name="twitter:description" content="[^"]*"/g,
    'name="twitter:description" content="Clear logo and brand identity plans from Logo Design. Logo Mark, Full Identity, and Care Plan — no surprises."'
  )
  .replace(
    /data-wf-page="[^"]*"/,
    'data-wf-page="logo-design-pricing"'
  );

const mainStart = page.indexOf('<main class="main">');
const mainEnd = page.indexOf("</main>");
if (mainStart < 0 || mainEnd < 0) {
  console.error("Could not find main on about page");
  process.exit(1);
}

const hero = `
<main class="main">
<section class="pricing-page-hero" aria-label="Pricing hero">
  <style>
    .pricing-page-hero{
      background: linear-gradient(180deg, #fae3e2 0%, var(--brand-secondary, #f8eee8) 100%);
      padding: clamp(5.5em, 10vw, 7.5em) 1.25em 2.5em;
      text-align: center;
      box-sizing: border-box;
    }
    .pricing-page-hero-inner{ width:min(900px,100%); margin:0 auto; }
    .pricing-page-kicker{
      font-family: var(--font-secondary), "Neuemontreal", sans-serif;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-weight: 600;
      font-size: .95em;
      color: #ff5400;
      margin-bottom: .85em;
    }
    .pricing-page-title{
      font-family: var(--font-primary), "Mdnichrometest", Impact, sans-serif;
      font-size: clamp(3rem, 8vw, 5.5rem);
      line-height: .92;
      letter-spacing: -.03em;
      margin: 0 0 .55em;
      color: #111;
    }
    .pricing-page-sub{
      font-family: var(--font-secondary), "Neuemontreal", sans-serif;
      font-size: clamp(1.05rem, 2vw, 1.25rem);
      font-weight: 500;
      line-height: 1.4;
      color: rgba(17,17,17,.72);
      max-width: 28em;
      margin: 0 auto;
    }
  </style>
  <div class="pricing-page-hero-inner">
    <div class="pricing-page-kicker">Pricing</div>
    <h1 class="pricing-page-title">Clear plans, no surprises</h1>
    <p class="pricing-page-sub">Pick a starting point for your logo or full brand system. Transparent scopes, orange-and-black honesty.</p>
  </div>
</section>
${pricingSection}
</main>`;

page = page.slice(0, mainStart) + hero + page.slice(mainEnd + "</main>".length);
page = addNavLinks(page);
page = addFooterLink(page);
// Mark current nav item
page = page.replace(
  '<a href="/pricing" class="navbar-link-btn w-inline-block"><div class="navlink-text">Pricing</div></a>',
  '<a href="/pricing" aria-current="page" class="navbar-link-btn w-inline-block w--current"><div class="navlink-text">Pricing</div></a>'
);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, page);
console.log("Created", path.relative(ROOT, OUT));

// Wire nav + footer across site
let updated = 0;
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "assets" || ent.name === "node_modules") continue;
      walk(p);
    } else if (ent.name.endsWith(".html")) {
      let html = fs.readFileSync(p, "utf8");
      const before = html;
      html = addNavLinks(html);
      html = addFooterLink(html);
      // homepage pricing CTA section: keep #pricing, also ok
      if (html !== before) {
        fs.writeFileSync(p, html);
        updated++;
        console.log("nav linked", path.relative(ROOT, p));
      }
    }
  }
}
walk(ROOT);
console.log("DONE pages updated", updated);
