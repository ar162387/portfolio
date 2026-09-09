# Vibe Coderzz — software, AI & growth studio

A multi-page studio website built with Next.js 16, React 19, TypeScript, and Tailwind CSS. The visual identity combines warm ivory, ink, burnt orange, editorial typography, and a contained orbital hero.

## Run locally

```sh
npm install
npm run dev
```

Production verification:

```sh
npm run lint
npm run build
npm run start
```

## Content and structure

- `src/data/studio.ts`: service taxonomy, offer details, project corrections, studio notes, and site URL.
- `src/data/content.ts`: original project records and legacy resume content.
- `src/components/studio/Shared.tsx`: reusable server-rendered sections.
- `src/components/studio/Interactive.tsx`: navigation, project filtering, the guided email brief, and pointer-responsive orbital motion.
- `src/components/studio/Experience.tsx`: motion preferences, scroll methodology, service disclosures and diagrams, screenshot explorer, reading guide, and studio principles.
- `src/app/experience.css`: interaction states and motion treatments.
- `src/app/globals.css`: responsive design system.

There are 26 public content pages: home, services, work, studio, insights, contact, 12 service details, five case studies, and three editorial notes. The old `/resume` route remains accessible with noindex metadata and no automatic print dialog.

## Contact

The three-step enquiry form retains answers while moving between direction, project details, and contact information. It validates a brief and creates an encoded `mailto:` draft addressed to the existing studio email. The visitor reviews and sends it in their email app. It does not store submissions or claim a message was sent. Direct email is available as an alternative. A server-side delivery provider can replace this flow when credentials and delivery requirements are available.

## Search foundations

The canonical production origin is `https://www.vibecoderzz.com`. Set `NEXT_PUBLIC_SITE_URL` only when intentionally changing that origin. Pages have unique titles and descriptions, canonical URLs, indexable HTML, internal links, and social previews. The site generates `/sitemap.xml`, `/robots.txt`, Organization schema, and Service schema. No business results, review ratings, or ranking guarantees were invented.

After deployment, verify the production domain in Google Search Console, submit the sitemap, and inspect representative pages. Analytics is intentionally unconfigured until a real property and measurement requirements are supplied. Preview deployments should be protected or configured with noindex at the hosting layer.

Reference: [Google Search Central developer guide](https://developers.google.com/search/docs/fundamentals/get-started-developers).

## Performance and accessibility

Public pages are prerendered. No Three.js, WebGL, animation framework, custom cursor, or smooth-scroll library is shipped. The hero uses a CSS effect that pauses outside the viewport, when the browser tab is hidden, and on user request. Reduced-motion preferences disable animation. Project images use Next.js responsive image optimisation with lazy loading except for the main case-study image.

Native controls, labelled inputs, keyboard focus styles, Escape dismissal, a skip link, responsive navigation, and native FAQ and service disclosures are included. Service disclosures work without JavaScript. A direct email fallback is available when scripts are disabled.

The methodology tracks the current stage during scrolling. Case studies have thumbnail, swipe, and keyboard image navigation with a native modal viewer. Articles have section navigation that tracks reading position. The studio page includes an interactive principles study. A footer motion switch persists the visitor’s preference, and system reduced-motion settings take precedence. Animations pause offscreen or in hidden tabs. No new animation dependencies were added.

See `docs/REBRAND.md` for the audit, decisions, and launch boundary.
