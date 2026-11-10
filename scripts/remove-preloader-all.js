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

function extractDiv(html, startToken) {
  const start = html.indexOf(startToken);
  if (start < 0) return null;
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (/^<div\b/i.test(m[0])) depth++;
    else {
      depth--;
      if (depth === 0) return { start, end: m.index + m[0].length };
    }
  }
  return null;
}

const inject = `<style id="disable-preloader-css">
.loader,
[data-loader="two26"],
.logo-animation{
  display:none !important;
  visibility:hidden !important;
  opacity:0 !important;
  pointer-events:none !important;
  z-index:-1 !important;
}
body{ overflow:auto !important; }
</style>
<script id="disable-preloader-js">
(function(){
  window.__two26LoaderDone = true;
  document.documentElement.setAttribute("data-two26-loader-done","true");
  function done(){
    try{
      document.body && document.body.setAttribute("data-two26-loader-done","true");
      document.dispatchEvent(new CustomEvent("two26:loaderComplete"));
      document.querySelectorAll(".loader, [data-loader='two26']").forEach(function(loader){
        loader.style.display = "none";
        loader.style.pointerEvents = "none";
        loader.remove();
      });
    }catch(e){}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", done);
  } else {
    done();
  }
})();
</script>`;

let updated = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  html = html.replace(/<style id="disable-preloader-css">[\s\S]*?<\/style>/g, "");
  html = html.replace(/<script id="disable-preloader-js">[\s\S]*?<\/script>/g, "");

  if (html.includes("</head>")) {
    html = html.replace("</head>", inject + "</head>");
  }

  // remove all .loader blocks
  let removed = 0;
  while (html.includes('<div class="loader">')) {
    const block = extractDiv(html, '<div class="loader">');
    if (!block) break;
    html = html.slice(0, block.start) + html.slice(block.end);
    removed++;
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    updated++;
    console.log(
      "updated",
      path.relative(ROOT, file),
      "| loaders removed:",
      removed
    );
  }
}

console.log("DONE pages:", updated);

// verify
const still = [];
for (const file of walk(ROOT)) {
  const html = fs.readFileSync(file, "utf8");
  if (html.includes('<div class="loader">')) {
    still.push(path.relative(ROOT, file));
  }
}
console.log("pages still with .loader markup:", still.length ? still : "none");
