// Pricing cards with a long feature list show the first few features and a "+ N more features" toggle that opens
// and closes smoothly. Wide promo cards and the lists inside bundle dropdowns are left as they are.
// The homepage re-renders its cards on every tab change, so script.js calls window.collapsePlanFeatures() again.
(function planFeatures() {
  const SHOW = 6; // features visible while collapsed
  const MIN_HIDDEN = 3; // only collapse when that hides at least this many
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let uid = 0;

  function setup(list) {
    const card = list.closest('.p-card.plan');
    if (!card || card.classList.contains('promo-package') || list.closest('details')) return;

    // start clean (the homepage replaces the items when the tab changes)
    if (list.nextElementSibling?.classList.contains('plan-more')) list.nextElementSibling.remove();
    list.classList.remove('is-collapsible', 'is-open');
    const items = [...list.children].filter(li => !li.classList.contains('hi')); // guarantee line stays visible
    items.forEach(li => li.classList.remove('is-extra'));
    const extra = items.slice(SHOW);
    if (extra.length < MIN_HIDDEN) return;

    extra.forEach(li => li.classList.add('is-extra'));
    list.classList.add('is-collapsible');
    if (!list.id) list.id = `plan-features-${++uid}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'plan-more';
    btn.setAttribute('aria-controls', list.id);
    const label = open => {
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Show fewer features' : `+ ${extra.length} more features`;
    };
    label(false);

    let anim = null;
    btn.addEventListener('click', () => {
      const open = !list.classList.contains('is-open');
      label(open);
      if (anim) anim.cancel();
      const from = list.offsetHeight;
      list.classList.toggle('is-open', open);
      if (reduceMotion || !list.animate) return;
      const to = list.offsetHeight;
      if (!open) list.classList.add('is-open'); // keep the items while the list shrinks
      list.style.overflow = 'hidden';
      anim = list.animate({ height: [`${from}px`, `${to}px`] }, { duration: 320, easing: 'cubic-bezier(.2, .7, .2, 1)' });
      const done = () => {
        list.classList.toggle('is-open', open);
        list.style.overflow = '';
        anim = null;
      };
      anim.onfinish = done;
      anim.oncancel = () => { list.style.overflow = ''; };
    });
    list.after(btn);
  }

  window.collapsePlanFeatures = (root = document) => root.querySelectorAll('.p-card.plan .checks').forEach(setup);
  window.collapsePlanFeatures();
})();
