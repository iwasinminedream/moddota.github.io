# ModDota Site – Copilot Instructions

## Quick Start (Read This First)

**Architecture in one sentence**: An Astro 5 static site that mixes Markdown/MDX articles (Astro content collections) with interactive API reference pages powered by React islands, all consuming `@moddota/dota-data`.

**Essential dev commands**:
- `npm run dev` – Astro dev server with HMR (port 4321)
- `npm run build` – prebuild (copies dota-data) → `astro build` → `dist/`
- `npm run preview` – serve `dist/` locally
- `npm run lint` / `npm run fix:prettier` – Prettier check / fix

**Critical conventions**:
- **Path aliases**: `~components/` → `src/components/api/`, `~data/` → `src/data/` (configured in both `astro.config.mjs` and `tsconfig.json`)
- **Theming**: CSS custom properties (`--color-*`) in `src/styles/global.css`, toggled via `data-theme="dark"` attribute on `<html>`, persisted in `localStorage`. Never hardcode colors.
- **Data source**: All API data comes from `@moddota/dota-data`; the `prebuild` script copies `files/` and `lib/` from a sibling `dota-data/` directory into `node_modules/@moddota/dota-data/`
- **React islands**: API interactive components use `client:load` – they hydrate immediately on page load
- **Routing**: Astro file-based routing, clean URLs (no hash router)

---

## Project Architecture

### Single Astro Application

```
Astro 5 (output: 'static')
├── Markdown articles → src/content/articles/ → ArticleLayout.astro → [...slug].astro
└── API browser pages → src/pages/api/*.astro → ApiLayout.astro → React islands (client:load)
                                                                  ↑
                                                  imports scope from src/data/<x>-data.ts
                                                                  ↑
                                                  imports raw data from @moddota/dota-data
```

The site is **fully pre-rendered** (no server runtime). React components only run client-side after hydration.

### Folder Structure

```
moddota.github.io-1/
├── astro.config.mjs            # Integrations: react, mdx, @tailwindcss/vite; Vite path aliases; remark plugins
├── tsconfig.json               # Extends astro/tsconfigs/strict; path aliases
├── package.json                # Scripts; prebuild copies dota-data
├── public/                     # Static assets served as-is
│   ├── images/
│   │   ├── heroes/             # Hero portraits (133 files)
│   │   ├── items/              # Item icons (601 files)
│   │   ├── spellicons/         # Ability icons (1421 files)
│   │   └── logo.svg, favicon.ico
│   └── videos/
├── src/
│   ├── content.config.ts       # Astro content collection schema (Zod)
│   ├── content/articles/       # Markdown/MDX articles (the only collection)
│   ├── layouts/
│   │   ├── ArticleLayout.astro # Article shell: navbar, sidebar, content area
│   │   └── ApiLayout.astro     # API shell: theme init, loading spinner placeholder
│   ├── pages/                  # File-based routing
│   │   ├── index.astro         # Homepage (renders articles/index.md if present)
│   │   ├── [...slug].astro     # Dynamic article routing (getStaticPaths)
│   │   ├── new-article.astro   # Article editor page (ArticleEditor React island)
│   │   └── api/
│   │       ├── index.astro     # API hub
│   │       ├── vscripts.astro  # Lua API
│   │       ├── events.astro    # Game events
│   │       ├── convars.astro   # Console variables
│   │       ├── modifiers.astro # Modifiers
│   │       ├── abilities.astro # Abilities
│   │       ├── changelog/index.astro
│   │       ├── changelog/[version].astro
│   │       └── panorama/{api,css,events}.astro
│   ├── data/                   # Scope wrappers around @moddota/dota-data
│   │   ├── vscripts-data.ts        # Lua API → vscriptsScope
│   │   ├── events-data.ts          # Game events → eventsScope
│   │   ├── panorama-api-data.ts    # Panorama JS API → panoramaApiScope
│   │   ├── panorama-css-data.ts    # Panorama CSS → panoramaCssScope
│   │   ├── panorama-events-data.ts # Panorama events → panoramaEventsScope
│   │   └── sidebar.ts              # Static article sidebar tree
│   ├── components/
│   │   ├── api/                # React components for the API browser
│   │   │   ├── pages/          # Page-level components imported by api/*.astro
│   │   │   │   ├── VScriptsPage.tsx
│   │   │   │   ├── EventsPage.tsx
│   │   │   │   ├── ConvarsPage.tsx
│   │   │   │   ├── ModifiersPage.tsx
│   │   │   │   ├── AbilitiesPage.tsx
│   │   │   │   ├── ChangelogPage.tsx
│   │   │   │   └── PanoramaApiPage.tsx, PanoramaCssPage.tsx, PanoramaEventsPage.tsx
│   │   │   ├── DeclarationsPage.tsx  # Generic list/detail view (NavBar + Sidebar + ContentList)
│   │   │   ├── Lists.tsx             # LazyList (react-virtualized) + ScrollableList
│   │   │   ├── Search/index.tsx      # Search box, fuzzy filter, availability filters
│   │   │   ├── AppContext.tsx        # App-level React context (theme, search)
│   │   │   ├── KindIcon/             # SVG icons for declaration kinds (Class, Enum, ...)
│   │   │   ├── layout/
│   │   │   │   ├── NavBar.tsx        # Top nav with route links + theme toggle
│   │   │   │   └── Sidebar.tsx       # Left sidebar with declaration list
│   │   │   └── Docs/
│   │   │       ├── api.ts            # Type definitions (Declaration, ClassDeclaration, ...)
│   │   │       ├── DeclarationsContext.ts  # React context: { root, declarations }
│   │   │       ├── ClassDeclaration.tsx, FunctionDeclaration.tsx, Enum.tsx, Constant.tsx, CssProperty.tsx
│   │   │       ├── Field.tsx, ContentList.tsx, AvailabilityBadge.tsx
│   │   │       ├── ColoredSyntax.tsx, ReferencesLink.tsx, Star.tsx
│   │   │       ├── types.tsx         # Type rendering components
│   │   │       └── utils/
│   │   │           ├── filtering.tsx # doSearch() with operators (on:server, type:X, ...)
│   │   │           ├── components.tsx, styles.tsx
│   │   ├── articles/                 # Article-specific Astro components (wrappers around the React ones)
│   │   │   └── ArticleSidebar.astro, Gfycat.astro, YouTube.astro, MultiCodeBlock.astro, StaticVideo.astro, Tabs.astro, TabItem.astro, ArticleEditor.tsx
│   │   ├── Gfycat.tsx, YouTube.tsx, StaticVideo.tsx, MultiCodeBlock.tsx  # React versions used in MDX
│   ├── utils/
│   │   ├── fuzzySearch.ts            # fuzzyMatch(), fuzzyContains(), fuzzySort()
│   │   └── types.tsx                 # isNotNil, intersperse, assertNever
│   ├── plugins/
│   │   ├── remark-components.mjs     # Converts <YouTube>, <Gfycat>, <StaticVideo> tags in markdown to iframes
│   │   └── remark-remove.mjs         # Strips lines marked with @remove-next-line / @remove-line
│   └── styles/
│       └── global.css                # Tailwind import + theme custom properties (light/dark)
├── _articles/                  # ⚠️ Legacy markdown source (parallel to src/content/articles/) — kept for prettier ignore rules
└── .github/workflows/
    ├── deploy.yml              # GitHub Pages deployment
    ├── ci.yml                  # CI checks
    └── dependabot.yml
```

### Data Flow

```
sibling dota-data/ repo (files/ + lib/)
    ↓ (prebuild script copies into node_modules/@moddota/dota-data)
@moddota/dota-data
    ↓ (imported in src/data/<x>-data.ts)
Scope objects: { root: '/path', declarations: Declaration[] }
    ↓ (imported by React Page components in src/components/api/pages/)
DeclarationsPage → NavBar + Sidebar + ContentList
    ↓ (useFilteredData hook)
Filtered/searched declarations → rendered by ClassDeclaration / FunctionDeclaration / Enum / etc.
```

### Key Data Types

The `Declaration` union type (in `src/components/api/Docs/api.ts`) is the core data model:
- `ClassDeclaration` – classes/interfaces with members (functions + fields)
- `FunctionDeclaration` – standalone functions
- `Enum` – enums with named integer members
- `Constant` – named numeric constants
- `CssProperty` – CSS properties with examples

`DeclarationsContextType` (in `src/components/api/Docs/DeclarationsContext.ts`):
```ts
{ root: string; declarations: Declaration[] }
```

### Theme System

Two themes (light/dark) defined via CSS custom properties in `src/styles/global.css`:
- Light is the default (`:root` and `@media (prefers-color-scheme: light)`)
- Dark activates via `[data-theme="dark"]` attribute on `<html>`, persisted in `localStorage["theme"]`

Key CSS variables: `--color-highlight` (#89a62e ModDota green), `--color-text`, `--color-text-dim`, `--color-group`, `--color-group-border`, `--color-sidebar`, `--color-syntax-*`.

---

## Development Workflows

### Dev Server

```bash
npm install         # First time only
npm run dev         # Astro dev server with HMR
```

Opens at `http://localhost:4321`. Article changes hot-reload. React components hot-reload via Vite HMR.

### Production Build

```bash
npm run build       # prebuild (copy dota-data) → astro build → dist/
npm run preview     # Preview the built site locally
```

The `prebuild` step (`package.json:11`) searches for sibling `dota-data` at `./dota-data`, `../dota-data`, or `../../dota-data`, then copies its `files/` and `lib/` directories into `node_modules/@moddota/dota-data/`.

### Deployment

GitHub Pages via `.github/workflows/deploy.yml`. Triggered on push to `source` branch, manual dispatch, or external `dota-data-updated` repository_dispatch event. Builds `dist/` and pushes to `gh-pages` branch. Base URL: `/moddota.github.io/`.

---

## Key Patterns & Conventions

### Astro Page → React Island Pattern

API pages are thin Astro wrappers around React Page components. Each page component self-imports its scope from `src/data/<x>-data.ts`:

```astro
---
// src/pages/api/vscripts.astro
import ApiLayout from '../../layouts/ApiLayout.astro';
import { VScriptsPage } from '../../components/api/pages/VScriptsPage';
---

<ApiLayout title="Lua API">
  <VScriptsPage client:load />
</ApiLayout>
```

```ts
// src/data/vscripts-data.ts
import { allData } from '@moddota/dota-data/lib/helpers/vscripts';
import type { DeclarationsContextType } from '../components/api/Docs/DeclarationsContext';

export const vscriptsScope: DeclarationsContextType = {
  root: '/vscripts',
  declarations: allData
    .map((declaration) => ({ ...declaration, isStarred: false }))
    .sort((a, b) => a.name.localeCompare(b.name)),
};
```

`client:load` ensures the React component hydrates as soon as the page loads (not pre-rendered).

### Article Content Collection Pattern

Articles live in `src/content/articles/` as Markdown/MDX files with frontmatter:

```markdown
---
title: My Article
author: AuthorName
steamId: '76561198000000000'
date: 06.04.2026
---

Article content here. You can embed:

<YouTube id="abc123" />
<Gfycat id="cooluniqueid" />
<StaticVideo path="my-video.mp4" controls />
```

Schema validated by Zod in `src/content.config.ts`. Rendered via `src/pages/[...slug].astro` + `ArticleLayout.astro`. The `<YouTube>`, `<Gfycat>`, `<StaticVideo>` tags are processed by the `remark-components` plugin into iframes — no React import needed.

### Search & Filtering

- `useRouterSearch()` reads `?search=` from the URL
- `useFilteredData(declarations, availabilityFilters)` orchestrates search + scope filtering
- `doSearch()` in `Docs/utils/filtering.tsx` supports special operators: `on:server`, `on:client`, `-on:server`, `is:abstract`, `type:TypeName`
- Name matching uses fuzzy search (`fuzzyContains` from `src/utils/fuzzySearch.ts`)
- Search results sorted by fuzzy match relevance score

### Virtualized Lists

For large datasets (e.g., 1000+ VScripts declarations), `LazyList` from `Lists.tsx` wraps react-virtualized's `List` + `CellMeasurer`. Use `ScrollableList` for shorter lists where measuring isn't needed.

### Theming in React Components

Use CSS custom properties instead of theme tokens or styled-components:

```tsx
<div style={{ color: 'var(--color-text)', background: 'var(--color-group)' }} />
```

Or via class-based CSS:
```css
.my-component {
  background-color: var(--color-group);
  border: 1px solid var(--color-group-border);
}
```

---

## Integration with dota-data

### npm Package Dependency

`package.json` declares `"@moddota/dota-data": "^0.45.0"`. The prebuild script overlays a fresh local copy of the sister project's `files/` and `lib/` directories.

### Import Paths

| Import | Data |
|--------|------|
| `@moddota/dota-data/lib/helpers/vscripts` | Processed Lua API declarations (`allData`) |
| `@moddota/dota-data/files/events` | Game events (vscripts) |
| `@moddota/dota-data/files/panorama/api` | Panorama JS API interfaces |
| `@moddota/dota-data/files/panorama/css` | Panorama CSS properties |
| `@moddota/dota-data/files/panorama/enums` | Panorama enums |
| `@moddota/dota-data/files/panorama/events` | Panorama events |
| `@moddota/dota-data/files/vscripts/api-types` | VScript type definitions |
| `@moddota/dota-data/files/vscripts/modifier_list.json` | Modifier names by category |
| `@moddota/dota-data/files/convars.json` | Console variables |

### Changelog Data

Changelog data is fetched at runtime from `/changelog-data/...` URLs. In dev, an Astro middleware (`astro.config.mjs`) serves these from sibling `dota-data/files/`. In production they're available from the same path on the deployed site (likely served from public/ or by a build step — verify in deploy.yml when adding new versions).

---

## Adding Features Checklist

1. **New API page** → Create `src/pages/api/<name>.astro` wrapping a React component with `client:load`. Create matching `<Name>Page.tsx` in `src/components/api/pages/` and a scope file in `src/data/<name>-data.ts`. Add NavBar link in `src/components/api/layout/NavBar.tsx`.
2. **New custom API page (non-DeclarationsPage)** → Create React component in `src/components/api/pages/`, write its own UI (e.g. `ChangelogPage` doesn't reuse `DeclarationsPage`).
3. **New search operator** → Add to `doSearch()` in `src/components/api/Docs/utils/filtering.tsx`.
4. **New declaration kind** → Add to `Declaration` union in `Docs/api.ts`, create rendering component, add `case` in `ContentList.tsx` `renderItem`.
5. **New theme tokens** → Add CSS variables to both light (`:root`, `@media (prefers-color-scheme: light)`) and dark (`[data-theme="dark"]`) sections in `src/styles/global.css`.
6. **New article** → Create `.md` (or `.mdx`) file in `src/content/articles/` with frontmatter. Add an entry to `src/data/sidebar.ts` for navigation.
7. **New article component** → Add a `.astro` component in `src/components/articles/`. To make it usable in plain markdown (without MDX import), also wire it through `src/plugins/remark-components.mjs`.
8. **New static asset** → Drop into `public/`. References use `/images/...` (Astro automatically prepends the base path in production).
