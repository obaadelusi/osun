---
description: Design and development rules for the official website of the Osun State Government. 
---

# Project

A static, multi-page concept website for the Government of Osun State, Nigeria (the pages carry a banner saying it is NOT the official site). Layout is inspired by manitoba.ca and accessibility patterns by ontario.ca. There is no build step or framework: plain HTML, one shared stylesheet and vanilla ES modules.

## Structure

- `index.html` — homepage. `index.php` is a leftover placeholder (links a non-existent `style.css`); do not build on it.
- `taxes/`, `tourism/`, `records/`, `laws/` — one folder per service area, each holding page(s) like `taxes/pay-your-taxes.html`. Pages in subfolders reference shared files with `../` (e.g. `../styles.css`).
- `styles.css` — the single stylesheet for every page. Colours, radius, container width and font are CSS variables in `:root` (`--green`, `--gold`, `--ink`, ...); reuse them instead of hard-coding values.
- `scripts/index.js` — one ES module shared by every page (mega menu, mobile menu, carousel, search suggestions, alert banner, feedback widget, print button, plan-your-visit and tax calculator logic). Page-specific code is guarded by checks for that page's elements.
- `i18n/index.js` + `i18n/en-yo.json` — language switching and translations.
- `assets/images/` — site images and SVG heroes.
- `scratch/` — throwaway Node test/build scripts, not part of the site.
- `.agents/` — local agent settings (git-ignored).

## Language

- Default Language is English.
- Yoruba, always rendered Yorùbá, is the alternative language. 
- Add Yoruba translations `i18n/en-yo.json` (code in `i18n/index.js`)
- English source text stays in the HTML. Mark translatable text with `data-i18n="key"` and translatable attributes with `data-i18n-attr="attr:key|attr2:key2"`. Put the matching Yorùbá under `yo` in `en-yo.json`. English strings that only exist in JS go under `en`.
- Keys are namespaced by page or area (e.g. `tax.meta.title`, `a11y.skip`). Reuse existing keys for shared text.
- Format dates with `<time data-date="YYYY-MM-DD">` so they localise automatically.
- Text a script renders itself must be re-rendered in the `onChange` callback passed to `createI18n` in `scripts/index.js`.
- Keep Yorùbá diacritics (tone marks and under-dots) intact.

## Design & Development

- In HTML, use `svg` and `path` to build custom icons.
- Keep the site static and dependency-free: no frameworks or bundlers. Only add a library if asked.
- Every page repeats the same shell (skip link, official top bar, alert banner, header and nav, footer). Keep the shell consistent when adding or editing pages.
- Accessibility matters: semantic landmarks, a skip link, `aria-*` labels on icons and controls, visible focus, and decorative SVGs marked `aria-hidden="true"`. Keep pages usable on mobile.
- Match the existing code style: 2-space indent, `const`/`let`, and comment headers in the `/* --- */` style already used.
- Browser storage (`localStorage`, `sessionStorage`) can throw, so wrap it in `try/catch`.
