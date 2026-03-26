# ModDota Site & API – Copilot Instructions

## Quick Start (Read This First)

**Architecture in one sentence**: A Docusaurus articles site + a standalone React SPA (`api/`) that renders Dota 2 API reference docs from data provided by the sibling `dota-data` package.

**Essential dev commands**:
- `npm run dev` (in `api/`) – webpack dev server on port 3000 with HMR
- `npm run build` (in `api/`) – production webpack build → `api/dist/`
- `npm start` (root) – Docusaurus dev server for articles
- `npm run build` (root) – Docusaurus production build

**Critical conventions**:
- **Path aliases**: Use `~components/` and `~utils/` (resolved in webpack config) instead of relative `../../` paths
- **Theming**: All colors via `props.theme.*` from styled-components `ThemeProvider` – never hardcode colors
- **Data source**: All API data comes from `@moddota/dota-data` package; in dev mode, webpack aliases resolve directly to `../../dota-data/` for live updates
- **Routing**: HashRouter (`#!` hashType) with react-router-dom v5 – all routes defined in `api/src/pages/index.tsx`

---

## Project Architecture

### Two Separate Apps in One Repo

1. **Root (`/`)** – Docusaurus 2 site for articles/guides (`_articles/`)
   - Config: `docusaurus.config.js`
   - Articles: `_articles/**/*.md` (MDX supported)
   - Sidebar: `sidebars.json`
   - Custom components: `src/components/` (Gfycat, YouTube, MultiCodeBlock, StaticVideo)
   - Custom Docusaurus plugins: `docusaurus/` (remark plugins for component injection, code removal, TS→JS conversion)

2. **API Reference (`api/`)** – Standalone React SPA
   - Entry: `api/src/index.tsx` → React 17, HashRouter, styled-components
   - Build: Webpack 5 + Babel (TypeScript via `@babel/preset-typescript`)
   - Type checking: `fork-ts-checker-webpack-plugin` (separate process)
   - Output: `api/dist/` (deployed at `/moddota.github.io/api/`)

### API App Folder Structure

```
api/src/
├── index.tsx                    # App entry: React render, ThemeProvider, HashRouter
├── index.html                   # HTML template for HtmlWebpackPlugin
├── styled.d.ts                  # styled-components theme type augmentation
├── types.d.ts                   # SVG/PNG module declarations
├── components/
│   ├── AppContext.tsx            # React context for dark mode toggle
│   ├── GlobalStyle.tsx           # Global CSS (body reset, scrollbar styling)
│   ├── Themes.tsx                # Theme objects (themeOriginal, themeModdotaLight, themeModdotaDark)
│   ├── Lists.tsx                 # LazyList (react-virtualized) + ScrollableList
│   ├── Author.tsx                # Author attribution component
│   ├── Docs/
│   │   ├── api.ts                # TypeScript type definitions for Declaration, ClassDeclaration, etc.
│   │   ├── ClassDeclaration.tsx  # Renders class/interface with members
│   │   ├── FunctionDeclaration.tsx # Renders function signature
│   │   ├── Field.tsx             # Renders field/property
│   │   ├── Enum.tsx              # Renders enum with members
│   │   ├── Constant.tsx          # Renders constant
│   │   ├── CssProperty.tsx       # Renders CSS property with examples
│   │   ├── ContentList.tsx       # Main content area: search + filtered declaration list
│   │   ├── DeclarationsContext.ts # React context: { root: string, declarations: Declaration[] }
│   │   ├── types.tsx             # Type rendering components
│   │   └── utils/
│   │       ├── filtering.tsx     # Core search/filter logic (fuzzy match, availability, type filters)
│   │       ├── components.tsx    # Shared mini-components (KindIcon, ElementLink)
│   │       └── styles.tsx        # Shared styled-components (CommonGroupWrapper, etc.)
│   ├── Search/
│   │   └── index.tsx             # SearchBox, composeFilters, AvailabilityFiltersContext, useRouterSearch
│   ├── KindIcon/                 # SVG icons for declaration kinds (Class, Method, Field, etc.)
│   └── layout/
│       ├── NavBar.tsx            # Top navigation bar with route links + theme toggle
│       ├── Sidebar.tsx           # Left sidebar (SidebarWrapper, SidebarElement, DeclarationSidebarElement)
│       └── Content.tsx           # Content area wrapper + StyledSearchBox + TextMessage
├── pages/
│   ├── index.tsx                 # AppRoutes: all route definitions (Switch/Route)
│   ├── data.ts                   # Master data file: loads & transforms all @moddota/dota-data into scopes
│   ├── DeclarationsPage.tsx      # Generic page layout: Sidebar + ContentList (used by most pages)
│   ├── DeclarationsSidebar.tsx   # Sidebar with hoisted items + declaration list
│   ├── vscripts/index.tsx        # /vscripts/:scope? – Lua API
│   ├── events/index.tsx          # /events/:scope? – Game Events
│   ├── panorama/
│   │   ├── api/index.tsx         # /panorama/api/:scope? – Panorama JS API
│   │   ├── css/index.tsx         # /panorama/css/:scope? – Panorama CSS Properties
│   │   └── events/index.tsx      # /panorama/events/:scope? – Panorama Events
│   ├── modifiers/index.tsx       # /modifiers – Modifier list (custom layout, not DeclarationsPage)
│   ├── convars/index.tsx         # /convars – Console variables
│   └── changelog/index.tsx       # /changelog/:version? – Changelog viewer (loads JSON at runtime)
└── utils/
    ├── types.tsx                 # isNotNil, intersperse, assertNever utilities
    └── fuzzySearch.ts            # Fuzzy matching: fuzzyMatch(), fuzzyContains(), fuzzySort()
```

### Data Flow

```
dota-data repo (files/ + lib/)
    ↓ (prebuild script copies to node_modules, or webpack alias in dev)
@moddota/dota-data package
    ↓ (imported in api/src/pages/data.ts)
scopes object: { vscripts, vscriptsEvents, panorama, panoramaCss, panoramaEvents }
    ↓ (passed via DeclarationsContext)
DeclarationsPage → DeclarationsSidebar + ContentList
    ↓ (useFilteredData hook)
Filtered/searched declarations → rendered by ClassDeclaration/FunctionDeclaration/Enum/etc.
```

### Key Data Types

The `Declaration` union type (in `api/src/components/Docs/api.ts`) is the core data model:
- `ClassDeclaration` – classes/interfaces with members (functions + fields)
- `FunctionDeclaration` – standalone functions
- `Enum` – enums with named integer members
- `Constant` – named numeric constants
- `CssProperty` – CSS properties with examples

### Theme System

Three themes defined in `Themes.tsx`: `themeOriginal`, `themeModdotaLight`, `themeModdotaDark`.
Theme switching via `AppContext` (localStorage key: `"theme"`).

Key theme tokens used in styled-components:
- `theme.group` – card/panel background
- `theme.groupMembers` – inner content area background
- `theme.groupBorder` – card border color
- `theme.groupShadow` – card box-shadow
- `theme.highlight` – accent color for active states
- `theme.text` / `theme.textDim` / `theme.textFaded` – text hierarchy
- `theme.sidebar` – sidebar background
- `theme.searchbox.*` – search input styling

---

## Development Workflows

### API App (api/)

```bash
cd api
npm run dev          # webpack dev server at localhost:3000, HMR enabled
npm run build        # production build → api/dist/
npm run analyze      # build with bundle analyzer
npm run lint         # ESLint
```

The dev server serves `../../dota-data/files/` at `/changelog-data/` for local changelog development.

### Articles Site (root)

```bash
npm start            # Docusaurus dev server
npm run build        # Docusaurus production build → build/
```

### Syncing dota-data Changes

The `prebuild` script in `api/package.json` copies `files/` and `lib/` from the sibling `dota-data` directory into `node_modules/@moddota/dota-data/`. In dev mode, webpack aliases bypass `node_modules` entirely and resolve directly to `../../dota-data/`.

---

## Key Patterns & Conventions

### Adding a New API Page

1. Create `api/src/pages/<name>/index.tsx`
2. Import the appropriate scope from `data.ts` (or create a new one)
3. Use `<DeclarationsPage context={scopes.myScope} hoist={[...]} />` for standard layout
4. Add route in `api/src/pages/index.tsx`
5. Add NavBar link in `api/src/components/layout/NavBar.tsx`

### DeclarationsPage Pattern (used by most pages)

```tsx
import { scopes } from "../data";
import DeclarationsPage from "../DeclarationsPage";

export default function MyPage() {
  return (
    <DeclarationsPage
      context={scopes.myScope}
      hoist={[
        { icon: "function", text: "Functions", scope: "functions", kind: "function" },
      ]}
    />
  );
}
```

The `hoist` array pins items to the top of the sidebar. Set `kind` to filter them out of the main list.

### Custom Page Pattern (modifiers, convars, changelog)

Pages that don't fit the `DeclarationsPage` layout use `SidebarWrapper`/`ContentWrapper` directly:

```tsx
import { ContentWrapper, StyledSearchBox } from "~components/layout/Content";
import { SidebarWrapper, SidebarItem } from "~components/layout/Sidebar";

export default function MyCustomPage() {
  return (
    <>
      <SidebarWrapper>
        <SidebarItem to="/mypage" icon="constant" text="All Items" />
      </SidebarWrapper>
      <ContentWrapper>
        <StyledSearchBox baseUrl="/mypage" />
        {/* custom content */}
      </ContentWrapper>
    </>
  );
}
```

### Search & Filtering

- `useRouterSearch()` reads `?search=` from URL
- `useFilteredData(declarations, availabilityFilters)` orchestrates search + scope filtering
- `doSearch()` in `filtering.tsx` supports special operators: `on:server`, `on:client`, `-on:server`, `is:abstract`, `type:TypeName`
- Name matching uses fuzzy search (`fuzzyContains` from `utils/fuzzySearch.ts`)
- Search results are sorted by fuzzy match relevance score

### Card Styling (matching other pages)

Use theme-aware styled-components following the card pattern:

```tsx
const CardWrapper = styled.div`
  background-color: ${(props) => props.theme.group};
  border: 1px solid ${(props) => props.theme.groupBorder};
  border-top-color: ${(props) => lighten(0.1, props.theme.groupBorder)};
  border-radius: 4px;
  box-shadow: 2px 2px 6px ${(props) => props.theme.groupShadow};
`;
```

### Virtualized Lists

For large datasets, use `LazyList` (react-virtualized-based) during search, `ScrollableList` for browsing:

```tsx
{isSearching ? (
  <LazyList data={filteredData} render={renderItem} />
) : (
  <ScrollableList data={filteredData} render={renderItem} />
)}
```

---

## Integration with dota-data

### npm Package Dependency

`api/package.json` declares `"@moddota/dota-data": "^0.45.0"`.

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

Changelog data is **NOT** bundled – it's fetched at runtime:
- Dev: from webpack dev server at `/changelog-data/` (proxied from `../../dota-data/files/`)
- Production: from GitHub raw URLs (`https://raw.githubusercontent.com/iceyellowc/dota-data/master/files/changelogs/`)

### Dev Mode Aliases

In development, webpack resolves `@moddota/dota-data` directly to `../../dota-data/` for instant feedback when editing data files.

---

## Adding Features Checklist

1. **New data scope** → Add to `scopes` in `api/src/pages/data.ts` + create page + add route + add NavBar link
2. **New search operator** → Add to `doSearch()` in `api/src/components/Docs/utils/filtering.tsx`
3. **New declaration kind** → Add to `Declaration` union in `api.ts` + add rendering component + add to `renderItem` in `ContentList.tsx`
4. **New theme tokens** → Add to all three themes in `Themes.tsx` + update `Theme` type
5. **New article** → Create `.md` file in `_articles/` + add to `sidebars.json`
6. **New Docusaurus component** → Add to `src/components/` + register in `docusaurus/remark-component-provider.js`
