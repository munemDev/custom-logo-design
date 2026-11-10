const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "site");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".html")) files.push(p);
  }
  return files;
}

for (const file of walk(root)) {
  let text = fs.readFileSync(file, "utf8");
  const before = text;

  text = text.split("/./assets/").join("/assets/");

  text = text.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/([^"'>\s]+(?: [^"'>\s]+)*)/g,
    (_m, p) => "/assets/cdn_prod_website-files_com/" + decodeURIComponent(p)
  );

  text = text
    .split("https://cdn.prod.website-files.com%2F")
    .join("/assets/cdn_prod_website-files_com/");

  if (text !== before) {
    fs.writeFileSync(file, text);
    console.log("patched", path.relative(root, file));
  }
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = (html.match(/href="([^"]+\.css)"/) || [])[1];
const videos = [...html.matchAll(/data-video-urls="([^"]+)"/g)].map((m) => m[1]);
console.log("css", css);
console.log("videos", videos);
console.log(
  "remote leftovers",
  (html.match(/https:\/\/cdn\.prod/g) || []).length
);
