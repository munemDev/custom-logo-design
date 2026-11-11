(function () {
  var PAGES = [
    ["Home", "/"],
    ["Work", "/work/"],
    ["About us", "/about/"],
    ["Pricing", "/pricing/"]
  ];

  function norm(p) { return (p || "/").replace(/\/index\.html$/, "/").replace(/\/?$/, "/"); }

  function init() {
    var header = document.querySelector(".header");
    if (!header || header.dataset.ldEnhanced) return;
    header.dataset.ldEnhanced = "1";

    // 1) Sticky: keep the fixed header outside any scrolling/transformed wrapper
    if (header.parentElement !== document.body) {
      document.body.insertBefore(header, document.body.firstChild);
    }

    // 2) Mobile burger + menu
    var right = header.querySelector(".navbar-right") || header.querySelector(".navbar-wrap");
    if (!right) return;

    var burger = document.createElement("button");
    burger.type = "button";
    burger.className = "ld-burger";
    burger.setAttribute("aria-label", "Open menu");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-controls", "ldMenu");
    burger.innerHTML = "<span></span><span></span><span></span>";
    right.appendChild(burger);

    var here = norm(location.pathname);
    var menu = document.createElement("nav");
    menu.className = "ld-menu";
    menu.id = "ldMenu";
    menu.setAttribute("aria-label", "Mobile menu");
    menu.innerHTML =
      PAGES.map(function (p) {
        var cur = norm(p[1]) === here || (p[1] !== "/" && here.indexOf(norm(p[1])) === 0);
        return '<a class="ld-menu-link' + (cur ? " is-current" : "") + '" href="' + p[1] + '"' + (cur ? ' aria-current="page"' : "") + ">" + p[0] + "</a>";
      }).join("") +
      '<div class="ld-menu-ctas"><a class="ld-menu-cta" href="/brief/">Get my custom logo ↗</a><a class="ld-menu-cta ld-menu-cta--alt" href="/contact-us/">Let&rsquo;s talk ↗</a></div>' +
      '<div class="ld-menu-legal"><a href="/privacy-policy/">Privacy Policy</a><a href="/terms-and-conditions/">Terms &amp; Conditions</a></div>';
    document.body.appendChild(menu);

    var root = document.documentElement;
    function setOpen(open) {
      root.classList.toggle("ld-menu-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    burger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!root.classList.contains("ld-menu-open"));
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 767) setOpen(false); });
  }

  function initForms() {
    document.querySelectorAll("form.ld-contact-form").forEach(function (form) {
      if (form.dataset.ready) return;
      form.dataset.ready = "1";
      var status = form.querySelector(".ld-cf-status");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var bad = [];
        form.querySelectorAll("[required]").forEach(function (el) {
          var ok = el.value.trim() !== "" && (el.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
          el.closest(".ld-cf-field").classList.toggle("is-invalid", !ok);
          if (!ok) bad.push(el);
        });
        if (bad.length) {
          status.className = "ld-cf-status is-error";
          status.textContent = "Please fill in your name, a valid email and a short message.";
          bad[0].focus();
          return;
        }
        var d = new FormData(form);
        var NL = String.fromCharCode(10);
        var body = ["Name: " + d.get("name"), "Email: " + d.get("email"), "Phone: " + (d.get("phone") || "-"), "Service: " + d.get("service"), "", d.get("message")].join(NL);
        window.location.href = "mailto:hello@logodesign.com?subject=" + encodeURIComponent("New enquiry: " + d.get("service") + " - " + d.get("name")) +
          "&body=" + encodeURIComponent(body);
        status.className = "ld-cf-status is-ok";
        status.textContent = "Thanks! Your email app should open with your message ready to send.";
        form.reset();
      });
      form.addEventListener("input", function (e) {
        var f = e.target.closest(".ld-cf-field");
        if (f) f.classList.remove("is-invalid");
      });
    });
  }

  // "Let's Talk" / CTA buttons open the Contact page instead of the old overlay
  window.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".cta-btn, [data-contact-trigger]");
    if (!a || a.closest(".contact-page") || a.closest("form")) return;
    var href = a.getAttribute("href");
    e.preventDefault();
    e.stopImmediatePropagation();
    var dest = href && href !== "#" ? href : "/contact-us/";
    if (a.target === "_blank") window.open(dest, "_blank");
    else window.location.href = dest;
  }, true);

  function boot() { init(); initForms(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
