/**
 * Remove all Two26 / two26 traces from the site (HTML + text assets).
 * Renames code identifiers consistently so JS/CSS keep working.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");
const TEXT_EXTS = new Set([
  ".html",
  ".htm",
  ".js",
  ".css",
  ".json",
  ".svg",
  ".txt",
  ".xml",
  ".webmanifest",
]);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules") continue;
      walk(p, files);
    } else if (TEXT_EXTS.has(path.extname(ent.name).toLowerCase())) {
      files.push(p);
    }
  }
  return files;
}

function scrub(text) {
  let out = text;

  // Longer / specific first
  const pairs = [
    [/two26\.studio/gi, "logo-design"],
    [/hello@two26\.studio/gi, "hello@logodesign.com"],
    [/bogdan@two26\.studio/gi, "hello@logodesign.com"],
    [/diana@two26\.studio/gi, "hello@logodesign.com"],
    [/https:\/\/www\.instagram\.com\/two26_studio\//gi, "#"],
    [/https:\/\/www\.linkedin\.com\/company\/two26-studio\//gi, "#"],
    [/two26_studio/gi, "logo_design"],
    [/two26-studio/gi, "logo-design"],

    // Visible brand text
    [/Two26 Studio/g, "Logo Design"],
    [/TWO26 Studio/g, "Logo Design"],
    [/Two26 studio/g, "Logo Design"],
    [/Two26 Creative Studio/g, "Logo Design"],
    [/TWO26 Creative Studio/g, "Logo Design"],
    [/\bTwo 26\b/g, "Logo Design"],
    [/\bTWO 26\b/g, "Logo Design"],
    [/\bTwo26\b/g, "Logo Design"],
    [/\bTWO26\b/g, "Logo Design"],

    // JS function / event names (PascalCase)
    [/initTwo26/g, "initLogoDesign"],
    [/Two26TeamPopup/g, "LogoDesignTeamPopup"],
    [/Two26MobileSystem/g, "LogoDesignMobileSystem"],
    [/Two26ContactModal/g, "LogoDesignContactModal"],
    [/Two26FooterAnimation/g, "LogoDesignFooterAnimation"],
    [/Two26/g, "LogoDesign"],

    // identifiers / attrs / classes
    [/__two26/g, "__logoDesign"],
    [/data-two26/g, "data-logo-design"],
    [/data-loader="two26"/g, 'data-loader="logo-design"'],
    [/data-loader='two26'/g, "data-loader='logo-design'"],
    [/two26:loaderComplete/g, "logo-design:loaderComplete"],
    [/\.two26-/g, ".logo-design-"],
    [/class="two26-/g, 'class="logo-design-'],
    [/class='two26-/g, "class='logo-design-"],
    [/two26-nav-toggle-btn/g, "logo-design-nav-toggle-btn"],
    [/two26-toggle-svg/g, "logo-design-toggle-svg"],
    [/two26-toggle-btn/g, "logo-design-toggle-btn"],
    [/\[data-loader="two26"\]/g, '[data-loader="logo-design"]'],
    [/\[data-loader='two26'\]/g, "[data-loader='logo-design']"],

    // leftover lowercase token (comments, strings, etc.)
    [/two26/gi, "logo-design"],
  ];

  for (const [re, rep] of pairs) out = out.replace(re, rep);
  return out;
}

const files = walk(ROOT);
let changed = 0;
let hits = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  if (!/two26|Two26|TWO26|Two 26|TWO 26/i.test(before)) continue;
  const count = (before.match(/two26|Two26|TWO26|Two 26|TWO 26/gi) || []).length;
  const after = scrub(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    hits += count;
    console.log("scrubbed", path.relative(ROOT, file), "hits~", count);
  }
}

// verify
let remaining = 0;
const leftovers = [];
for (const file of walk(ROOT)) {
  const t = fs.readFileSync(file, "utf8");
  const m = t.match(/two26|Two 26|TWO 26/gi);
  if (m) {
    remaining += m.length;
    leftovers.push(path.relative(ROOT, file) + ":" + m.length);
  }
}

console.log("DONE files", changed, "approxHits", hits);
console.log("remaining", remaining, leftovers.slice(0, 20));
