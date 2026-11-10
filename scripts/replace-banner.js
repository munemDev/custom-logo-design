const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..", "site");
const htmlPath = path.join(ROOT, "index.html");

const CARDS = [
  {
    img: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/bltebfc01af30e81f94/6a85e7350c407b71e5d34856/Google_Card.jpg?width=1200&quality=75&auto=webp",
    logo: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/bltee444e4dcb0c53e3/6a7ed3f9dcb4376c8b2d1214/Google-horizontal.svg",
    logoW: 120,
    logoH: 40,
    text: "14 years. Multiple businesses. Constant reinvention.",
    file: "google-card.jpg",
    logoFile: "google-logo.svg",
  },
  {
    img: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/bltfb6138cf0ee2a186/6a7ef19c1f7b5a9926790f2c/Hublot.png?width=1200&quality=75&auto=webp",
    logo: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt4e3ef1ea9fb590ec/6a7ef1c2b59102f66deecab1/Client_hublot-alt_Size_80x80.svg",
    logoW: 56,
    logoH: 56,
    text: "Disrupting tradition with a new digital brand expression.",
    file: "hublot-card.png",
    logoFile: "hublot-logo.svg",
  },
  {
    img: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt231eb6e589640f05/6a7eed7fafd7db6a1552b55e/Link_logistics.png?width=1200&quality=75&auto=webp",
    logo: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt19cca918b2196435/6a7eed8af6ab87d054d167f2/link_logistics_logo_white.png",
    logoW: 100,
    logoH: 40,
    text: "Enabling a suite of intelligent digital products.",
    file: "link-card.png",
    logoFile: "link-logo.png",
  },
  {
    img: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/bltcba69aac545aa557/6a848ce0386ac332ebade362/big-green-egg-work-mobile.png?width=1200&quality=75&auto=webp",
    logo: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt2900832f3dbe7912/6a85ed64d4aaa7801b7ee28f/BGE-Logo_vert_dark-BG_1_xrmg0i.png",
    logoW: 72,
    logoH: 72,
    text: "Composable commerce for a luxury BBQ brand.",
    file: "bge-card.png",
    logoFile: "bge-logo.png",
  },
  {
    img: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/bltb0b28d36f9e160d4/6a85eefada6aea4de437905c/compass_pathways.jpg?width=1200&quality=75&auto=webp",
    logo: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt037d9c3680a4799d/6a85efb2b68951cbcda26310/Compass_Pathways_Logo.png",
    logoW: 120,
    logoH: 40,
    text: "Building a brand that can carry the weight of clinical science.",
    file: "compass-card.jpg",
    logoFile: "compass-logo.png",
  },
  {
    img: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/bltaa5998163ac858cb/6a8c27111eb9e56b3f2c4b09/PS2.png?width=1200&quality=75&auto=webp",
    logo: "https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt098f9314b94e2fd2/6a7ef2cf1f7b5a8410790f35/PS.svg",
    logoW: 56,
    logoH: 40,
    text: "Engaging gamer audiences for blockbuster releases.",
    file: "ps-card.png",
    logoFile: "ps-logo.svg",
  },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "*/*",
            Referer: "https://www.hugeinc.com/",
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return resolve(fetchBuffer(new URL(res.headers.location, url).href));
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error("HTTP " + res.statusCode + " " + url));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      )
      .on("error", reject);
  });
}

async function downloadAssets() {
  const dir = path.join(ROOT, "assets", "huge-cards");
  fs.mkdirSync(dir, { recursive: true });
  for (const c of CARDS) {
    for (const [url, file] of [
      [c.img, c.file],
      [c.logo, c.logoFile],
    ]) {
      const abs = path.join(dir, file);
      if (fs.existsSync(abs) && fs.statSync(abs).size > 0) continue;
      try {
        const buf = await fetchBuffer(url);
        fs.writeFileSync(abs, buf);
        console.log("saved", file, buf.length);
      } catch (e) {
        console.warn("fail", file, e.message);
      }
    }
  }
}

function buildSection() {
  const items = CARDS.map(
    (c) => `
      <li class="radial-cards-marquee__item">
        <article class="radial-card">
          <img class="radial-card__img" src="/assets/huge-cards/${c.file}" alt="" loading="lazy" />
          <div class="radial-card__logo-wrap">
            <span class="radial-card__logo" style="width:${c.logoW}px;height:${c.logoH}px;-webkit-mask-image:url('/assets/huge-cards/${c.logoFile}');mask-image:url('/assets/huge-cards/${c.logoFile}');"></span>
          </div>
          <div class="radial-card__copy">
            <p>${c.text}</p>
          </div>
        </article>
      </li>`
  ).join("");

  return `
<section class="section-radial-cards" data-radial-cards-marquee="true" aria-label="Partnerships.">
  <div class="radial-cards-marquee" data-radial-cards-marquee-pin="true">
    <div class="radial-cards-marquee__intro">
      <h2 class="radial-cards-marquee__title">Never one and done.</h2>
      <p class="radial-cards-marquee__sub">We co-create the future with our clients, measure the impact and do it again.</p>
    </div>
    <div class="radial-cards-marquee__collection">
      <ul class="radial-cards-marquee__list" data-radial-cards-marquee-list="true">
        ${items}
      </ul>
    </div>
  </div>
</section>

<style>
  .section-radial-cards {
    --radial-bg: #0a0a0a;
    --radial-text: #f5f5f5;
    background: var(--radial-bg);
    color: var(--radial-text);
    position: relative;
    z-index: 2;
  }
  .radial-cards-marquee {
    background: var(--radial-bg);
    color: var(--radial-text);
    padding: 4rem 0 6rem;
    overflow: hidden;
    min-height: 100vh;
    box-sizing: border-box;
  }
  .radial-cards-marquee__intro {
    max-width: 920px;
    padding: 0 1.5rem 2.5rem;
  }
  .radial-cards-marquee__title {
    font-family: Neuemontreal, Neue Montreal, sans-serif;
    font-weight: 600;
    font-size: clamp(2.5rem, 8vw, 4.5rem);
    line-height: 0.95;
    letter-spacing: -0.03em;
    margin: 0 0 1rem;
    color: #fff;
  }
  .radial-cards-marquee__sub {
    font-family: Neuemontreal, Neue Montreal, sans-serif;
    font-weight: 600;
    font-size: clamp(1.1rem, 2.4vw, 1.6rem);
    line-height: 1.25;
    margin: 0;
    max-width: 36ch;
    color: #fff;
  }
  .radial-cards-marquee__collection {
    position: relative;
    height: min(70vh, 560px);
    display: flex;
    align-items: flex-end;
    overflow: visible;
  }
  .radial-cards-marquee__list {
    list-style: none;
    margin: 0;
    padding: 0 1.5rem;
    display: flex;
    gap: 1.25rem;
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
  }
  @media (min-width: 1024px) {
    .radial-card { width: 420px; }
    .radial-cards-marquee__collection { height: min(72vh, 640px); }
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
    font-family: Neuemontreal, Neue Montreal, sans-serif;
    font-weight: 600;
    font-size: clamp(1.05rem, 2vw, 1.45rem);
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #f5f5f5;
    text-wrap: balance;
  }
</style>

<script>
(function () {
  function initRadialCardsMarquee() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const section = document.querySelector("[data-radial-cards-marquee]");
    const pin = document.querySelector("[data-radial-cards-marquee-pin]");
    const list = document.querySelector("[data-radial-cards-marquee-list]");
    if (!section || !pin || !list) return;
    if (section.dataset.radialInit === "true") return;
    section.dataset.radialInit = "true";

    const scroller = document.querySelector(".page") || undefined;
    const items = list.querySelectorAll(".radial-cards-marquee__item");
    if (!items.length) return;

    // Arc origin below the row so cards tilt as list rotates
    const setOrigin = () => {
      const originY = Math.max(window.innerHeight * 2.1, 1400);
      list.style.transformOrigin = "50% " + originY + "px";
    };
    setOrigin();

    const totalScroll = () => Math.max(window.innerHeight * 2.6, 1800);

    gsap.set(list, { rotate: -8 });

    ScrollTrigger.create({
      trigger: section,
      scroller: scroller,
      start: "top top",
      end: () => "+=" + totalScroll(),
      pin: pin,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Rotate from -8deg to +8deg across the pin
        const rot = gsap.utils.interpolate(-8, 8, self.progress);
        // Also translate horizontally for travel distance
        const x = gsap.utils.interpolate(40, -((list.scrollWidth - window.innerWidth) + 80), self.progress);
        gsap.set(list, { rotate: rot, x: x });
      },
    });

    window.addEventListener("resize", () => {
      setOrigin();
      ScrollTrigger.refresh();
    });
  }

  function boot() {
    // Wait for Two26 loader / Lenis scroller proxy if present
    const start = () => {
      try { initRadialCardsMarquee(); } catch (e) { console.warn(e); }
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    };
    if (window.__two26LoaderDone) start();
    else {
      window.addEventListener("two26:loader-done", start, { once: true });
      // fallback
      setTimeout(start, 1200);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
</script>
`;
}

(async () => {
  await downloadAssets();
  let html = fs.readFileSync(htmlPath, "utf8");

  const start = html.indexOf('<section data-marquee-speed="3" class="section-slider-showcase">');
  const end = html.indexOf('<section class="section-projects">');
  if (start === -1 || end === -1) {
    console.error("Could not find slider or projects section", { start, end });
    process.exit(1);
  }

  const replacement = buildSection() + "\n";
  html = html.slice(0, start) + replacement + html.slice(end);
  fs.writeFileSync(htmlPath, html);
  console.log("Replaced banner marquee with radial scroll cards");
  console.log("bytes", replacement.length);
})();
