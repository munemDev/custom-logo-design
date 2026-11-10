// Header: fixed bar that turns solid once the page scrolls
const header = document.querySelector('.header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
function setMenu(open) {
  navLinks.classList.toggle('open', open);
  header.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
menuBtn.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
document.addEventListener('click', e => { if (!header.contains(e.target)) setMenu(false); });

// Highlight the nav link for the section on screen
const navMap = new Map([...navLinks.querySelectorAll('a[href^="#"]:not(.nav-mobile-cta)')]
  .map(a => [a.getAttribute('href').slice(1), a]));
const spy = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navMap.forEach(a => a.classList.remove('active'));
    navMap.get(entry.target.id)?.classList.add('active');
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navMap.forEach((a, id) => { const sec = document.getElementById(id); if (sec) spy.observe(sec); });

// Pricing: service tabs + currency switcher. The plan cards keep their place and their content swaps per tab.
const RATES = { USD: 1, EUR: 0.93, CAD: 1.365, GBP: 0.79 };
const SYMBOL = { USD: '$', EUR: '€', CAD: '$', GBP: '£' };
const GUARANTEE = 'Full refund guarantee';
const PRICING = {
  logo: {
    per: 'Logo', guarantee: false, orderCta: true, fourCol: true,
    plans: [
      {
        name: 'Bronze', pkg: 'logo-bronze', usd: 49,
        items: ['2 Logo Concepts', '3 Revisions', 'No High Res. files', '48 hours Delivery'],
      },
      {
        name: 'Silver', pkg: 'logo-silver', usd: 99,
        items: ['4 Logo Concepts', '6 Revisions', 'Custom Logo', 'Vector PDF File', '48 hours Delivery', 'HQ PNG + JPEG', '100% Ownership'],
      },
      {
        name: 'Gold', pkg: 'logo-gold', usd: 139,
        items: ['6 Logo Concepts', 'Unlimited Revisions', 'Custom Logo', 'Vector EPS, PDF file', '24-48 H Delivery', 'HQ PNG + JPEG', '100% Ownership'],
      },
      {
        name: 'Platinum', pkg: 'logo-platinum', usd: 189,
        items: ['Unlimited Concepts', 'Unlimited Revisions', 'Custom Logo', 'Editable Vector Ai', '24-48 H Delivery', 'Vector EPS, PDF', 'HQ PNG + JPEG', '100% Ownership', 'Business Card Design'],
      },
    ],
  },
  branding: {
    per: 'One-time payment',
    plans: [
      { name: 'Starter', usd: 400, items: ['Logo and colour palette', 'Font pairing', 'One-page brand sheet', '2 feedback rounds', 'Delivery in 7 days', 'All source files', 'Updates by email, no meetings'] },
      { name: 'Growth', usd: 800, items: ['Full brand guidelines', 'Business card and letterhead', '10 social media templates', '3 feedback rounds', 'Delivery in 10 days', 'Brand voice notes', 'Everything in Starter'] },
      { name: 'Pro', usd: 1500, items: ['Brand strategy workshop', 'Packaging or signage design', '25 social media templates', 'Presentation template', 'Unlimited feedback rounds', 'Priority 24-hour replies', 'Everything in Growth'] },
    ],
  },
  website: {
    per: 'Website', guarantee: false, orderCta: true, fourCol: true,
    plans: [
      {
        name: 'Static', pkg: 'website-static', usd: 699,
        items: ['5 Page Static Website', 'Jquery Slider Banner', 'W3C Certified HTML', 'UI Design', '3 Banner Design', 'Favicon', 'SEO Friendly Design'],
      },
      {
        name: 'Dynamic', pkg: 'website-dynamic', usd: 1199,
        items: ['Web Development', '5 Pages Dynamic Website', 'Jquery Slider Banner', 'W3C Certified HTML', 'Web Design & UI', '10 Stock Images', '5 Banner Designs', 'Advance UI Effects', 'SEO Friendly Design', 'SEO Friendly Sitemap', 'Social Media Inte.', '4 Social Platforms'],
      },
      {
        name: 'E-com', pkg: 'website-ecom', usd: 1699,
        items: ['Web Development', 'Unlimited Pages', 'Jquery Slider Banner', 'W3C Certified HTML', 'Admin Panel Support', 'Mobile Responsive Layout', 'Cart Integration', 'Pay. Module Integration', 'Inventory Management', '50 Products & Upto 10 Categories', 'Easy Product Search', 'Product Reviews', 'Web Design & UI', '15 Stock Images', '8 Banner Designs', 'Favicon', 'Advance UI Effects', 'Basic Search Engine Submission', 'SEO Friendly Design', 'SEO Friendly Sitemap', 'Analytics Integration', 'Social Media Integration', '4 Social Platforms'],
      },
      {
        name: 'Portal', pkg: 'website-portal', usd: 2999, per: 'Website starting from',
        items: ['Web Development', 'Any One:', 'Job Portal', 'Professional Network', 'Social Network', 'Media Portal', 'Real Estate Portal', 'Medical Portal', 'News Portal', 'Enterprise Portal', 'Client/User Dashboard', 'Custom Coding', 'Module-wise Architecture', 'Extensive Admin Panel', 'Complete Deployment'],
      },
    ],
  },
  video: {
    per: 'Video & animation', guarantee: false, orderCta: true, fourCol: true,
    plans: [
      {
        name: 'Bronze', usd: 499,
        items: [
          'Up to 60 seconds of animation',
          'Scriptwriting support',
          'Basic storyboard',
          'Simple graphic elements',
          'Professional voiceover',
          'Royalty-free background music',
          'HD output formats',
        ],
      },
      {
        name: 'Silver', usd: 799,
        items: [
          'Up to 60 seconds',
          'Full script development',
          'Detailed storyboard',
          'Enhanced illustrations',
          'Professional voiceover',
          'Royalty-free music',
          'Multiple delivery formats',
        ],
      },
      {
        name: 'Gold', usd: 999,
        items: [
          'Up to 60 seconds',
          'Concept-driven script',
          'Advanced storyboard',
          'Custom illustrations',
          'Voiceover in selected accent',
          'Royalty-free soundtrack',
          'HD & social formats',
        ],
      },
      {
        name: 'Platinum', usd: 1499,
        items: [
          'Up to 60 seconds',
          'Strategic scriptwriting',
          'Premium storyboard',
          'High-detail illustrations',
          'Professional voiceover',
          'Enhanced effects + transitions',
          'Multiple export formats',
        ],
      },
    ],
  },
};
let priceService = 'website';
let priceCurrency = 'USD';
const homePricing = document.getElementById('homePricing');
const planCards = homePricing ? [...homePricing.querySelectorAll('.p-card.plan')] : [];
const priceTabs = document.querySelectorAll('.price-tabs button');
const addonNote = document.querySelector('.addon-note');
const PLAN_THEMES = ['dark', 'blue', 'light'];
const CATALOG_THEMES = ['light', 'blue', 'light', 'dark'];

function money(usd, c) {
  const v = c === 'USD' ? usd : Math.round(usd * RATES[c] / 5) * 5;
  return SYMBOL[c] + v.toLocaleString('en-US');
}
function renderPrices() {
  const svc = PRICING[priceService];
  planCards.forEach((card, i) => {
    const plan = svc.plans[i];
    if (!plan) return;
    card.querySelector('.amount').textContent = money(plan.usd, priceCurrency);
    card.querySelector('.price-cur').textContent = priceCurrency;
    renderCta(card, plan);
  });
  document.querySelectorAll('.cur button').forEach(b => b.classList.toggle('active', b.dataset.c === priceCurrency));
}
// Plans with a pkg id open the CRM checkout via the hidden #orderForm (order-now.php);
// checkout charges USD, so other currencies and the remaining tabs go to the contact page.
function renderCta(card, plan) {
  const old = card.querySelector('.btn.full');
  if (!old) return;
  const pkg = priceCurrency === 'USD' ? plan.pkg : '';
  const cta = document.createElement(pkg ? 'button' : 'a');
  if (pkg) {
    Object.assign(cta, { type: 'submit', name: 'package', value: pkg });
    cta.setAttribute('form', 'orderForm');
  } else {
    cta.href = '/contact-us';
  }
  cta.textContent = 'Start now';
  cta.className = card.classList.contains('blue') ? 'btn btn-ink-flat full' : 'btn btn-blue full';
  old.replaceWith(cta);
}
function setPlanTheme(card, theme) {
  card.classList.remove(...PLAN_THEMES);
  card.classList.add(theme);
}
function renderPlans(animate) {
  const svc = PRICING[priceService];
  const useCatalogLayout = Boolean(svc.fourCol);
  homePricing?.classList.toggle('pricing-4col', useCatalogLayout);
  homePricing?.classList.toggle('is-catalog', useCatalogLayout);
  planCards.forEach((card, i) => {
    const plan = svc.plans[i];
    if (!plan) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const palette = svc.fourCol ? CATALOG_THEMES : PLAN_THEMES;
    const theme = plan.theme || palette[i] || 'light';
    setPlanTheme(card, theme);
    card.querySelector('.plan-label').textContent = plan.name;
    card.querySelector('.per').textContent = plan.per || svc.per;
    const badge = card.querySelector('.price-tab');
    if (badge) badge.hidden = !plan.badge;
    const list = card.querySelector('.checks');
    const tail = svc.guarantee === false ? [] : [GUARANTEE];
    list.replaceChildren(...plan.items.concat(tail).map((text, n) => {
      const li = document.createElement('li');
      li.textContent = text;
      if (n >= plan.items.length) li.className = 'hi';
      return li;
    }));
    if (animate) {
      card.classList.remove('sa', 'pop-in'); void card.offsetWidth;
      card.style.animationDelay = i * 70 + 'ms';
      card.classList.add('pop-in');
    }
  });
  if (addonNote) addonNote.hidden = !svc.addon;
  window.collapsePlanFeatures?.(homePricing); // long feature lists get a "+ N more features" toggle
  renderPrices();
}
if (planCards.length) renderPlans(false);
priceTabs.forEach(tab => tab.addEventListener('click', () => {
  priceService = tab.dataset.service;
  priceTabs.forEach(t => { const on = t === tab; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });
  renderPlans(true);
}));
document.querySelectorAll('.cur button').forEach(btn => btn.addEventListener('click', () => {
  priceCurrency = btn.dataset.c;
  renderPrices();
}));

// Testimonials: duplicate the cards once so the CSS loop runs seamlessly
const testiTrack = document.getElementById('testiTrack');
if (testiTrack) {
  [...testiTrack.children].forEach(card => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    testiTrack.appendChild(clone);
  });
}

function initHeroTypewriter(input) {
  const phrase = input.dataset.typewriter || 'Enter your business name';
  const field = input.closest('.hero-form-field');
  const display = field?.querySelector('.hero-typewriter');
  if (!display) {
    input.placeholder = phrase;
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    input.placeholder = phrase;
    display.hidden = true;
    return;
  }

  let charIndex = 0;
  let deleting = false;
  let timer;

  function shouldAnimate() {
    return !input.value.trim();
  }

  function syncVisibility() {
    display.hidden = !shouldAnimate();
  }

  function schedule(fn, ms) {
    clearTimeout(timer);
    timer = window.setTimeout(fn, ms);
  }

  function tick() {
    syncVisibility();
    if (!shouldAnimate()) {
      schedule(tick, 250);
      return;
    }

    if (!deleting) {
      charIndex = Math.min(charIndex + 1, phrase.length);
      display.textContent = phrase.slice(0, charIndex);
      if (charIndex >= phrase.length) {
        schedule(() => {
          deleting = true;
          tick();
        }, 2200);
        return;
      }
      schedule(tick, 58 + Math.random() * 36);
      return;
    }

    charIndex = Math.max(charIndex - 1, 0);
    display.textContent = phrase.slice(0, charIndex);
    if (charIndex <= 0) {
      deleting = false;
      schedule(tick, 520);
      return;
    }
    schedule(tick, 34);
  }

  input.addEventListener('input', syncVisibility);

  tick();
}

const heroBusinessInput = document.getElementById('heroBusiness');
if (heroBusinessInput) initHeroTypewriter(heroBusinessInput);

// Hero lead form → project brief draft (company filled → open brief on slogan step)
const heroForm = document.getElementById('heroForm');
if (heroForm) {
  heroForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!heroForm.reportValidity()) return;
    const businessInput = heroForm.querySelector('#heroBusiness');
    const company = businessInput?.value?.trim() || '';
    if (!company) {
      businessInput.value = '';
      businessInput.reportValidity();
      return;
    }
    let destination = '/project-brief';
    try {
      let draft = {};
      const raw = sessionStorage.getItem('designmantaBriefDraft');
      if (raw) draft = JSON.parse(raw);
      if (company) {
        draft.company = company;
        draft.step = 2;
        draft.fromHero = true;
      }
      sessionStorage.setItem('designmantaBriefDraft', JSON.stringify(draft));
    } catch {
      destination += '?company=' + encodeURIComponent(company);
    }
    window.location.href = destination;
  });
}

// Hero field on phones and tablets. The field is autofocused, but iOS Safari and Android Chrome only
// raise the on-screen keyboard for a focus made inside a user gesture (Chrome's VirtualKeyboard.show()
// also needs prior user activation), so the page cannot open it on load. Instead the first tap anywhere
// on the field box, or on "Start your project" while the field is empty, focuses the field within that
// tap, which opens the keyboard straight away. Desktop keeps its existing behaviour.
if (heroForm && heroBusinessInput && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
  const raiseKeyboard = () => {
    // focus() on an already-focused field is a no-op and would not bring the keyboard up
    if (document.activeElement === heroBusinessInput) heroBusinessInput.blur();
    heroBusinessInput.focus({ preventScroll: true });
  };
  // autofocus is skipped when the page is restored from the back/forward cache
  window.addEventListener('pageshow', () => {
    if (document.activeElement === document.body) heroBusinessInput.focus({ preventScroll: true });
  });
  heroForm.addEventListener('click', e => {
    if (e.target === heroBusinessInput) return; // a tap on the field itself opens the keyboard natively
    const cta = e.target.closest('button[type="submit"]');
    if (cta && heroBusinessInput.value.trim()) return; // filled in: submit as usual
    if (cta) e.preventDefault();
    raiseKeyboard();
  });
}

// Work mosaic tabs (homepage portfolio section)
const mosaicRoot = document.getElementById('mosaic');
if (mosaicRoot) {
  const tablist = mosaicRoot.parentElement?.querySelector('.work-tabs[role="tablist"]');
  const tabs = tablist ? [...tablist.querySelectorAll('[role="tab"]')] : [];
  const panels = [...document.querySelectorAll('#mosaic .mosaic')];
  function selectWorkTab(tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
      t.setAttribute('tabindex', on ? '0' : '-1');
    });
    panels.forEach(panel => {
      const show = panel.dataset.panel === tab.dataset.filter;
      panel.hidden = !show;
      if (show) [...panel.children].forEach((el, i) => {
        el.classList.remove('sa', 'pop-in'); void el.offsetWidth;
        el.style.animationDelay = Math.min(i * 30, 500) + 'ms';
        el.classList.add('pop-in');
      });
    });
  }
  tabs.forEach(tab => tab.addEventListener('click', () => selectWorkTab(tab)));
  if (tablist) {
    tablist.addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let next = i;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault();
      tabs[next].focus();
      selectWorkTab(tabs[next]);
    });
  }
}

// Contact form
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  connectContactForm(contactForm, 'home-contact');
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

function initSvcImgCycles() {
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.svc-img-cycle').forEach(cycle => {
    const imgs = [...cycle.querySelectorAll('img')];
    if (imgs.length < 2) return;
    let i = imgs.findIndex(img => img.classList.contains('is-visible'));
    if (i < 0) {
      i = 0;
      imgs[0].classList.add('is-visible');
    }
    if (!motionOk) return;
    const ms = Number(cycle.dataset.interval) || 4500;
    window.setInterval(() => {
      imgs[i].classList.remove('is-visible');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('is-visible');
    }, ms);
  });
}
initSvcImgCycles();

function initSvcVideos() {
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.svc-img-video video').forEach(video => {
    video.muted = true;
    video.playsInline = true;
    if (!motionOk) {
      video.pause();
      video.removeAttribute('autoplay');
      return;
    }
    const wrap = video.closest('.svc-img-video');
    const play = () => video.play().catch(() => {});
    if (!wrap || !('IntersectionObserver' in window)) {
      play();
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) play();
          else video.pause();
        });
      },
      { threshold: 0.2 },
    );
    io.observe(wrap);
  });
}
initSvcVideos();

const HERO_PORTFOLIO_BASE = 'asset/hero-floating-images/hero/portfolio/';
const HERO_PORTFOLIO_POOL = [
  ...Array.from({ length: 20 }, (_, i) => `${HERO_PORTFOLIO_BASE}${String(i + 1).padStart(2, '0')}.webp`),
  ...Array.from({ length: 10 }, (_, i) => `${HERO_PORTFOLIO_BASE}j${i + 1}.webp`),
];
const DEVICE_LOGO_BASE = 'asset/hero-floating-images/hero-floating-logos/logo-';
const DEVICE_LOGO_COUNT = 19;

function setupLogoCrossfadeStack(fig, pool, startIdx, pickNextIdx, onIdxChange) {
  const img = fig.querySelector(':scope > img');
  if (!img) return null;

  const stack = document.createElement('div');
  stack.className = 'logo-cycle-stack';

  const front = img;
  front.classList.add('logo-cycle-layer', 'is-visible');
  const back = document.createElement('img');
  back.className = 'logo-cycle-layer';
  back.alt = front.alt;
  back.width = front.width;
  back.height = front.height;
  back.decoding = 'async';
  back.loading = 'lazy';

  fig.insertBefore(stack, front);
  stack.append(front, back);

  let idx = startIdx;
  let visible = front;
  let hidden = back;
  visible.src = pool[idx];

  return () => {
    idx = pickNextIdx(idx);
    onIdxChange(idx);
    const nextSrc = pool[idx];
    const preload = new Image();
    preload.onload = () => {
      hidden.src = nextSrc;
      const reveal = () => {
        hidden.classList.add('is-visible');
        visible.classList.remove('is-visible');
        hidden.onload = null;
        [visible, hidden] = [hidden, visible];
      };
      if (hidden.complete) reveal();
      else hidden.onload = reveal;
    };
    preload.src = nextSrc;
  };
}

// timers: one { intervalMs, startDelayMs } makes the cards change in turn on a shared timer;
// an array gives each card its own timer.
function initLogoCycleGroup(selector, pool, timers) {
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const figures = [...document.querySelectorAll(selector)];
  if (!figures.length || pool.length < 2) return;

  const slots = figures.map((fig, i) => ({ fig, poolIdx: i }));

  function usedExcept(exclude) {
    const taken = new Set();
    for (const slot of slots) {
      if (slot !== exclude) taken.add(slot.poolIdx);
    }
    return taken;
  }

  function pickNextIdx(currentIdx, slot) {
    const taken = usedExcept(slot);
    for (let step = 1; step <= pool.length; step += 1) {
      const candidate = (currentIdx + step) % pool.length;
      if (!taken.has(candidate)) return candidate;
    }
    return currentIdx;
  }

  const advances = slots.map(slot =>
    setupLogoCrossfadeStack(
      slot.fig,
      pool,
      slot.poolIdx,
      cur => pickNextIdx(cur, slot),
      next => {
        slot.poolIdx = next;
      },
    ),
  ).filter(Boolean);

  if (!motionOk || !advances.length) return;

  const every = (fn, { intervalMs, startDelayMs }) => {
    const start = () => window.setInterval(fn, intervalMs);
    if (startDelayMs > 0) window.setTimeout(start, startDelayMs);
    else start();
  };

  if (!Array.isArray(timers)) {
    let turn = 0;
    every(() => {
      advances[turn]();
      turn = (turn + 1) % advances.length;
    }, timers);
    return;
  }

  advances.forEach((advance, i) => {
    every(advance, timers[i] ?? { intervalMs: 5200 + i * 720, startDelayMs: 0 });
  });
}

function initLogoFrameCycles() {
  initLogoCycleGroup('.polaroid-cycle', HERO_PORTFOLIO_POOL, { intervalMs: 3200, startDelayMs: 2000 });

  const devicePool = Array.from(
    { length: DEVICE_LOGO_COUNT },
    (_, i) => `${DEVICE_LOGO_BASE}${String(i + 1).padStart(2, '0')}.webp`,
  );
  initLogoCycleGroup('.device-cycle', devicePool, [
    { intervalMs: 4600, startDelayMs: 600 },
    { intervalMs: 6100, startDelayMs: 3200 },
  ]);
}
initLogoFrameCycles();
