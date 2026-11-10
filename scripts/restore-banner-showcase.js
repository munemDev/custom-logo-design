const fs = require("fs");
const path = require("path");
const https = require("https");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve(Buffer.concat(chunks).toString("utf8"))
          );
        }
      )
      .on("error", reject);
  });
}

function extractSection(html, startToken) {
  const start = html.indexOf(startToken);
  if (start < 0) return null;
  const re = /<\/?section\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (/^<section\b/i.test(m[0])) depth++;
    else {
      depth--;
      if (depth === 0) {
        return html.slice(start, m.index + m[0].length);
      }
    }
  }
  return null;
}

function rewriteCdn(s) {
  return s
    .replace(
      /https:\/\/cdn\.prod\.website-files\.com\//g,
      "/assets/cdn_prod_website-files_com/"
    )
    .replace(
      /https:\/\/d3e54v103j8qbb\.cloudfront\.net\//g,
      "/assets/d3e54v103j8qbb_cloudfront_net/"
    )
    .replace(
      /https:\/\/cdn\.jsdelivr\.net\//g,
      "/assets/cdn_jsdelivr_net/"
    )
    .replace(/https:\/\/two26\.studio\//g, "/")
    .replace(/\s+integrity="[^"]*"/g, "");
}

(async () => {
  // Clean any leftover
  html = html.replace(
    /<style id="hero-banner-showcase-css">[\s\S]*?<\/style>/g,
    ""
  );
  while (html.includes('<div class="hero-banner-showcase">')) {
    const start = html.indexOf('<div class="hero-banner-showcase">');
    const re = /<\/?div\b[^>]*>/gi;
    re.lastIndex = start;
    let depth = 0;
    let end = -1;
    let m;
    while ((m = re.exec(html))) {
      if (/^<div\b/i.test(m[0])) depth++;
      else {
        depth--;
        if (depth === 0) {
          end = m.index + m[0].length;
          break;
        }
      }
    }
    if (end < 0) break;
    html = html.slice(0, start) + html.slice(end);
  }

  const live = await fetchText("https://two26.studio/");
  let section = extractSection(
    live,
    '<section data-marquee-speed="3" class="section-slider-showcase">'
  );
  if (!section) {
    console.error("live showcase not found");
    process.exit(1);
  }
  section = rewriteCdn(section);
  section = section.replace(
    'class="section-slider-showcase"',
    'class="section-slider-showcase hero-inline-showcase"'
  );

  const heroTextStart = html.indexOf('<div class="hero-text">');
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = heroTextStart;
  let depth = 0;
  let heroTextEnd = -1;
  let m;
  while ((m = re.exec(html))) {
    if (/^<div\b/i.test(m[0])) depth++;
    else {
      depth--;
      if (depth === 0) {
        heroTextEnd = m.index + m[0].length;
        break;
      }
    }
  }

  const style = `<style id="hero-banner-showcase-css">
.hero-banner-showcase{width:100%;max-width:100%;margin-top:1.5em;margin-bottom:2em;position:relative;z-index:5}
.hero-banner-showcase .section-slider-showcase.hero-inline-showcase{padding-top:0!important;padding-bottom:2em!important;width:100%}
.hero-banner-showcase .showcase-slide{width:min(22em,70vw);height:min(22em,70vw)}
@media (max-width:767px){.hero-banner-showcase .showcase-slide{width:16em;height:16em}}
</style>`;

  const insert = `<div class="hero-banner-showcase">${section}</div>`;
  html = html.slice(0, heroTextEnd) + insert + html.slice(heroTextEnd);
  if (!html.includes('id="hero-banner-showcase-css"')) {
    html = html.replace("</head>", style + "</head>");
  }

  // Ensure NO mid-page duplicate outside hero
  // (we only inserted inside hero, live fetch isn't added mid-page)
  fs.writeFileSync(file, html);
  console.log("restored showcase into banner only");
  console.log(
    "hero-banner-showcase",
    html.includes("hero-banner-showcase")
  );
  console.log(
    "section count",
    (html.match(/section-slider-showcase/g) || []).length
  );
})();
