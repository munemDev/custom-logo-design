const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "site", "index.html");
let html = fs.readFileSync(file, "utf8");

// 1) Remove hero video loop (banner character video)
const videoRe =
  /<div class="hero-video-loop">[\s\S]*?<\/div><\/div>(?=<div class="hero-path-svg-left">)/;
if (videoRe.test(html)) {
  html = html.replace(videoRe, "");
  console.log("removed hero-video-loop");
} else {
  // fallback: simpler match
  const start = html.indexOf('<div class="hero-video-loop">');
  const end = html.indexOf('<div class="hero-path-svg-left">', start);
  if (start > -1 && end > start) {
    html = html.slice(0, start) + html.slice(end);
    console.log("removed hero-video-loop (fallback)");
  } else {
    console.warn("hero-video-loop not found");
  }
}

// Hide empty hero-video area if class leftover styles need space collapse
const heroFixCss = `
<style id="two26-banner-cards-fix">
  /* Banner video removed — collapse leftover video shell */
  .hero-video-loop,
  .hero-video-bg { display: none !important; }

  .section-radial-cards {
    --radial-bg: #0a0a0a;
    --radial-text: #f5f5f5;
    background: var(--radial-bg);
    color: var(--radial-text);
    position: relative;
    z-index: 5;
  }
  .radial-cards-marquee {
    background: var(--radial-bg);
    color: var(--radial-text);
    padding: clamp(3rem, 6vw, 5rem) 0 clamp(4rem, 8vw, 7rem);
    overflow: hidden;
    min-height: 100vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .radial-cards-marquee__intro {
    max-width: 920px;
    padding: 0 clamp(1.25rem, 4vw, 2rem) 2rem;
  }
  .radial-cards-marquee__title {
    font-family: Neuemontreal, "Neue Montreal", sans-serif;
    font-weight: 600;
    font-size: clamp(2.5rem, 8vw, 4.5rem);
    line-height: 0.95;
    letter-spacing: -0.03em;
    margin: 0 0 1rem;
    color: #fff;
  }
  .radial-cards-marquee__sub {
    font-family: Neuemontreal, "Neue Montreal", sans-serif;
    font-weight: 600;
    font-size: clamp(1.1rem, 2.4vw, 1.6rem);
    line-height: 1.25;
    margin: 0;
    max-width: 36ch;
    color: #fff;
  }
  .radial-cards-marquee__collection {
    position: relative;
    height: min(68vh, 560px);
    display: flex;
    align-items: flex-end;
    overflow: visible;
    margin-top: auto;
  }
  .radial-cards-marquee__list {
    list-style: none;
    margin: 0;
    padding: 0 clamp(1.25rem, 4vw, 2rem);
    display: flex;
    gap: clamp(0.85rem, 1.5vw, 1.25rem);
    width: max-content;
    will-change: transform;
    transform-origin: 50% 1600px;
  }
  .radial-cards-marquee__item {
    flex: 0 0 auto;
  }
  .radial-card {
    position: relative;
    width: min(78vw, 315px);
    aspect-ratio: 1 / 1;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #1a1a1a;
    box-shadow: 0 20px 50px rgba(0,0,0,0.35);
  }
  @media (min-width: 1024px) {
    .radial-card { width: 420px; }
    .radial-cards-marquee__collection { height: min(70vh, 620px); }
  }
  .radial-card__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
  .radial-card__logo-wrap {
    position: relative;
    z-index: 1;
    padding: 1.25rem;
  }
  .radial-card__logo {
    display: block;
    background: #fff;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: left center;
    mask-position: left center;
  }
  .radial-card__copy {
    position: relative;
    z-index: 1;
    padding: 0 1.25rem 1.25rem;
  }
  .radial-card__copy p {
    margin: 0;
    font-family: Neuemontreal, "Neue Montreal", sans-serif;
    font-weight: 600;
    font-size: clamp(1.05rem, 2vw, 1.45rem);
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #f5f5f5;
  }
</style>
`;

const heroFixJs = `
<script id="two26-radial-cards-scroll">
(function () {
  function initRadialCardsMarquee() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const section = document.querySelector("[data-radial-cards-marquee]");
    const pin = document.querySelector("[data-radial-cards-marquee-pin]");
    const list = document.querySelector("[data-radial-cards-marquee-list]");
    if (!section || !pin || !list) return;

    // kill previous instance if hot-reloaded
    ScrollTrigger.getAll().forEach(function (st) {
      if (st.trigger === section || st.vars && st.vars.trigger === section) st.kill();
    });

    const scrollerEl = document.querySelector(".page");
    const scroller = scrollerEl || undefined;
    const items = list.querySelectorAll(".radial-cards-marquee__item");
    if (!items.length) return;

    function setOrigin() {
      const originY = Math.max(window.innerHeight * 2.15, 1500);
      gsap.set(list, { transformOrigin: "50% " + originY + "px" });
    }
    setOrigin();

    function travel() {
      return Math.max(list.scrollWidth - window.innerWidth + 160, window.innerWidth * 0.8);
    }

    gsap.set(list, { x: 48, rotate: -10, force3D: true });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        scroller: scroller,
        start: "top top",
        end: function () { return "+=" + Math.max(window.innerHeight * 2.8, 2000); },
        pin: pin,
        scrub: 0.65,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.to(list, {
      x: function () { return -travel(); },
      rotate: 10,
      ease: "none",
      duration: 1,
    }, 0);

    window.addEventListener("resize", function () {
      setOrigin();
      ScrollTrigger.refresh();
    });

    // Lenis / late layout
    setTimeout(function () { ScrollTrigger.refresh(); }, 400);
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  function boot() {
    try { initRadialCardsMarquee(); } catch (e) { console.warn("[radial-cards]", e); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // After Two26 loader if it fires
  window.addEventListener("two26:loader-done", function () {
    setTimeout(boot, 50);
  });
  setTimeout(boot, 1400);
})();
</script>
`;

// Replace existing radial style block if present, else inject before </head> or before radial section
if (/<style[^>]*>[\s\S]*?\.section-radial-cards[\s\S]*?<\/style>/.test(html)) {
  html = html.replace(
    /<style[^>]*>[\s\S]*?\.section-radial-cards[\s\S]*?<\/style>/,
    heroFixCss
  );
  console.log("replaced radial style");
} else {
  html = html.replace(
    '<section class="section-radial-cards"',
    heroFixCss + '\n<section class="section-radial-cards"'
  );
  console.log("injected radial style");
}

// Replace existing radial script
if (/<script[^>]*>[\s\S]*?initRadialCardsMarquee[\s\S]*?<\/script>/.test(html)) {
  html = html.replace(
    /<script[^>]*>[\s\S]*?initRadialCardsMarquee[\s\S]*?<\/script>/,
    heroFixJs
  );
  console.log("replaced radial script");
} else if (html.includes('id="two26-radial-cards-scroll"')) {
  html = html.replace(
    /<script id="two26-radial-cards-scroll">[\s\S]*?<\/script>/,
    heroFixJs
  );
  console.log("replaced named radial script");
} else {
  html = html.replace("</body>", heroFixJs + "\n</body>");
  console.log("injected radial script before </body>");
}

// Also strip any leftover empty hero-video-loop
html = html.replace(/<div class="hero-video-loop">\s*<\/div>/g, "");

fs.writeFileSync(file, html);
console.log("done", file, "bytes", html.length);
console.log("still has video loop?", html.includes("hero-video-loop"));
console.log("has radial section?", html.includes("section-radial-cards"));
