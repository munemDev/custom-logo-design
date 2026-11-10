from pathlib import Path

path = Path(r"f:\logo-brand\site\index.html")
text = path.read_text(encoding="utf-8")
start = text.find('<section class="section-pricing" id="pricing"')
end = text.find('<section class="section-services">', start)
if start < 0 or end < 0:
    raise SystemExit(f"bounds not found start={start} end={end}")

new = r'''<section class="section-pricing" id="pricing" aria-label="Pricing">
        <style id="pricing-section-css">
          .section-pricing {
            width: 100%;
            position: relative;
            overflow: hidden;
            background:
              radial-gradient(ellipse 70% 55% at 50% -10%, rgba(255,84,0,0.22), transparent 60%),
              radial-gradient(ellipse 40% 40% at 85% 80%, rgba(255,84,0,0.08), transparent 55%),
              #0c0c0c;
            color: #fdf8f5;
            padding: clamp(4.5em, 9vw, 8em) 1.25em;
            box-sizing: border-box;
          }
          .section-pricing::before {
            content: "";
            position: absolute;
            inset: 0;
            background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 48px 48px;
            mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 20%, transparent 75%);
            pointer-events: none;
            opacity: 0.45;
          }
          .section-pricing-inner {
            width: min(1160px, 100%);
            margin: 0 auto;
            position: relative;
            z-index: 1;
          }
          .section-pricing .pricing-header {
            text-align: center;
            margin-bottom: clamp(1.75em, 4vw, 2.5em);
          }
          .section-pricing .pricing-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 0.45em;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.82em;
            font-weight: 600;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #ff5400;
            margin-bottom: 1em;
            padding: 0.45em 0.9em;
            border: 1px solid rgba(255,84,0,0.35);
            border-radius: 999px;
            background: rgba(255,84,0,0.08);
          }
          .section-pricing .pricing-eyebrow::before {
            content: "";
            width: 0.5em;
            height: 0.5em;
            border-radius: 50%;
            background: #ff5400;
            box-shadow: 0 0 0 4px rgba(255,84,0,0.2);
          }
          .section-pricing .pricing-heading {
            font-family: var(--font-primary), "Mdnichrometest", Impact, sans-serif;
            font-size: clamp(2.4rem, 5.8vw, 4.4rem);
            line-height: 0.92;
            letter-spacing: -0.035em;
            font-weight: 700;
            color: #fdf8f5;
            margin: 0 0 0.55em;
            text-wrap: balance;
          }
          .section-pricing .pricing-lead {
            margin: 0 auto;
            max-width: 34em;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 1.02em;
            line-height: 1.45;
            color: rgba(253,248,245,0.62);
          }
          .pricing-tabs {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.55em;
            margin: 0 auto 1.85em;
          }
          .pricing-tab {
            appearance: none;
            border: 1px solid rgba(253,248,245,0.16);
            background: rgba(255,255,255,0.04);
            color: rgba(253,248,245,0.78);
            border-radius: 999px;
            padding: 0.72em 1.15em;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.86em;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            cursor: pointer;
            transition: background .25s ease, color .25s ease, border-color .25s ease, transform .25s ease;
          }
          .pricing-tab:hover {
            transform: translateY(-1px);
            border-color: rgba(255,84,0,0.45);
            color: #fff;
          }
          .pricing-tab.is-active {
            background: #ff5400;
            border-color: transparent;
            color: #fff;
            box-shadow: 0 10px 24px rgba(255,84,0,0.28);
          }
          .pricing-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 1rem;
            align-items: stretch;
          }
          .pricing-grid.is-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            max-width: 980px;
            margin-inline: auto;
          }
          .pricing-card {
            position: relative;
            display: flex;
            flex-direction: column;
            border-radius: 1.35em;
            padding: 1.55em 1.25em 1.3em;
            box-sizing: border-box;
            min-height: 100%;
            border: 1px solid rgba(253, 248, 245, 0.1);
            background: linear-gradient(165deg, #1f1f1f 0%, #151515 100%);
            color: #fdf8f5;
            box-shadow: 0 12px 32px rgba(0,0,0,0.28);
            transition: transform 0.4s cubic-bezier(.22,1,.36,1), box-shadow 0.4s ease, border-color 0.3s ease;
          }
          .pricing-card:hover {
            transform: translateY(-6px);
            border-color: rgba(255,84,0,0.35);
            box-shadow: 0 28px 55px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,84,0,0.12);
          }
          .pricing-card.is-featured {
            background: linear-gradient(165deg, #fffdfb 0%, #f8eee8 100%);
            color: #111;
            border-color: transparent;
            transform: scale(1.03);
            z-index: 2;
            box-shadow:
              0 28px 60px rgba(255, 84, 0, 0.22),
              0 10px 30px rgba(0,0,0,0.18);
          }
          .pricing-card.is-featured:hover {
            transform: scale(1.03) translateY(-5px);
            box-shadow:
              0 34px 70px rgba(255, 84, 0, 0.28),
              0 14px 34px rgba(0,0,0,0.2);
          }
          .pricing-card.is-dark {
            background: linear-gradient(165deg, #1a1a1a 0%, #0a0a0a 100%);
          }
          .pricing-badge {
            position: absolute;
            top: 1em;
            right: 1em;
            background: linear-gradient(135deg, #ff6a1a, #ff5400 55%, #e04800);
            color: #fff;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.7em;
            font-weight: 700;
            letter-spacing: 0.03em;
            border-radius: 999px;
            padding: 0.45em 0.85em;
            line-height: 1;
            box-shadow: 0 6px 16px rgba(255,84,0,0.35);
          }
          .pricing-plan {
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.88em;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin: 0 0 0.9em;
            opacity: 0.92;
          }
          .pricing-price-row {
            display: flex;
            align-items: baseline;
            gap: 0.5em;
            flex-wrap: wrap;
            margin-bottom: 1.15em;
          }
          .pricing-price {
            font-family: var(--font-primary), "Mdnichrometest", Impact, sans-serif;
            font-size: clamp(2.5rem, 3.8vw, 3.4rem);
            line-height: 0.88;
            font-weight: 700;
            letter-spacing: -0.045em;
          }
          .pricing-card.is-featured .pricing-price {
            background: linear-gradient(120deg, #111 30%, #ff5400 140%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .pricing-price-note {
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.78em;
            font-weight: 500;
            color: rgba(253,248,245,0.5);
            max-width: 7.2em;
            line-height: 1.25;
          }
          .pricing-card.is-featured .pricing-price-note {
            color: rgba(17,17,17,0.48);
          }
          .pricing-features {
            list-style: none;
            margin: 0 0 1.5em;
            padding: 0;
            display: grid;
            gap: 0.68em;
            flex: 1 1 auto;
          }
          .pricing-features li {
            display: flex;
            align-items: flex-start;
            gap: 0.65em;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.9em;
            font-weight: 500;
            line-height: 1.3;
          }
          .pricing-features li.is-extra { display: none; }
          .pricing-features.is-open li.is-extra { display: flex; }
          .pricing-check {
            flex: 0 0 auto;
            width: 1.15em;
            height: 1.15em;
            margin-top: 0.08em;
            color: #ff5400;
          }
          .pricing-check svg {
            width: 100%;
            height: 100%;
            display: block;
          }
          .pricing-more {
            appearance: none;
            background: none;
            border: none;
            color: #ff5400;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.86em;
            font-weight: 700;
            cursor: pointer;
            padding: 0;
            margin: -0.7em 0 1.2em;
            text-align: left;
          }
          .pricing-card.is-featured .pricing-more { color: #c24100; }
          .pricing-cta {
            margin-top: auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.55em;
            width: 100%;
            border-radius: 999px;
            padding: 1em 1.2em;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.92em;
            font-weight: 600;
            text-decoration: none;
            border: none;
            cursor: pointer;
            box-sizing: border-box;
            transition: transform 0.28s ease, background 0.28s ease, color 0.28s ease, box-shadow 0.28s ease;
          }
          .pricing-card:not(.is-featured) .pricing-cta {
            background: #fdf8f5;
            color: #111;
          }
          .pricing-card.is-featured .pricing-cta {
            background: #111;
            color: #fdf8f5;
            box-shadow: 0 10px 24px rgba(0,0,0,0.2);
          }
          .pricing-cta:hover {
            transform: translateY(-2px);
            background: #ff5400;
            color: #fff;
            box-shadow: 0 12px 28px rgba(255,84,0,0.35);
          }
          .pricing-cta svg {
            width: 0.85em;
            height: 0.85em;
            display: block;
            transition: transform 0.28s ease;
          }
          .pricing-cta:hover svg { transform: translate(2px, -2px); }
          .pricing-addon {
            margin: 1.5em auto 0;
            max-width: 42em;
            text-align: center;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.92em;
            color: rgba(253,248,245,0.55);
            line-height: 1.45;
          }
          .pricing-addon strong { color: #ff5400; }
          @media (max-width: 1100px) {
            .pricing-grid,
            .pricing-grid.is-3 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              max-width: none;
            }
            .pricing-card.is-featured { transform: none; }
            .pricing-card.is-featured:hover { transform: translateY(-5px); }
          }
          @media (max-width: 700px) {
            .pricing-grid,
            .pricing-grid.is-3 {
              grid-template-columns: 1fr;
              max-width: 26em;
              margin: 0 auto;
            }
            .pricing-card.is-featured { order: -1; }
          }
        </style>
        <div class="section-pricing-inner">
          <div class="pricing-header">
            <div class="pricing-eyebrow">2 spots open this month</div>
            <h2 class="pricing-heading">Pick a Package With a Price on the Label</h2>
            <p class="pricing-lead">No “it depends” until you ask for extras. Compare tiers below for logo, branding, website and motion.</p>
          </div>
          <div class="pricing-tabs" role="tablist" aria-label="Choose a service">
            <button type="button" class="pricing-tab is-active" role="tab" aria-selected="true" data-service="logo">Logo Design</button>
            <button type="button" class="pricing-tab" role="tab" aria-selected="false" data-service="branding">Branding</button>
            <button type="button" class="pricing-tab" role="tab" aria-selected="false" data-service="website">Website</button>
            <button type="button" class="pricing-tab" role="tab" aria-selected="false" data-service="video">Video &amp; Animation</button>
          </div>
          <div class="pricing-grid" id="homePricingGrid" aria-live="polite"></div>
          <p class="pricing-addon" id="pricingAddonNote" hidden>Add Care+ support to Starter or Growth for <strong>$50/month</strong>: ongoing edits, updates and priority help from our developers.</p>
        </div>
        <script>
          (function () {
            var CHECK = '<span class="pricing-check" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 8.2 6.4 11l6.1-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
            var ARROW = '<svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1.5 8.5 8.5 1.5M8.5 1.5H3M8.5 1.5V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            var PRICING = {
              logo: {
                per: "Logo",
                featured: 1,
                dark: 3,
                plans: [
                  { name: "Bronze", usd: 49, items: ["2 Logo Concepts", "3 Revisions", "No High Res. files", "48 hours Delivery"] },
                  { name: "Silver", usd: 99, items: ["4 Logo Concepts", "6 Revisions", "Custom Logo", "Vector PDF File", "48 hours Delivery", "HQ PNG + JPEG", "100% Ownership"] },
                  { name: "Gold", usd: 139, items: ["6 Logo Concepts", "Unlimited Revisions", "Custom Logo", "Vector EPS, PDF file", "24-48 H Delivery", "HQ PNG + JPEG", "100% Ownership"] },
                  { name: "Platinum", usd: 189, items: ["Unlimited Concepts", "Unlimited Revisions", "Custom Logo", "Editable Vector Ai", "24-48 H Delivery", "Vector EPS, PDF", "HQ PNG + JPEG", "100% Ownership", "Business Card Design"] }
                ]
              },
              branding: {
                per: "One-time payment",
                featured: 1,
                dark: -1,
                plans: [
                  { name: "Starter", usd: 400, items: ["Logo and colour palette", "Font pairing", "One-page brand sheet", "2 feedback rounds", "Delivery in 7 days", "All source files", "Updates by email, no meetings"] },
                  { name: "Growth", usd: 800, items: ["Full brand guidelines", "Business card and letterhead", "10 social media templates", "3 feedback rounds", "Delivery in 10 days", "Brand voice notes", "Everything in Starter"] },
                  { name: "Pro", usd: 1500, items: ["Brand strategy workshop", "Packaging or signage design", "25 social media templates", "Presentation template", "Unlimited feedback rounds", "Priority 24-hour replies", "Everything in Growth"] }
                ]
              },
              website: {
                per: "Website",
                featured: 1,
                dark: 3,
                plans: [
                  { name: "Static", usd: 699, items: ["5 Page Static Website", "Jquery Slider Banner", "W3C Certified HTML", "UI Design", "3 Banner Design", "Favicon", "SEO Friendly Design"] },
                  { name: "Dynamic", usd: 1199, items: ["Web Development", "5 Pages Dynamic Website", "Jquery Slider Banner", "W3C Certified HTML", "Web Design & UI", "10 Stock Images", "5 Banner Designs", "Advance UI Effects", "SEO Friendly Design", "SEO Friendly Sitemap", "Social Media Inte.", "4 Social Platforms"] },
                  { name: "E-com", usd: 1699, items: ["Web Development", "Unlimited Pages", "Jquery Slider Banner", "W3C Certified HTML", "Admin Panel Support", "Mobile Responsive Layout", "Cart Integration", "Pay. Module Integration", "Inventory Management", "50 Products & Upto 10 Categories", "Easy Product Search", "Product Reviews", "Web Design & UI", "15 Stock Images", "8 Banner Designs", "Favicon", "Advance UI Effects", "Basic Search Engine Submission", "SEO Friendly Design", "SEO Friendly Sitemap", "Analytics Integration", "Social Media Integration", "4 Social Platforms"] },
                  { name: "Portal", usd: 2999, per: "Website starting from", items: ["Web Development", "Any One:", "Job Portal", "Professional Network", "Social Network", "Media Portal", "Real Estate Portal", "Medical Portal", "News Portal", "Enterprise Portal", "Client/User Dashboard", "Custom Coding", "Module-wise Architecture", "Extensive Admin Panel", "Complete Deployment"] }
                ]
              },
              video: {
                per: "Video & animation",
                featured: 1,
                dark: 3,
                plans: [
                  { name: "Bronze", usd: 499, items: ["Up to 60 seconds of animation", "Scriptwriting support", "Basic storyboard", "Simple graphic elements", "Professional voiceover", "Royalty-free background music", "HD output formats"] },
                  { name: "Silver", usd: 799, items: ["Up to 60 seconds", "Full script development", "Detailed storyboard", "Enhanced illustrations", "Professional voiceover", "Royalty-free music", "Multiple delivery formats"] },
                  { name: "Gold", usd: 999, items: ["Up to 60 seconds", "Concept-driven script", "Advanced storyboard", "Custom illustrations", "Voiceover in selected accent", "Royalty-free soundtrack", "HD & social formats"] },
                  { name: "Platinum", usd: 1499, items: ["Up to 60 seconds", "Strategic scriptwriting", "Premium storyboard", "High-detail illustrations", "Professional voiceover", "Enhanced effects + transitions", "Multiple export formats"] }
                ]
              }
            };

            var grid = document.getElementById("homePricingGrid");
            var note = document.getElementById("pricingAddonNote");
            var tabs = document.querySelectorAll(".section-pricing .pricing-tab");
            if (!grid) return;

            function money(n) {
              return "$" + n.toLocaleString("en-US");
            }

            function render(service) {
              var svc = PRICING[service];
              if (!svc) return;
              grid.classList.toggle("is-3", svc.plans.length === 3);
              grid.innerHTML = svc.plans.map(function (plan, i) {
                var featured = i === svc.featured;
                var dark = i === svc.dark;
                var show = 6;
                var extras = plan.items.length > show + 2 ? plan.items.length - show : 0;
                var itemsHtml = plan.items.map(function (item, idx) {
                  var extraClass = extras && idx >= show ? ' class="is-extra"' : "";
                  return "<li" + extraClass + ">" + CHECK + item + "</li>";
                }).join("");
                var moreBtn = extras
                  ? '<button type="button" class="pricing-more" data-more>+ ' + extras + " more features</button>"
                  : "";
                return (
                  '<article class="pricing-card' + (featured ? " is-featured" : "") + (dark ? " is-dark" : "") + '">' +
                    (featured ? '<span class="pricing-badge">Most popular</span>' : "") +
                    '<h3 class="pricing-plan">' + plan.name + "</h3>" +
                    '<div class="pricing-price-row">' +
                      '<div class="pricing-price">' + money(plan.usd) + "</div>" +
                      '<div class="pricing-price-note">' + (plan.per || svc.per) + "</div>" +
                    "</div>" +
                    '<ul class="pricing-features">' + itemsHtml + "</ul>" +
                    moreBtn +
                    '<a href="/brief/" class="pricing-cta">Start now ' + ARROW + "</a>" +
                  "</article>"
                );
              }).join("");

              if (note) note.hidden = service !== "branding";

              grid.querySelectorAll(".pricing-more").forEach(function (btn) {
                btn.addEventListener("click", function () {
                  var list = btn.previousElementSibling;
                  if (!list) return;
                  var open = list.classList.toggle("is-open");
                  var count = list.querySelectorAll(".is-extra").length;
                  btn.textContent = open ? "Show fewer features" : ("+ " + count + " more features");
                });
              });
            }

            tabs.forEach(function (tab) {
              tab.addEventListener("click", function () {
                tabs.forEach(function (t) {
                  t.classList.toggle("is-active", t === tab);
                  t.setAttribute("aria-selected", t === tab ? "true" : "false");
                });
                render(tab.getAttribute("data-service"));
              });
            });

            render("logo");
          })();
        </script>
      </section>
'''

path.write_text(text[:start] + new + text[end:], encoding="utf-8")
print("patched", start, "->", end, "new len", len(new))
