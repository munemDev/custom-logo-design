const fs = require("fs");
const path = require("path");

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

const TEXT_LOGO = "Logo Design";

function rebrand(html) {
  let out = html;

  // Meta / titles / visible brand phrases (order matters: longer first)
  const pairs = [
    [/Two26 Studio \| Boutique Design Studio/g, "Logo Design | Boutique Design Studio"],
    [/About Us - Two26 Studio \| Boutique Design Studio/g, "About Us - Logo Design | Boutique Design Studio"],
    [/Work - Two26 Studio \| Boutique Design Studio/g, "Work - Logo Design | Boutique Design Studio"],
    [/Work — Two26 Creative Studio/g, "Work — Logo Design"],
    [/Two26 Creative Studio/g, "Logo Design"],
    [/Two26 Studio/g, "Logo Design"],
    [/Two26 studio/g, "Logo Design"],
    [/TWO26 Studio/g, "Logo Design"],
    [/© Copyright 2026 - Two26 Studio/g, "© Copyright 2026 - Logo Design"],
    [/© Copyright 2026 - Two26/g, "© Copyright 2026 - Logo Design"],
    [/Working with Two26/g, "Working with Logo Design"],
    [/employed by Two26/g, "employed by Logo Design"],
    [/Hey Two26!/g, "Hey Logo Design!"],
    [/Hey%20Two26!/g, "Hey%20Logo%20Design!"],
    // brand mentions in body copy
    [/\bTwo26\b/g, "Logo Design"],
    [/\bTWO26\b/g, "Logo Design"],
    [/TWO 26/g, "Logo Design"],
    [/Two 26/g, "Logo Design"],
  ];

  for (const [re, rep] of pairs) out = out.replace(re, rep);

  // domain attribute / emails — brand-facing only
  out = out.replace(/data-wf-domain="two26\.studio"/g, 'data-wf-domain="logo-design"');
  out = out.replace(/bogdan@two26\.studio/g, "hello@logodesign.com");
  out = out.replace(/diana@two26\.studio/g, "hello@logodesign.com");

  // Social hrefs — neutralize Two26 profiles (keep # or generic)
  out = out.replace(
    /https:\/\/www\.instagram\.com\/two26_studio\//g,
    "#"
  );
  out = out.replace(
    /https:\/\/www\.linkedin\.com\/company\/two26-studio\//g,
    "#"
  );
  out = out.replace(
    /https:\/\/www\.instagram\.com\/bogdan\.apalaghiei\//g,
    "#"
  );
  out = out.replace(
    /https:\/\/www\.instagram\.com\/diana_apalaghiei08\//g,
    "#"
  );
  out = out.replace(
    /https:\/\/www\.linkedin\.com\/in\/bogdan-apalaghiei-[^"']+/g,
    "#"
  );
  out = out.replace(
    /https:\/\/www\.linkedin\.com\/in\/diana-apalaghiei-[^"']+/g,
    "#"
  );
  out = out.replace(
    /https:\/\/www\.linkedin\.com\/in\/andreea-liche-[^"']+/g,
    "#"
  );

  // Replace navbar / footer logo SVG blocks with text wordmark
  // Common wrappers: .logo-svg, .footer-svg-logo, navbar brand link content
  out = out.replace(
    /(<a[^>]*class="[^"]*navbar-logo[^"]*"[^>]*>)([\s\S]*?)(<\/a>)/gi,
    `$1<span class="brand-wordmark">${TEXT_LOGO}</span>$3`
  );

  // footer logo wrap
  out = out.replace(
    /(<div class="footer-svg-logo[^"]*"[^>]*>)[\s\S]*?(<\/div>)/i,
    `$1<span class="brand-wordmark footer-brand-wordmark">${TEXT_LOGO}</span>$2`
  );

  // generic logo-svg inside header brand if present
  out = out.replace(
    /(<div class="logo-svg[^"]*"[^>]*>)[\s\S]*?(<\/div>)/gi,
    `$1<span class="brand-wordmark">${TEXT_LOGO}</span>$2`
  );

  // Inject brand wordmark CSS once
  if (!out.includes("id=\"brand-wordmark-css\"")) {
    const css = `<style id="brand-wordmark-css">
.brand-wordmark{
  font-family: var(--font-primary), "Mdnichrometest", Impact, sans-serif;
  font-weight: 700;
  font-size: clamp(1.25rem, 2.2vw, 1.85rem);
  letter-spacing: -0.02em;
  text-transform: uppercase;
  color: #ff5400;
  line-height: 1;
  white-space: nowrap;
  display: inline-block;
}
.footer-brand-wordmark{
  font-size: clamp(2rem, 8vw, 5.5rem);
  color: #ff5400;
  width: 100%;
}
a.navbar-logo, .navbar-logo{ text-decoration:none; }
</style>`;
    out = out.replace("</head>", css + "</head>");
  }

  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const before = fs.readFileSync(file, "utf8");
  const after = rebrand(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log("updated", path.relative(ROOT, file));
  }
}
console.log("files updated:", changed);

// quick leftover visible check
const leftovers = [];
for (const file of walk(ROOT)) {
  const html = fs.readFileSync(file, "utf8");
  // ignore JS identifiers containing two26
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  if (/Two\s*26|TWO\s*26|Two26 Studio|two26\.studio/i.test(visible)) {
    const m = visible.match(/Two\s*26|TWO\s*26|Two26|two26\.studio/gi) || [];
    leftovers.push({
      file: path.relative(ROOT, file),
      samples: [...new Set(m)].slice(0, 10),
    });
  }
}
console.log("visible leftovers:", JSON.stringify(leftovers, null, 2));
