# Task: Migrate ModDota site from Docusaurus + Webpack SPA to Astro + React

## Context

This is the ModDota website — a documentation site for Dota 2 modding community. It currently consists of two separate applications:

1. **Docusaurus site** (root) — ~75 markdown articles about Dota 2 modding
2. **React SPA** (`api/` directory) — API documentation browser (Lua API, Panorama API, Game Events, Abilities, Modifiers, Convars, Changelog)

Both are deployed to GitHub Pages at `https://iwasinminedream.github.io/moddota.github.io/`.

## Your Task

Migrate the entire site to a single **Astro** project with **React islands** and **Tailwind CSS**, following the detailed plan in `MIGRATION_PLAN.md`.

## How to Work

1. **Read `MIGRATION_PLAN.md` completely first** — it contains the full architecture, file inventory, component mapping, data dependencies, and phase-by-phase instructions.
2. **Create a new branch** `feat/astro-migration` from `source`.
3. **Follow the phases in order** — Phase 1 (setup) → Phase 2 (articles) → Phase 3 (API) → Phase 4 (features) → Phase 5 (build/deploy) → Phase 6 (cleanup).
4. **Test after each phase** — run `npm run build` and `npm run dev` to verify nothing is broken.
5. **Do NOT delete the old code until Phase 6** — keep it as reference.

## Critical Requirements

- **URLs must not change** — `/moddota.github.io/` for articles, `/moddota.github.io/api/` for API docs
- **All data from `@moddota/dota-data` must work** — see the imports list in `MIGRATION_PLAN.md` "Critical Data Dependencies" section
- **Dark mode must work** — extract current theme colors from `api/src/components/Themes.tsx` into CSS custom properties
- **Mobile responsive** — the API site navbar needs a burger menu on mobile (already partially implemented, see `api/src/components/layout/NavBar.tsx`)
- **Interactive article editor** — `/new-article` page with split-view (editor left, live markdown preview right). See Phase 4.6 in the plan for full spec.
- **Deploy must work** — GitHub Actions in `.github/workflows/deploy.yml` must build and deploy the single Astro site

## Key Files to Study Before Starting

| File | What it tells you |
|------|------------------|
| `MIGRATION_PLAN.md` | Complete migration plan with all details |
| `api/src/pages/data.ts` | Central data layer — how all API data is loaded and transformed |
| `api/src/components/Themes.tsx` | All theme colors (light/dark) to extract |
| `api/src/index.tsx` | Current app structure, routing, layout |
| `api/src/components/layout/NavBar.tsx` | Current navbar with burger menu |
| `api/src/pages/index.tsx` | All page routes and lazy imports |
| `api/src/components/Docs/` | All declaration rendering components |
| `api/src/components/Search/index.tsx` | Search + availability filters |
| `api/src/components/Lists.tsx` | ScrollableList + LazyList (react-virtualized) |
| `api/src/utils/fuzzySearch.ts` | Fuzzy search algorithm (keep as-is) |
| `docusaurus.config.js` | Current Docusaurus config (navbar, Algolia, plugins) |
| `docusaurus/remark-component-provider.js` | How article components are auto-injected |
| `docusaurus/remark-remove.js` | Code line removal remark plugin |
| `sidebars.json` | Article sidebar structure |
| `src/pages/new-article.tsx` | Current article editor (to be upgraded) |
| `_articles/` | All markdown articles |
| `.github/workflows/deploy.yml` | Current deploy workflow |

## Tech Stack Target

- **Astro 5** — static site generator, file-based routing
- **React 18** — for interactive islands (search, lists, editor)
- **Tailwind CSS 4** — replaces styled-components + SCSS
- **@astrojs/mdx** — for articles with custom components
- **CodeMirror 6** (`@uiw/react-codemirror`) — for article editor
- **react-markdown** — for live preview in editor
- **react-virtualized** — keep for large API lists (LazyList)
- **Pagefind** — replaces Algolia DocSearch for article search
