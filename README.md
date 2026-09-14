# RETAW Solutions: S1 RO Water Purifier site

Static, dependency-free marketing site built for Vercel (flat structure, relative paths only).

```
index.html          Home
how-it-works.html   Filtration walkthrough (PCT step-through + RO membrane)
savings.html        Savings calculator
product.html        S1 specs, gallery, warranty & service
contact.html        Quote form + direct contact
styles.css          Shared styles (brand tokens at the top)
app.js              Shared behaviour: nav, sticky CTA, reveals, calculator, step-through, gallery, form
assets/             Real brand assets only
```

## Deploy
Drag the folder into Vercel (or `vercel` from this directory). There's no build step.
Local preview: `python -m http.server 5173`

## Waiting on RETAW (do not fill with invented figures)
| What | Where |
|---|---|
| PCT element replacement cost (MVR) | `app.js` → `CONFIG.pctElementCostMVR` |
| RO membrane replacement cost (MVR) | `app.js` → `CONFIG.roMembraneCostMVR` |
| S1 retail price | Intentionally not shown; the site is quote-based |
| Confirmed Facebook / Instagram URLs for @retawmv | `TODO(RETAW)` comments in each page footer |
| Warranty terms link (optional) | `product.html` → `TODO(RETAW)` |
| Testimonials / installation counts | None included; add only real, approved ones |

While the two cost values are `null`, the calculator shows bottled-water spend avoided and marks
running costs as a **placeholder / pending from RETAW**. Once real figures go in, it deducts them
automatically: 2 PCT elements a year (6-month interval) and 1 membrane per 2 years (2-year lifespan).

## Connecting the quote form
Set `data-endpoint` on the `<form data-quote-form>` in `contact.html` to any POST endpoint
(Formspree, Basin, a Vercel function, etc.). Fields are sent as `FormData`:
`name, phone, email, island, message`. `company` is a honeypot and is removed before sending.
Until an endpoint is set, submitting opens a pre-filled email to info@retaw.mv.

## Assets
- `retaw-logo.png`: official logo (transparent, trimmed)
- `retaw-s1-product-photo.jpg`: original S1 photo; `retaw-s1-product-cutout.webp` is the same photo with the white background removed
- `retaw-faucet-glass-photo.jpg`: faucet/glass shot (source is only 257×551, so ask RETAW for a higher-res original)
- `retaw-pct-cartridge-diagram.jpg`, `retaw-ro-membrane-illustration.jpg`: from the brochure, with the brochure text cropped off
- `retaw-s1-product-cutout.png`: PNG fallback of the cut-out (not referenced; safe to delete)
