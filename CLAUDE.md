# ModDota Site & API – Copilot Instructions

## Quick Start (Read This First)

**Architecture in one sentence**: An Astro 5 static site with React islands – articles rendered as Astro content collections, API reference pages powered by interactive React components loaded via `client:only="react"`, all consuming `@moddota/dota-data`.

**Essential dev commands**:
- `npm run dev` – Astro dev server with HMR
- `npm run build` – full production build → `dist/`
- `npm run preview` – preview the built site locally
- `npm run lint` – Prettier check
- `npm run fix:prettier` – Prettier auto-fix

**Critical conventions**:
- **Path aliases**: `~components/` → `src/components/api/`, `~data/` → `src/data/` (configured in both `astro.config.mjs` and `tsconfig.json`)
- **Theming**: CSS custom properties (`--color-*`) in `src/styles/global.css`, toggled via `data-theme="dark"` attribute on `<html>` – never hardcode colors
- **Data source**: All API data comes from `@moddota/dota-data`; prebuild script copies `files/` and `lib/` from sibling `dota-data` directory
- **React islands**: API interactive components use `client:only="react"` – they render only in the browser, not during SSG
- **Routing**: Astro file-based routing, clean URLs (no hash router)

---

## Project Architecture

### Single Astro Application

The site is a unified Astro 5 project with two main sections:

1. **Articles** – Astro content collections (`src/content/articles/`) rendered via `ArticleLayout.astro`
   - Content schema: `src/content.config.ts` (Zod: title, author, steamId, date)
   - Sidebar: `src/data/sidebar.ts` (static tree structure)
   - Dynamic routing: `src/pages/[...slug].astro`

2. **API Reference** – Astro pages wrapping React islands
   - Layout: `src/layouts/ApiLayout.astro`
   - Pages: `src/pages/api/*.astro` (vscripts, events, convars, modifiers, abilities, panorama/*)
   - React components: `src/components/api/` (loaded via `client:only="react"`)
   - Data loading: `src/data/api-data.ts` (transforms `@moddota/dota-data` into scopes)

### Folder Structure

```
moddota.github.io-1/
├── astro.config.mjs            # Astro config: React, MDX, Tailwind, Vite aliases
├── tsconfig.json               # Extends astro/tsconfigs/strict, path aliases
├── package.json                # Scripts, dependencies, Prettier config
├── src/
│   ├── content.config.ts       # Astro content collections schema (Zod)
│   ├── layouts/
│   │   ├── ApiLayout.astro     # API pages shell: theme init, loading spinner
│   │   └── ArticleLayout.astro # Article pages: navbar, sidebar, content area
│   ├── pages/
│   │   ├── index.astro         # Homepage
│   │   ├── [...slug].astro     # Dynamic article routing
│   │   ├── new-article.astro   # Article editor page
│   │   └── api/
│   │       ├── index.astro     # API index/redirect
│   │       ├── vscripts.astro  # Lua API
│   │       ├── events.astro    # Game Events
│   │       ├── convars.astro   # Console Variables
│   │       ├── modifiers.astro # Modifiers
│   │       ├── abilities.astro # Abilities
│   │       ├── changelog/
│   │       │   ├── index.astro
│   │       │   └── [version].astro
│   │       └── panorama/
│   │           ├── api.astro   # Panorama JS API
│   │           ├── css.astro   # Panorama CSS Properties
│   │           └── events.astro # Panorama Events
│   ├── components/
│   │   ├── api/                # React components for API reference
│   │   │   ├── AppContext.tsx   # React context: dark mode state
│   │   │   ├── DeclarationsPage.tsx # Main page component: sidebar + content
│   │   │   ├── Lists.tsx       # LazyList (react-virtualized) + ScrollableList
│   │   │   ├── Search/
│   │   │   │   └── index.tsx   # SearchBox, filters, useRouterSearch
│   │   │   ├── Docs/
│   │   │   │   ├── api.ts      # Declaration types (Class, Function, Enum, Constant, CssProperty)
│   │   │   │   ├── ClassDeclaration.tsx
│   │   │   │   ├── FunctionDeclaration.tsx
│   │   │   │   ├── Field.tsx
│   │   │   │   ├── Enum.tsx
│   │   │   │   ├── Constant.tsx
│   │   │   │   ├── CssProperty.tsx
│   │   │   │   ├── ContentList.tsx
│   │   │   │   ├── DeclarationsContext.ts
│   │   │   │   ├── types.tsx   # Type rendering components
│   │   │   │   └── utils/      # filtering.tsx, components.tsx, styles.tsx
│   │   │   ├── pages/          # Page-specific React components
│   │   │   │   ├── AbilitiesPage.tsx
│   │   │   │   ├── ChangelogPage.tsx
│   │   │   │   ├── ConvarsPage.tsx
│   │   │   │   └── ModifiersPage.tsx
│   │   │   ├── layout/
│   │   │   │   ├── NavBar.tsx  # Top nav with route links + theme toggle
│   │   │   │   ├── Sidebar.tsx # Left sidebar with declaration list
│   │   │   │   └── index.tsx   # Layout wrapper
│   │   │   └── KindIcon/       # SVG icons for declaration kinds
│   │   ├── articles/           # Article-specific components
│   │   │   ├── ArticleEditor.tsx
│   │   │   ├── ArticleSidebar.astro
│   │   │   ├── Gfycat.astro
│   │   │   ├── MultiCodeBlock.astro
│   │   │   ├── StaticVideo.astro
│   │   │   ├── Tabs.astro / TabItem.astro
│   │   │   └── YouTube.astro
│   │   ├── Gfycat.tsx          # Shared React components
│   │   ├── MultiCodeBlock.tsx
│   │   ├── StaticVideo.tsx
│   │   └── YouTube.tsx
│   ├── content/
│   │   └── articles/           # Markdown articles (content collection)
│   ├── data/
│   │   ├── api-data.ts         # Transforms @moddota/dota-data → scopes for React components
│   │   └── sidebar.ts          # Article sidebar tree definition
│   ├── styles/
│   │   └── global.css          # Tailwind import + CSS custom properties (light/dark themes)
│   ├── plugins/
│   │   ├── remark-remove.mjs   # Remark plugin: strips content
│   │   └── remark-components.mjs # Remark plugin: injects components
│   └── utils/
│       ├── fuzzySearch.ts      # Fuzzy matching: fuzzyMatch(), fuzzyContains(), fuzzySort()
│       └── types.tsx           # isNotNil, intersperse, assertNever
├── public/                     # Static assets (images, favicon)
├── dist/                       # Build output (not committed)
└── .github/workflows/
    ├── deploy.yml              # GitHub Pages deployment
    └── ci.yml                  # CI checks
```

### Data Flow

```
dota-data repo (files/ + lib/)
    ↓ (prebuild script copies to node_modules)
@moddota/dota-data package
    ↓ (imported in src/data/api-data.ts)
scopes object: { vscripts, vscriptsEvents, panorama, panoramaCss, panoramaEvents }
    ↓ (passed as props to React islands in .astro pages)
DeclarationsPage (client:only="react") → NavBar + Sidebar + ContentList
    ↓ (useFilteredData hook)
Filtered/searched declarations → rendered by ClassDeclaration/FunctionDeclaration/Enum/etc.
```

### Key Data Types

The `Declaration` union type (in `src/components/api/Docs/api.ts`) is the core data model:
- `ClassDeclaration` – classes/interfaces with members (functions + fields)
- `FunctionDeclaration` – standalone functions
- `Enum` – enums with named integer members
- `Constant` – named numeric constants
- `CssProperty` – CSS properties with examples

### Theme System

Two themes (light/dark) defined via CSS custom properties in `src/styles/global.css`.
Theme toggled by setting `data-theme="dark"` on `<html>`, persisted in `localStorage` key `"theme"`.

Key CSS variables:
- `--color-group` – card/panel background
- `--color-group-members` – inner content area background
- `--color-group-border` – card border color
- `--color-group-shadow` – card box-shadow
- `--color-highlight` – accent color (#89a62e)
- `--color-text` / `--color-text-dim` / `--color-text-faded` – text hierarchy
- `--color-sidebar` – sidebar background
- `--color-searchbox-*` – search input styling
- `--color-syntax-*` – code syntax highlighting colors

---

## Development Workflows

### Dev Server

```bash
npm run dev              # Astro dev server with HMR
```

### Production Build

```bash
npm run build            # prebuild (copy dota-data) → astro build → dist/
npm run preview          # Preview built site locally
```

### Syncing dota-data Changes

The `prebuild` script in `package.json` searches for the sibling `dota-data` directory and copies `files/` and `lib/` into `node_modules/@moddota/dota-data/`. The Vite aliases in `astro.config.mjs` resolve `~components` and `~data` paths.

### Deployment

GitHub Pages via `.github/workflows/deploy.yml`. Base URL: `/moddota.github.io/`.

---

## Key Patterns & Conventions

### Astro Page → React Island Pattern

Every API page follows this pattern:

```astro
---
import ApiLayout from '../../layouts/ApiLayout.astro';
import { DeclarationsPage } from '../../components/api/DeclarationsPage';
import { scopes } from '../../data/api-data';
---

<ApiLayout title="Page Title">
  <DeclarationsPage
    client:only="react"
    context={scopes.myScope}
    hoist={[
      { label: "Functions", icon: "function", scope: "functions" },
    ]}
  />
</ApiLayout>
```

The `client:only="react"` directive ensures the component is only rendered in the browser (no SSR).

### Article Content Collection Pattern

Articles live in `src/content/articles/` as Markdown files with frontmatter:

```markdown
---
title: My Article
author: AuthorName
steamId: "12345"
date: "2024-01-15"
---

Article content here...
```

Schema validated by Zod in `src/content.config.ts`. Rendered via `src/pages/[...slug].astro` + `ArticleLayout.astro`.

### Custom Page Pattern (modifiers, convars, changelog, abilities)

Pages that need custom layouts have dedicated React components in `src/components/api/pages/`:
- `AbilitiesPage.tsx`
- `ConvarsPage.tsx`
- `ModifiersPage.tsx`
- `ChangelogPage.tsx`

### Search & Filtering

- `useRouterSearch()` reads `?search=` from URL
- `useFilteredData(declarations, availabilityFilters)` orchestrates search + scope filtering
- `doSearch()` in `Docs/utils/filtering.tsx` supports special operators: `on:server`, `on:client`, `-on:server`, `is:abstract`, `type:TypeName`
- Name matching uses fuzzy search (`fuzzyContains` from `utils/fuzzySearch.ts`)
- Search results sorted by fuzzy match relevance score

### Virtualized Lists

For large datasets, `LazyList` (react-virtualized) is used during search, `ScrollableList` for browsing.

### Theming in React Components

Use CSS custom properties instead of styled-components theme tokens:

```tsx
// Use CSS variables
<div style={{ color: 'var(--color-text)', background: 'var(--color-group)' }} />

// Or in CSS/class-based styling
.my-component {
  background-color: var(--color-group);
  border: 1px solid var(--color-group-border);
}
```

---

## Integration with dota-data

### npm Package Dependency

`package.json` declares `"@moddota/dota-data": "^0.45.0"`.

### Import Paths

| Import | Data |
|--------|------|
| `@moddota/dota-data/lib/helpers/vscripts` | Processed Lua API declarations |
| `@moddota/dota-data/files/events` | Game events (vscripts) |
| `@moddota/dota-data/files/panorama/api` | Panorama JS API interfaces |
| `@moddota/dota-data/files/panorama/css` | Panorama CSS properties |
| `@moddota/dota-data/files/panorama/enums` | Panorama enums |
| `@moddota/dota-data/files/panorama/events` | Panorama events |
| `@moddota/dota-data/files/vscripts/api-types` | VScript API type definitions |
| `@moddota/dota-data/files/vscripts/modifier_list.json` | Modifier names by category |
| `@moddota/dota-data/files/convars.json` | Console variables |

### Changelog Data

Changelog data is fetched at runtime from GitHub raw URLs, not bundled in the build.

---

## Adding Features Checklist

1. **New API page** → Create `src/pages/api/<name>.astro` wrapping a React island with `client:only="react"`, add scope in `src/data/api-data.ts`, add NavBar link in `src/components/api/layout/NavBar.tsx`
2. **New custom API page** → Create React component in `src/components/api/pages/`, wrap in `.astro` page
3. **New search operator** → Add to `doSearch()` in `src/components/api/Docs/utils/filtering.tsx`
4. **New declaration kind** → Add to `Declaration` union in `Docs/api.ts` + rendering component + `renderItem` in `ContentList.tsx`
5. **New theme tokens** → Add CSS variables to both light and dark sections in `src/styles/global.css`
6. **New article** → Create `.md` file in `src/content/articles/` with frontmatter, add entry to `src/data/sidebar.ts`
7. **New article component** → Add Astro component to `src/components/articles/`, use in markdown via remark plugin or MDX
