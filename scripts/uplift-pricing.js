const fs = require("fs");
const path = require("path");

const NEW_CSS = `<style id="pricing-section-css">
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
            margin-bottom: clamp(2.75em, 5.5vw, 4em);
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
          .section-pricing .pricing-heading {
            font-family: var(--font-primary), "Mdnichrometest", Impact, sans-serif;
            font-size: clamp(2.6rem, 6.2vw, 4.75rem);
            line-height: 0.92;
            letter-spacing: -0.035em;
            font-weight: 700;
            color: #fdf8f5;
            margin: 0;
            text-wrap: balance;
          }
          .pricing-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 1.25em;
            align-items: stretch;
          }
          .pricing-card {
            position: relative;
            display: flex;
            flex-direction: column;
            border-radius: 1.5em;
            padding: 1.85em 1.6em 1.45em;
            box-sizing: border-box;
            min-height: 100%;
            border: 1px solid rgba(253, 248, 245, 0.1);
            background: linear-gradient(165deg, #1f1f1f 0%, #151515 100%);
            color: #fdf8f5;
            box-shadow: 0 12px 32px rgba(0,0,0,0.28);
            transition: transform 0.4s cubic-bezier(.22,1,.36,1), box-shadow 0.4s ease, border-color 0.3s ease;
          }
          .pricing-card:hover {
            transform: translateY(-8px);
            border-color: rgba(255,84,0,0.35);
            box-shadow: 0 28px 55px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,84,0,0.12);
          }
          .pricing-card.is-featured {
            background: linear-gradient(165deg, #fffdfb 0%, #f8eee8 100%);
            color: #111;
            border-color: transparent;
            transform: scale(1.04);
            z-index: 2;
            box-shadow:
              0 28px 60px rgba(255, 84, 0, 0.22),
              0 10px 30px rgba(0,0,0,0.18);
          }
          .pricing-card.is-featured:hover {
            transform: scale(1.04) translateY(-6px);
            box-shadow:
              0 34px 70px rgba(255, 84, 0, 0.28),
              0 14px 34px rgba(0,0,0,0.2);
          }
          .pricing-badge {
            position: absolute;
            top: 1.15em;
            right: 1.15em;
            background: linear-gradient(135deg, #ff6a1a, #ff5400 55%, #e04800);
            color: #fff;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.72em;
            font-weight: 700;
            letter-spacing: 0.03em;
            border-radius: 999px;
            padding: 0.5em 0.95em;
            line-height: 1;
            box-shadow: 0 6px 16px rgba(255,84,0,0.35);
          }
          .pricing-plan {
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.92em;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin: 0 0 1.2em;
            opacity: 0.92;
          }
          .pricing-price-row {
            display: flex;
            align-items: baseline;
            gap: 0.6em;
            flex-wrap: wrap;
            margin-bottom: 0.95em;
          }
          .pricing-price {
            font-family: var(--font-primary), "Mdnichrometest", Impact, sans-serif;
            font-size: clamp(3.25rem, 5.2vw, 4.6rem);
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
            font-size: 0.8em;
            font-weight: 500;
            color: rgba(253,248,245,0.5);
            max-width: 7.2em;
            line-height: 1.25;
          }
          .pricing-card.is-featured .pricing-price-note {
            color: rgba(17,17,17,0.48);
          }
          .pricing-desc {
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.98em;
            font-weight: 500;
            line-height: 1.4;
            color: rgba(253,248,245,0.7);
            margin: 0 0 1.45em;
            max-width: 18em;
          }
          .pricing-card.is-featured .pricing-desc {
            color: rgba(17,17,17,0.62);
          }
          .pricing-features {
            list-style: none;
            margin: 0 0 1.9em;
            padding: 0;
            display: grid;
            gap: 0.78em;
            flex: 1 1 auto;
          }
          .pricing-features li {
            display: flex;
            align-items: flex-start;
            gap: 0.7em;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.95em;
            font-weight: 500;
            line-height: 1.3;
          }
          .pricing-check {
            flex: 0 0 auto;
            width: 1.2em;
            height: 1.2em;
            margin-top: 0.08em;
            color: #ff5400;
            filter: drop-shadow(0 0 6px rgba(255,84,0,0.35));
          }
          .pricing-card.is-featured .pricing-check {
            color: #ff5400;
            filter: none;
          }
          .pricing-check svg {
            width: 100%;
            height: 100%;
            display: block;
          }
          .pricing-cta {
            margin-top: auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.55em;
            width: 100%;
            border-radius: 999px;
            padding: 1.05em 1.3em;
            font-family: var(--font-secondary), "Neuemontreal", sans-serif;
            font-size: 0.95em;
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
          .pricing-cta:hover svg {
            transform: translate(2px, -2px);
          }
          @media (max-width: 991px) {
            .pricing-grid {
              grid-template-columns: 1fr;
              max-width: 28em;
              margin: 0 auto;
            }
            .pricing-card.is-featured {
              order: -1;
              transform: none;
            }
            .pricing-card.is-featured:hover {
              transform: translateY(-6px);
            }
          }
        </style>`;

const files = [
  path.join(__dirname, "..", "site", "index.html"),
  path.join(__dirname, "..", "site", "pricing", "index.html"),
];

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");
  const next = html.replace(
    /<style id="pricing-section-css">[\s\S]*?<\/style>/,
    NEW_CSS
  );
  if (next === html) {
    console.error("no match", file);
    process.exitCode = 1;
    continue;
  }
  fs.writeFileSync(file, next);
  console.log("uplifted", path.relative(path.join(__dirname, ".."), file));
}
