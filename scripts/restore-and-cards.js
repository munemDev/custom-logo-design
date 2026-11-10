const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..", "site");
const ORIGIN = "https://two26.studio";

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "*/*",
          },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            redirects < 8
          ) {
            res.resume();
            return resolve(
              fetchBuffer(new URL(res.headers.location, url).href, redirects + 1)
            );
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error("HTTP " + res.statusCode));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      )
      .on("error", reject);
  });
}

function pathsFor(assetUrl) {
  const clean = assetUrl.split("#")[0].split("?")[0];
  const u = new URL(clean);
  const host = u.host.replace(/\./g, "_");
  const decodedPath = decodeURIComponent(u.pathname).replace(/^\/+/, "");
  const encodedPath = u.pathname.replace(/^\/+/, "");
  const abs = path.join(ROOT, "assets", host, ...decodedPath.split("/"));
  const web =
    "/assets/" +
    host +
    "/" +
    encodedPath
      .split("/")
      .map((seg) => {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join("/");
  return { abs, web };
}

async function ensureAsset(url) {
  try {
    if (!url || url.includes(",") || /&quot/.test(url)) return null;
    const u = new URL(url.split("?")[0]);
    if (!u.pathname || u.pathname === "/") return null;
    const { abs, web } = pathsFor(url);
    if (!(fs.existsSync(abs) && fs.statSync(abs).size > 0)) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const buf = await fetchBuffer(url.split("?")[0]);
      fs.writeFileSync(abs, buf);
      console.log("  +", web, buf.length);
    }
    return web;
  } catch (e) {
    console.warn("  fail", String(url).slice(0, 120), e.message);
    return null;
  }
}

function collect(html, base) {
  const set = new Set();
  const re =
    /\b(href|src|poster|data-src|data-poster|srcset|data-video-urls)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const name = m[1].toLowerCase();
    const raw = m[2];
    let parts = [];
    if (name === "data-video-urls") parts = raw.split(",").map((s) => s.trim());
    else if (name === "srcset")
      parts = raw.split(",").map((s) => s.trim().split(/\s+/)[0]);
    else parts = [raw.trim()];
    for (const piece of parts) {
      if (!piece || /^(data:|mailto:|tel:|#|javascript:)/i.test(piece)) continue;
      try {
        const abs = new URL(piece, base).href;
        if (
          /cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.jsdelivr\.net/.test(
            abs
          )
        )
          set.add(abs.split("#")[0]);
      } catch {}
    }
  }
  return [...set];
}

function rewrite(html, urlMap) {
  let out = html;
  out = out.replace(/\s+integrity="[^"]*"/g, "");
  out = out.replace(
    /<link[^>]+href="https:\/\/cdn\.prod\.website-files\.com"[^>]*>/g,
    ""
  );
  out = out.split("https://two26.studio/").join("/");
  out = out.split("https://two26.studio").join("/");
  const keys = [...urlMap.keys()].sort((a, b) => b.length - a.length);
  for (const from of keys) {
    const to = urlMap.get(from);
    out = out.split(from).join(to);
    const noQ = from.split("?")[0];
    if (noQ !== from) out = out.split(noQ).join(to);
  }
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/([^"'>\s]+)/g,
    (_m, p) => pathsFor("https://cdn.prod.website-files.com/" + p).web
  );
  out = out.replace(
    /https:\/\/d3e54v103j8qbb\.cloudfront\.net\/([^"'>\s?]+)/g,
    (_m, p) => pathsFor("https://d3e54v103j8qbb.cloudfront.net/" + p).web
  );
  out = out.replace(
    /https:\/\/cdn\.jsdelivr\.net\/([^"'>\s]+)/g,
    (_m, p) => pathsFor("https://cdn.jsdelivr.net/" + p).web
  );
  out = out.replace(
    /(\/assets\/d3e54v103j8qbb_cloudfront_net\/js\/jquery-3\.5\.1\.min\.dc5e7f18c8\.js)\?[^"']+/g,
    "$1"
  );
  return out;
}

const RADIAL_SECTION = fs.readFileSync(
  path.join(__dirname, "_radial-section.html"),
  "utf8"
);

const RADIAL_CSS = `<style id="two26-radial-cards-css">
.section-radial-cards{--radial-bg:#0a0a0a;--radial-text:#f5f5f5;background:var(--radial-bg);color:var(--radial-text);position:relative;z-index:5}
.radial-cards-marquee{background:var(--radial-bg);color:var(--radial-text);padding:clamp(3rem,6vw,5rem) 0 clamp(4rem,8vw,7rem);overflow:hidden;min-height:100vh;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between}
.radial-cards-marquee__intro{max-width:920px;padding:0 clamp(1.25rem,4vw,2rem) 2rem}
.radial-cards-marquee__title{font-family:Neuemontreal,"Neue Montreal",sans-serif;font-weight:600;font-size:clamp(2.5rem,8vw,4.5rem);line-height:.95;letter-spacing:-.03em;margin:0 0 1rem;color:#fff}
.radial-cards-marquee__sub{font-family:Neuemontreal,"Neue Montreal",sans-serif;font-weight:600;font-size:clamp(1.1rem,2.4vw,1.6rem);line-height:1.25;margin:0;max-width:36ch;color:#fff}
.radial-cards-marquee__collection{position:relative;height:min(68vh,560px);display:flex;align-items:flex-end;overflow:visible;margin-top:auto}
.radial-cards-marquee__list{list-style:none;margin:0;padding:0 clamp(1.25rem,4vw,2rem);display:flex;gap:clamp(.85rem,1.5vw,1.25rem);width:max-content;will-change:transform;transform-origin:50% 1600px}
.radial-cards-marquee__item{flex:0 0 auto}
.radial-card{position:relative;width:min(78vw,315px);aspect-ratio:1/1;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;background:#1a1a1a;box-shadow:0 20px 50px rgba(0,0,0,.35)}
@media (min-width:1024px){.radial-card{width:420px}.radial-cards-marquee__collection{height:min(70vh,620px)}}
.radial-card__img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
.radial-card__logo-wrap{position:relative;z-index:1;padding:1.25rem}
.radial-card__logo{display:block;background:#fff;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:contain;mask-size:contain;-webkit-mask-position:left center;mask-position:left center}
.radial-card__copy{position:relative;z-index:1;padding:0 1.25rem 1.25rem}
.radial-card__copy p{margin:0;font-family:Neuemontreal,"Neue Montreal",sans-serif;font-weight:600;font-size:clamp(1.05rem,2vw,1.45rem);line-height:1.15;letter-spacing:-.02em;color:#f5f5f5}
.hero-video-loop,.hero-video-bg{display:none!important}
</style>`;

const RADIAL_JS = `<script id="two26-radial-cards-js">
(function(){
  function init(){
    if(typeof gsap==="undefined"||typeof ScrollTrigger==="undefined") return;
    gsap.registerPlugin(ScrollTrigger);
    var section=document.querySelector("[data-radial-cards-marquee]");
    var pin=document.querySelector("[data-radial-cards-marquee-pin]");
    var list=document.querySelector("[data-radial-cards-marquee-list]");
    if(!section||!pin||!list) return;
    if(section.getAttribute("data-radial-ready")==="1") return;
    section.setAttribute("data-radial-ready","1");

    var scroller=document.querySelector(".page")||undefined;
    function setOrigin(){
      var y=Math.max(window.innerHeight*2.15,1500);
      gsap.set(list,{transformOrigin:"50% "+y+"px"});
    }
    setOrigin();
    function travel(){
      return Math.max(list.scrollWidth-window.innerWidth+160, window.innerWidth*0.8);
    }
    gsap.set(list,{x:48,rotate:-10,force3D:true});
    gsap.timeline({
      scrollTrigger:{
        trigger:section,
        scroller:scroller,
        start:"top top",
        end:function(){return "+="+Math.max(window.innerHeight*2.8,2000);},
        pin:pin,
        scrub:0.65,
        anticipatePin:1,
        invalidateOnRefresh:true
      }
    }).to(list,{
      x:function(){return -travel();},
      rotate:10,
      ease:"none",
      duration:1
    },0);

    window.addEventListener("resize",function(){setOrigin();ScrollTrigger.refresh();});
    setTimeout(function(){ScrollTrigger.refresh();},500);
    window.addEventListener("load",function(){ScrollTrigger.refresh();});
  }
  function boot(){try{init();}catch(e){console.warn(e);}}
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
  window.addEventListener("two26:loader-done",function(){setTimeout(boot,80);});
  setTimeout(boot,1500);
})();
</script>`;

(async () => {
  console.log("Fetching homepage...");
  const raw = (await fetchBuffer(ORIGIN + "/")).toString("utf8");
  const assets = collect(raw, ORIGIN + "/");
  const urlMap = new Map();
  for (const a of assets) {
    const web = await ensureAsset(a);
    if (web) {
      urlMap.set(a, web);
      urlMap.set(a.split("?")[0], web);
    }
  }
  let html = rewrite(raw, urlMap);

  // Remove ONLY hero-video-loop block (precise)
  const hv = html.indexOf('<div class="hero-video-loop">');
  const after = html.indexOf('<div class="hero-path-svg-left">', hv);
  if (hv > -1 && after > hv) {
    html = html.slice(0, hv) + html.slice(after);
    console.log("removed hero video");
  } else {
    console.warn("hero video marker not found");
  }

  // Insert radial cards AFTER the about/intro section that ends before Selected Works
  // Prefer: after section that contains "Allergic to generic" / about pills, before Selected Works
  const selectedIdx = html.search(/Selected Works|selected-works|section-works/i);
  const allergicIdx = html.indexOf("Allergic to generic");
  let insertAt = -1;
  if (allergicIdx > -1) {
    const closeSection = html.indexOf("</section>", allergicIdx);
    if (closeSection > -1) insertAt = closeSection + "</section>".length;
  }
  if (insertAt < 0 && selectedIdx > -1) {
    // find previous </section>
    insertAt = html.lastIndexOf("</section>", selectedIdx);
    if (insertAt > -1) insertAt += "</section>".length;
  }
  if (insertAt < 0) {
    // fallback before footer-ish
    insertAt = html.lastIndexOf('<div class="section-works');
  }

  if (insertAt > -1) {
    html =
      html.slice(0, insertAt) +
      "\n" +
      RADIAL_SECTION +
      "\n" +
      html.slice(insertAt);
    console.log("inserted radial section at", insertAt);
  } else {
    console.warn("could not find insert point — appending before </body>");
    html = html.replace("</body>", RADIAL_SECTION + "</body>");
  }

  // Inject CSS + JS once near end of body (safe, no greedy replace)
  if (!html.includes('id="two26-radial-cards-css"')) {
    html = html.replace("</head>", RADIAL_CSS + "\n</head>");
  }
  if (!html.includes('id="two26-radial-cards-js"')) {
    html = html.replace("</body>", RADIAL_JS + "\n</body>");
  }

  const outPath = path.join(ROOT, "index.html");
  fs.writeFileSync(outPath, html);
  console.log("wrote", outPath, html.length);
  console.log({
    looking: html.includes("LOOKING SUSPICIOUSLY"),
    video: html.includes("hero-video-loop"),
    radial: html.includes("section-radial-cards"),
    selected: html.includes("Selected Works"),
    never: html.includes("Never one and done"),
  });
})();
