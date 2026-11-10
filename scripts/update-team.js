const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { execSync } = require("child_process");

const ABOUT = path.join(__dirname, "..", "site", "about", "index.html");
const ASSET_DIR = path.join(
  __dirname,
  "..",
  "site",
  "assets",
  "cdn_prod_website-files_com",
  "6aaad679fdb9d914f7f52049"
);
const GEN_DIR = path.join(__dirname, "..", "site", "assets", "generated", "team");
fs.mkdirSync(GEN_DIR, { recursive: true });

const TEAM = [
  {
    oldFull: "Bogdan Apalaghiei",
    oldFirst: "Bogdan",
    newFull: "Aarav Shah",
    newFirst: "Aarav",
    role: "Creative Partner",
    fileStem: "6aab88903c3c3f8712202e83_Bogdan",
    genFile: "team-aarav.jpg",
    // professional male portrait
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&h=1500&q=85",
  },
  {
    oldFull: "Diana Apalaghiei",
    oldFirst: "Diana",
    newFull: "Zara Malik",
    newFirst: "Zara",
    role: "Creative Partner",
    fileStem: "6aab88976923953fa9087814_Diana",
    genFile: "team-zara.jpg",
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&h=1500&q=85",
  },
  {
    oldFull: "Andreea Liche",
    oldFirst: "Andreea",
    newFull: "Nora Iqbal",
    newFirst: "Nora",
    role: "Jr. Designer",
    fileStem: "6ab3e67aac479e9ad46b7618_Andreea 2 copy",
    genFile: "team-nora.jpg",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&h=1500&q=85",
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    lib
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            res.resume();
            return resolve(download(res.headers.location, dest));
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error("HTTP " + res.statusCode));
          }
          res.pipe(file);
          file.on("finish", () => file.close(() => resolve(dest)));
        }
      )
      .on("error", (e) => {
        try {
          fs.unlinkSync(dest);
        } catch (_) {}
        reject(e);
      });
  });
}

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

(async () => {
  // 1) Download new portraits
  for (const t of TEAM) {
    const dest = path.join(GEN_DIR, t.genFile);
    process.stdout.write("Downloading " + t.newFull + "... ");
    await download(t.url, dest);
    console.log(fs.statSync(dest).size + " bytes");
    t.webPath = "/assets/generated/team/" + t.genFile;
  }

  // 2) Also copy over original avif names as jpg so any leftover refs work better
  // Prefer HTML rewrite to new paths + strip srcset

  let html = fs.readFileSync(ABOUT, "utf8");

  // Hero founded line
  html = replaceAll(
    html,
    "Founded in Bucharest by Bogdan and Diana Apalaghiei",
    "Founded by Aarav Shah and Zara Malik"
  );

  for (const t of TEAM) {
    html = replaceAll(html, t.oldFull, t.newFull);

    // Replace main image src pointing at old stem
    // Match any src that contains the fileStem
    const srcRe = new RegExp(
      'src="/assets/cdn_prod_website-files_com/6aaad679fdb9d914f7f52049/' +
        t.fileStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        '\\.avif"',
      "g"
    );
    html = html.replace(srcRe, 'src="' + t.webPath + '"');

    // Remove srcset blocks that reference this stem (so browser uses new src)
    const srcsetRe = new RegExp(
      '\\s+srcset="[^"]*' +
        t.fileStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        '[^"]*"',
      "g"
    );
    html = html.replace(srcsetRe, "");

    // Any remaining path containing stem -> new path
    const anyPath = new RegExp(
      "/assets/cdn_prod_website-files_com/6aaad679fdb9d914f7f52049/" +
        t.fileStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "[^\"\\s]*",
      "g"
    );
    html = html.replace(anyPath, t.webPath);
  }

  // Cleanup leftover surnames in odd places
  html = replaceAll(html, " Apalaghiei", "");
  html = replaceAll(html, "Apalaghiei", "");
  html = replaceAll(html, " Liche", "");
  html = replaceAll(html, "Liche", "");

  fs.writeFileSync(ABOUT, html);
  console.log("Updated about/index.html");

  // 3) Sitewide name sweep
  const siteRoot = path.join(__dirname, "..", "site");
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "assets" || ent.name === "node_modules") continue;
        walk(p);
      } else if (/\.html?$/i.test(ent.name)) {
        let t = fs.readFileSync(p, "utf8");
        const before = t;
        t = replaceAll(t, "Bogdan Apalaghiei", "Aarav Shah");
        t = replaceAll(t, "Diana Apalaghiei", "Zara Malik");
        t = replaceAll(t, "Andreea Liche", "Nora Iqbal");
        t = replaceAll(
          t,
          "Founded in Bucharest by Bogdan and Diana Apalaghiei",
          "Founded by Aarav Shah and Zara Malik"
        );
        t = replaceAll(t, "Bogdan and Diana Apalaghiei", "Aarav Shah and Zara Malik");
        t = replaceAll(t, "Bogdan and Diana", "Aarav and Zara");
        if (t !== before) {
          fs.writeFileSync(p, t);
          console.log("names updated:", path.relative(siteRoot, p));
        }
      }
    }
  }
  walk(siteRoot);

  // Verify
  const verify = fs.readFileSync(ABOUT, "utf8");
  console.log("Remaining old names?", {
    Bogdan: /Bogdan/i.test(verify),
    Diana: /Diana Apalaghiei|Diana(?! )/i.test(verify) && verify.includes("Diana"),
    Andreea: /Andreea/i.test(verify),
  });
  const cards = [
    ...verify.matchAll(
      /<div class="team-card">[\s\S]*?<img src="([^"]+)"[\s\S]*?<div class="team-name">([^<]+)<\/div>/g
    ),
  ].map((m) => ({ src: m[1], name: m[2] }));
  console.log("cards:", cards);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
