# RETAW Solutions: S1 RO Water Purifier site

Static, dependency-free marketing site built for Vercel (flat structure, relative paths only).

```
index.html          Home
how-it-works.html   Filtration walkthrough (PCT step-through + RO membrane)
savings.html        Savings calculator
product.html        S1 specs, gallery, warranty & service
contact.html        Order form + direct contact
styles.css          Shared styles (brand tokens at the top)
app.js              Shared behaviour: nav, sticky CTA, reveals, calculator, step-through, gallery, form
assets/             Real brand assets only
```

## Deploy
Drag the folder into Vercel (or `vercel` from this directory). There's no build step.
Local preview: `python dev-server.py` then open http://localhost:5173 (it mimics Vercel's clean URLs,
so `/savings` works locally; plain `python -m http.server` won't serve extensionless links)

## Waiting on RETAW (do not fill with invented figures)
| What | Where |
|---|---|
| Whether the MVR 600 filter change also covers the RO membrane (2-year lifespan) | Not stated on the site; confirm with RETAW |
| Confirmed Facebook / Instagram URLs for @retawmv | `TODO(RETAW)` comments in each page footer |
| Warranty terms link (optional) | `product.html` → `TODO(RETAW)` |
| Testimonials / installation counts | None included; add only real, approved ones |

## Pricing (supplied by RETAW)
- S1 RO Water Purifier: **MVR 5,660**, installation free
- Filter change: **MVR 600, every 6 months**. Required, since the S1 can't clean water properly without it

Calculator values live in `CONFIG` in `app.js` (`machinePriceMVR`, `filterChangeCostMVR`, `filterChangesPerYear`).
Net savings over N years = bottled-water spend − MVR 5,660 − MVR 1,200 × N. If prices change, also update the
hard-coded figures in `index.html`, `savings.html`, `product.html` and `how-it-works.html`.

## Household estimate (supplied by RETAW)
The calculator's household-size buttons use: ~90 L drinking water per person per month ÷ 1.5 L bottles
= 60 bottles × ~MVR 7 = **MVR 420 per person, per month**. Values live in `CONFIG` (`litresPerPersonMonth`,
`bottleLitres`, `bottlePriceMVR`); the "How we estimate" explanation text is in `index.html` and `savings.html`.

## SEO
- Production domain assumed to be **https://www.retaw.mv/**. Canonicals, `og:url`, JSON-LD URLs, `robots.txt` and
  `sitemap.xml` all use it; change them together if the site lives elsewhere.
- Each page has a unique `<title>` + meta description, a canonical, Open Graph + Twitter Card tags
  (share image: `assets/og-image.jpg`, 1200×630) and JSON-LD: `LocalBusiness` on every page, `WebSite` on Home,
  `Product` + `Offer` (MVR 5,660, 2-year warranty) on the product page, `BreadcrumbList` on inner pages.
- Clean URLs: `vercel.json` sets `cleanUrls: true`, so pages are served at `/`, `/how-it-works`, `/savings`,
  `/product` and `/contact`, and any `*.html` request 308-redirects to the clean URL. Internal links, canonicals,
  `og:url`, JSON-LD and `sitemap.xml` all use the clean URLs; keep new pages consistent with that.
- Update `<lastmod>` in `sitemap.xml` when page content changes.
- `.vercelignore` keeps this README, tooling folders and unused source images out of the deployment.

## AI search / answer engines
- `robots.txt` explicitly allows AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, Google-Extended, PerplexityBot,
  ClaudeBot, Claude-SearchBot, CCBot, Applebot-Extended and others) as well as regular search engines.
- `llms.txt` at the site root is a plain-markdown summary of the business, key facts and main pages for AI systems.
  Keep its prices and contact details in sync with the pages.
- The Home page FAQ is mirrored in `FAQPage` JSON-LD in the Home `<head>`. If you edit a question or answer,
  update both so they match.
- All core content is in the static HTML. Only the Savings calculator results and chart are rendered by JavaScript,
  and their key facts also appear as plain text (price, filter cost, savings example in the FAQ).

## Connecting the order form
Set `data-endpoint` on the `<form data-order-form>` in `contact.html` to any POST endpoint
(Formspree, Basin, a Vercel function, etc.). Fields are sent as `FormData`:
`name, phone, email, island, message`. `company` is a honeypot and is removed before sending.
Until an endpoint is set, submitting opens a pre-filled email to info@retaw.mv.

## Assets
- `retaw-logo.png`: official logo (transparent, trimmed)
- `retaw-s1-product-photo.jpg`: original S1 photo; `retaw-s1-product-cutout.webp` is the same photo with the white background removed
- `retaw-faucet-glass-photo.jpg`: faucet/glass shot (source is only 257×551, so ask RETAW for a higher-res original)
- `retaw-pct-cartridge.svg`: vector redraw of RETAW's brochure PCT cutaway (4 layers). Leader lines line up with the How It Works markers at 12.5 / 34.7 / 57.6 / 87.3% height
- `retaw-ro-membrane.svg`: vector redraw of RETAW's brochure RO membrane illustration (spiral-wound membrane unrolling, with water flow), in the same style as the PCT cartridge. Used on Home and How It Works
- `retaw-pct-cartridge-diagram.jpg`, `retaw-ro-membrane-illustration.jpg`: original brochure images, no longer referenced (kept for reference)
- `ro-membrane-layers.jpg`: Wikimedia Commons photo (David Shankbone, CC BY 3.0), no longer referenced. If it's ever used again, its photo credit must go back on the page. Safe to delete
- `retaw-s1-product-cutout.png`: PNG fallback of the cut-out (not referenced; safe to delete)
