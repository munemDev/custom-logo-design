# Logo Design — local site   


Local static site for Logo Design (formerly mirrored from an older studio template).

## Run

```bash
npm start
```

Open http://localhost:3000

## Pages (13) — all return 200

| Route | Sections |
|---|---|
| `/` | Hero (LOOKING SUSPICIOUSLY GOOD), About blurb, Selected Works, Services (THIS IS OUR THING), Testimonials, FAQ, Contact CTA / footer |
| `/about/` | Hero, Founders story, Team size, Team grid, Values (5), Range, Contact CTA / footer |
| `/work/` | Hero, All 8 project cards, Contact CTA / footer |
| `/work/heygluco/` | Case header, Context, Solution, gallery, More Works, footer |
| `/work/bagel-bar/` | Case header, Context, Solution, gallery, More Works, footer |
| `/work/tanti-maria/` | Case header, Context, Solution, gallery, More Works, footer |
| `/work/munchies-and-cream/` | Case header, Context, Solution, gallery, More Works, footer |
| `/work/mvp/` | Case header, Context, Solution, gallery, More Works, footer |
| `/work/yum-yum/` | Case header, Context, Solution, gallery, More Works, footer |
| `/work/merci/` | Case header, Context, Solution, gallery, More Works, footer |
| `/work/lpi/` | Case header, Context, Solution, gallery, More Works, footer |
| `/404/` | Not Found utility |
| `/401/` | Protected Page utility |

## What’s included

- HTML for every public page
- Webflow CSS + custom fonts (MD Nichrome, Neue Montreal)
- GSAP + ScrollTrigger + DrawSVG + Lenis
- Images, videos, Lottie JSON, posters (~364 asset files)

## Re-sync from live

```bash
npm run mirror
node scripts/full-crawl.js
node scripts/repair-missing.js
node scripts/ensure-page-assets.js
node scripts/verify-local.js
```
