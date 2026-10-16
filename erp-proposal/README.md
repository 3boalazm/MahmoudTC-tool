# CanvasOne ERP: Interactive Proposal (Code & Canvas)

A self-contained, bilingual (Arabic / English) interactive proposal for **CanvasOne ERP**, presented under the Code & Canvas brand for the Saudi and Egyptian markets.

It's pure HTML + CSS + vanilla JS: no build step, no external requests, and all fonts are hosted locally.

## Run it

```bash
# any static server works
python3 -m http.server 8080 --directory erp-proposal
# then open http://localhost:8080
```

- `?lang=en` or `?lang=ar` forces a language. The choice is also remembered in `localStorage`.
- The print button in the top bar (or Ctrl/Cmd+P) produces a branded A4 PDF: dark theme, one section per page, with the interactive builder hidden and all 12 modules listed in full. In the print dialog, enable **Background graphics** and set margins to **None**.

## Structure

```
erp-proposal/
├── index.html            # page skeleton (section shells + data-t bindings)
├── assets/
│   ├── js/data.js        # ALL copy and content, bilingual { ar, en }
│   ├── js/app.js         # rendering, i18n, interactions, effects
│   ├── css/style.css     # design system, glassmorphism, motion, responsive, print
│   ├── brand/            # Code & Canvas logos (SVG)
│   └── fonts/            # woff2 + OFL licences
```

## Editing content

Everything you'd want to change lives in **`assets/js/data.js`**. Every text field is `{ ar: '…', en: '…' }`.

| What | Where in `data.js` |
| --- | --- |
| Contact email, WhatsApp, booking link | `brand.email`, `brand.whatsapp`, `brand.bookingUrl` |
| Hero headline and dashboard mock numbers | `hero` |
| The 12 modules (name, summary, features, icon) | `modules` |
| Industries and their suggested modules | `sectors` |
| KSA / Egypt compliance items | `compliance.markets` |
| Implementation phases | `journey.steps` |
| FAQ | `faq` |

Some details to keep in mind:
- **Icons:** the `icon:` values must be names from the `ICONS` map at the top of `app.js`.
- **WhatsApp button:** it only appears when `brand.whatsapp` is set. Use international format without a `+`, e.g. `9665XXXXXXXX`.
- **`bookingUrl`:** a Calendly or Google Calendar link. When it's empty, the "Book a call" buttons fall back to email.
- **Package builder:** it never shows prices. Its timeline estimate is a rough guide, from `estimateWeeks()` in `app.js`.

## ⚠️ Review before publishing

Search the project for `// VERIFY`. These items need confirming:

1. **Contact details:** the real sales email, WhatsApp number and booking link.
2. **Compliance claims:**
   - KSA: ZATCA phase 2, VAT 15%, GOSI / WPS-Mudad, Hijri calendar.
   - Egypt: ETA e-invoice / e-receipt, VAT 14%, social insurance.

   They're worded as "integration-ready" and must match the certifications and features of the licensed ERP product.
3. **Module features and durations:** these must match what the underlying product actually ships with.

The proposal deliberately contains **no client counts, logos, testimonials or prices**. Add real ones only.

## Fonts & licences

All fonts are under the SIL Open Font License 1.1 (licence files in `assets/fonts/`). They're self-hosted and subset from @fontsource.

- **Alexandria:** Arabic headings
- **IBM Plex Sans Arabic:** Arabic body
- **Raleway:** English (the brand font)
- **Fraunces Italic:** English accent words
- **Comfortaa:** the wordmark (the brand font)

## Accessibility & performance

- **Reduced motion:** honours `prefers-reduced-motion`. Animations, tilt, parallax and the preloader delay are all disabled.
- **Pointer effects:** tilt, magnetic buttons and the cursor glow only run on fine-pointer devices.
- **Keyboard:** tabs, the FAQ and the builder chips are keyboard-accessible. Arrow keys move through the module grid, RTL-aware.
- **Footprint:** about 0.7 MB in total, with no third-party requests.
