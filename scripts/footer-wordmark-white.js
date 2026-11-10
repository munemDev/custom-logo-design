const fs = require("fs");
const path = require("path");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== "assets") walk(p, files);
    } else if (ent.name === "index.html") files.push(p);
  }
  return files;
}

const extra = `
.footer-svg-logo .brand-wordmark,
.footer-logo-wrap .footer-brand-wordmark{
  color:#fff !important;
  -webkit-text-fill-color:#fff !important;
  opacity:1 !important;
  mix-blend-mode:normal !important;
  font-size:clamp(3.5rem, 18vw, 12rem) !important;
  line-height:.85 !important;
  letter-spacing:-.04em !important;
  display:block !important;
  text-align:center !important;
  width:100% !important;
}
.footer-svg-logo{
  width:100% !important;
  overflow:visible !important;
}
`;

const root = path.join(__dirname, "..", "site");
for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("brand-wordmark-css")) continue;
  if (html.includes("footer-svg-logo .brand-wordmark")) {
    console.log("skip", path.relative(root, file));
    continue;
  }
  html = html.replace(
    'id="brand-wordmark-css">',
    'id="brand-wordmark-css">' + extra
  );
  fs.writeFileSync(file, html);
  console.log("patched", path.relative(root, file));
}
