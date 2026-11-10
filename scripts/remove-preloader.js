const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

// 1) Inject CSS + instant-complete script in head (idempotent)
html = html.replace(
  /<style id="disable-preloader-css">[\s\S]*?<\/style>/g,
  ""
);
html = html.replace(
  /<script id="disable-preloader-js">[\s\S]*?<\/script>/g,
  ""
);

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
      var loader = document.querySelector(".loader, [data-loader='two26']");
      if (loader) {
        loader.style.display = "none";
        loader.style.pointerEvents = "none";
        loader.remove();
      }
    }catch(e){}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", done);
  } else {
    done();
  }
})();
</script>`;

if (!html.includes('id="disable-preloader-css"')) {
  html = html.replace("</head>", inject + "</head>");
}

// 2) Also strip the loader markup block if present (keeps page lighter)
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
      if (depth === 0) {
        return { start, end: m.index + m[0].length };
      }
    }
  }
  return null;
}

const block = extractDiv(html, '<div class="loader">');
if (block) {
  html = html.slice(0, block.start) + html.slice(block.end);
  console.log("Removed .loader HTML block");
} else {
  console.log("No .loader block found (already removed?)");
}

fs.writeFileSync(file, html);
console.log("Preloader disabled.");
console.log("has loader class?", html.includes('class="loader"'));
console.log("has disable css?", html.includes("disable-preloader-css"));
