
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
