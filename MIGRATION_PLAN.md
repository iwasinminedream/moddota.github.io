# Migration Plan: Docusaurus + Webpack SPA → Astro + React

## Goal

Merge two separate apps (Docusaurus for articles + Webpack SPA for API docs) into a single Astro project with React islands. One codebase, one build, one dev server, one deploy.

**Result URLs (unchanged):**
- `https://iwasinminedream.github.io/moddota.github.io/` — articles
- `https://iwasinminedream.github.io/moddota.github.io/api/` — API documentation

---

## Current Architecture

```
moddota.github.io-1/
├── _articles/           # ~75 Markdown/MDX articles
├── src/                 # Docusaurus custom pages + styles
├── docusaurus.config.js # Docusaurus 2.1.0
├── docusaurus/          # Custom remark plugins + webpack plugin
├── api/                 # Separate React SPA (Webpack 5)
│   ├── src/
│   │   ├── index.tsx          # React 17, HashRouter, styled-components
│   │   ├── pages/             # 9 page routes (lazy-loaded)
│   │   └── components/        # ~30 components
│   └── webpack.config.ts
└── .github/workflows/deploy.yml  # Builds both, combines into build/
```

**Key problems solved by migration:**
- Two separate build systems (Docusaurus + Webpack)
- Proxy hack for dev server (`setupMiddlewares` in plugin.js)
- HashRouter (`#!/vscripts`) instead of clean URLs
- Two React versions (16 for Docusaurus, 17 for API)
- styled-components + SCSS mix
- No SSG for API pages (entire SPA loads before anything renders)

---

## Target Architecture

```
moddota.github.io-1/
├── src/
│   ├── layouts/
│   │   ├── ArticleLayout.astro    # Layout for markdown articles
│   │   └── ApiLayout.astro        # Layout for API pages (with navbar, sidebar)
│   ├── pages/
│   │   ├── index.astro            # Homepage (articles intro)
│   │   ├── [...slug].astro        # Dynamic article pages from content/
│   │   ├── new-article.astro      # Article creation form
│   │   └── api/
│   │       ├── index.astro        # API landing → redirect to vscripts
│   │       ├── vscripts.astro     # Lua API
│   │       ├── events.astro       # Game Events
│   │       ├── panorama/
│   │       │   ├── api.astro
│   │       │   ├── css.astro
│   │       │   └── events.astro
│   │       ├── abilities.astro
│   │       ├── modifiers.astro
│   │       ├── convars.astro
│   │       └── changelog/
│   │           └── [...version].astro
│   ├── components/
│   │   ├── articles/              # Article-specific (YouTube, Gfycat, etc.)
│   │   └── api/                   # Migrated from api/src/components/
│   │       ├── layout/
│   │       │   ├── NavBar.tsx     # React island (burger menu state)
│   │       │   └── Sidebar.tsx    # React island (scroll, active state)
│   │       ├── Docs/              # All declaration renderers (React)
│   │       ├── Search/            # SearchBox + filters (React island)
│   │       ├── Lists.tsx          # ScrollableList, LazyList (React)
│   │       └── ...
│   ├── styles/
│   │   ├── global.css             # Tailwind base + custom properties
│   │   └── api-theme.css          # API-specific theming (light/dark)
│   └── content/
│       └── articles/              # Moved from _articles/
│           ├── index.md
│           ├── getting-started.md
│           └── ...
├── public/
│   └── images/                    # Static assets (moved from static/)
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

---

## Phase 1: Project Setup

### 1.1 Initialize Astro project

```bash
npm create astro@latest -- --template minimal
```

Configure `astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://iwasinminedream.github.io',
  base: '/moddota.github.io',
  integrations: [react(), tailwind(), mdx()],
  output: 'static',
});
```

### 1.2 Install dependencies

**Keep from current:**
- `@moddota/dota-data` — data source (unchanged)
- `react`, `react-dom` — for interactive islands
- `react-virtualized` — for LazyList (large API lists)
- `polished` — color utilities used in themes
- `lodash` — used in some pages

**Add:**
- `@astrojs/react` — React integration
- `@astrojs/tailwind` — Tailwind CSS
- `@astrojs/mdx` — MDX support for articles
- `tailwindcss` — utility CSS (replaces styled-components)

**Remove:**
- `styled-components` — replace with Tailwind + CSS modules
- `react-router-dom` — replaced by Astro file-based routing
- `react-toggle-button` — simple CSS toggle instead
- All webpack/babel dependencies
- All Docusaurus dependencies
- `docusaurus-plugin-sass`, `sass`, `sass-loader`

### 1.3 Configure Tailwind

Create `tailwind.config.mjs` with custom theme matching current light/dark colors from `api/src/components/Themes.tsx`:

```js
// Current theme colors to preserve:
// Light: background #f5f5f5, text #24292e, navbar #ffffff, highlight #89a62e
// Dark:  background #1e1e1e, text #cccccc, navbar #252526, highlight #89a62e
```

---

## Phase 2: Migrate Articles (Docusaurus → Astro Content Collections)

### 2.1 Set up content collection

Create `src/content/config.ts`:
```ts
import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    steamId: z.string().optional(),
    date: z.coerce.date().optional(),
  }),
});

export const collections = { articles };
```

### 2.2 Move articles

Move `_articles/**/*.md` → `src/content/articles/`

**Frontmatter changes needed:** None — current YAML frontmatter is compatible with Astro.

### 2.3 Migrate custom article components

Current custom components injected by `remark-component-provider`:

| Component | Source | Migration |
|-----------|--------|-----------|
| `<YouTube id="" />` | `src/components/YouTube.tsx` | Rewrite as Astro component |
| `<Gfycat id="" />` | `src/components/Gfycat.tsx` | Rewrite as Astro component |
| `<Tabs>` / `<TabItem>` | Docusaurus built-in | Rewrite as Astro/React component |
| `<MultiCodeBlock>` | `src/components/MultiCodeBlock.tsx` | Rewrite as Astro component |
| `<StaticVideo>` | `src/components/StaticVideo.tsx` | Rewrite as Astro component |

**For MDX files:** Import components explicitly instead of auto-injecting via remark plugin.

### 2.4 Migrate remark-remove plugin

`docusaurus/remark-remove.js` strips `// @remove-next-line` and `// @remove-line:` markers. Port as a remark plugin in `astro.config.mjs`:

```js
remarkPlugins: [remarkRemove]
```

### 2.5 Create article layout

`src/layouts/ArticleLayout.astro` — replaces Docusaurus docs layout:
- Sidebar navigation (from sidebars.json → hardcoded or auto-generated)
- Table of contents
- Edit on GitHub link
- Previous/Next navigation

### 2.6 Create sidebar

Convert `sidebars.json` into Astro sidebar component. Current sidebar has:
- 10 top-level categories
- Nested items with external links (Valve Developer Community)
- YouTube video indicators (CSS `::after` icons)

---

## Phase 3: Migrate API Documentation (React SPA → Astro pages with React islands)

### 3.1 Strategy: Astro page shells + React interactive islands

Each API page becomes an `.astro` file that:
1. Imports data at build time (SSG)
2. Renders the page shell (navbar, layout)
3. Hydrates React islands for interactivity (search, filtering, virtual lists)

### 3.2 Migrate routing

**Current (HashRouter):** `#!/vscripts`, `#!/events`, `#!/panorama/api`, etc.
**Target (file-based):** `/api/vscripts`, `/api/events`, `/api/panorama/api`, etc.

Route mapping:

| Old (hash) | New (file) | Astro page |
|------------|-----------|------------|
| `#!/vscripts` | `/api/vscripts` | `src/pages/api/vscripts.astro` |
| `#!/vscripts/CDOTA_BaseNPC` | `/api/vscripts#CDOTA_BaseNPC` | Same page, hash scroll |
| `#!/events` | `/api/events` | `src/pages/api/events.astro` |
| `#!/panorama/api` | `/api/panorama/api` | `src/pages/api/panorama/api.astro` |
| `#!/panorama/css` | `/api/panorama/css` | `src/pages/api/panorama/css.astro` |
| `#!/panorama/events` | `/api/panorama/events` | `src/pages/api/panorama/events.astro` |
| `#!/abilities` | `/api/abilities` | `src/pages/api/abilities.astro` |
| `#!/modifiers` | `/api/modifiers` | `src/pages/api/modifiers.astro` |
| `#!/convars` | `/api/convars` | `src/pages/api/convars.astro` |
| `#!/changelog` | `/api/changelog` | `src/pages/api/changelog/index.astro` |
| `#!/changelog/7.35` | `/api/changelog/7.35` | `src/pages/api/changelog/[version].astro` |

### 3.3 Migrate data layer

`api/src/pages/data.ts` is the central data aggregation. **Keep as-is** — it imports from `@moddota/dota-data` and transforms into Declaration types. Import it in Astro pages:

```astro
---
// src/pages/api/vscripts.astro
import { scopes } from '../../data/api-scopes';
import ApiLayout from '../../layouts/ApiLayout.astro';
import VScriptsPage from '../../components/api/pages/VScriptsPage';
---
<ApiLayout title="Lua API">
  <VScriptsPage client:load scope={scopes.vscripts} />
</ApiLayout>
```

### 3.4 Migrate components (priority order)

**High priority — must work for any page to render:**

1. **Theme system** — Replace `styled-components` ThemeProvider with CSS custom properties:
   - Extract colors from `Themes.tsx` into CSS variables
   - Dark mode via `[data-theme="dark"]` selector (like Docusaurus does)
   - Components use `var(--color-text)` instead of `props.theme.text`

2. **NavBar** (`api/src/components/layout/NavBar.tsx`):
   - Convert to Astro component with React island for burger menu + theme toggle
   - Replace `react-router-dom` NavLink with plain `<a>` + active class detection
   - Replace `react-toggle-button` with CSS-only toggle

3. **Search** (`api/src/components/Search/index.tsx`):
   - React island (`client:load`)
   - Replace `useHistory`/`useLocation` with `window.location` / URL params
   - Keep fuzzySearch.ts as-is

4. **Lists** (`api/src/components/Lists.tsx`):
   - `ScrollableList` — trivial, just `.map()`
   - `LazyList` — keep as React island, uses `react-virtualized`

5. **Docs components** (`api/src/components/Docs/`):
   - Keep as React components, minimal changes needed
   - Remove `react-router-dom` Link usages → plain `<a href>`
   - These are all pure rendering components, easy to migrate

**Medium priority — page-specific:**

6. **DeclarationsPage** wrapper — refactor from router-based to props-based
7. **Sidebar** — React island for scroll state + active item highlighting
8. **ContentList** — React island for filtering + lazy rendering

**Low priority — specific pages:**

9. **Abilities page** — complex KV expansion, sidebar categories, fuzzy search
10. **Changelog page** — fetches remote data, complex nested grouping
11. **Convars page** — flag filtering
12. **Modifiers page** — category filtering

### 3.5 styled-components → Tailwind migration strategy

**Approach:** Don't convert all at once. Migrate incrementally:

1. First pass: Extract all theme colors to CSS variables
2. Replace styled-components wrappers that only set padding/margin/flex with Tailwind classes
3. Keep complex styled-components (with dynamic props) as CSS modules or inline styles
4. Final pass: Clean up remaining styled-components

**Key styled-components to convert:**

| Component | Current | Target |
|-----------|---------|--------|
| `NavBarWrapper` | `styled.nav` with theme | Tailwind classes on `<nav>` |
| `SidebarWrapper` | `styled.div` 340px width | Tailwind `w-[340px] lg:w-[200px]` |
| `ContentWrapper` | `styled.main` with padding | Tailwind `flex-1 pl-6 lg:pl-0` |
| `CommonGroupWrapper` | Complex with dynamic border | CSS module (too many dynamic props) |
| `SearchBoxWrapper` | Theme-dependent border/bg | CSS variables + Tailwind |

### 3.6 Handle ElementLink / hash navigation

Current: `ElementLink` generates `#!/scope/ElementName` links.
Target: `#ElementName` anchors on the same page.

Each declaration needs an `id` attribute for scroll-to-anchor. The `useCtrlFHook` and hash scroll handlers stay as React hooks.

---

## Phase 4: Migrate Specific Features

### 4.1 Dark mode

**Current:** `AppContext` → `ThemeProvider` → `styled-components` theme props
**Target:** CSS custom properties + `data-theme` attribute on `<html>`

```css
:root {
  --color-bg: #f5f5f5;
  --color-text: #24292e;
  --color-navbar: #ffffff;
  --color-highlight: #89a62e;
  /* ... all colors from themeModdotaLight */
}

[data-theme="dark"] {
  --color-bg: #1e1e1e;
  --color-text: #cccccc;
  --color-navbar: #252526;
  /* ... all colors from themeModdotaDark */
}
```

Toggle component reads/writes `localStorage` + sets `data-theme` attribute. Keep the sun/moon toggle UI.

### 4.2 Algolia search (articles)

Current Docusaurus uses Algolia DocSearch. Options:
- **Keep Algolia** — use `@docsearch/react` directly in Astro
- **Replace with Pagefind** — zero-config static search, no external service

Recommendation: **Pagefind** — integrates with Astro, no API key needed, works offline.

### 4.3 API search (declarations)

Keep current `fuzzySearch.ts` + `SearchBox` component. No changes needed — it's self-contained React.

### 4.4 Article creation page

`src/pages/new-article.tsx` → `src/pages/new-article.astro` with React form island.

### 4.5 Changelog remote data

Current: Fetches from `https://raw.githubusercontent.com/.../changelog-index.json`
Options:
- **Build-time fetch** — Astro can fetch at build time in frontmatter
- **Client-side fetch** — Keep as React island for dynamic version switching
- **Hybrid** — Fetch index at build, load version details client-side

Recommendation: Hybrid — build pages for each version using `[version].astro` with `getStaticPaths()`, fetch data at build time.

---

## Phase 4.6: Interactive Article Editor (split-view with live preview)

**Current state:** `src/pages/new-article.tsx` — simple form with textarea + raw markdown preview (just monospace text, no rendering). No real-time preview, no syntax highlighting, no toolbar.

**Target:** Full split-view editor page at `/new-article`:

```
┌──────────────────────────────────────────────────────────┐
│  Title: [_______________]   Author: [______]  Cat: [___] │
├────────────────────────────┬─────────────────────────────┤
│                            │                             │
│  Markdown Editor           │  Live Preview               │
│  (with toolbar)            │  (rendered HTML)            │
│                            │                             │
│  ## My Section             │  My Section                 │
│                            │  ─────────                  │
│  Some **bold** text        │  Some bold text             │
│                            │                             │
│  ```lua                    │  ┌──────────────────────┐   │
│  print("hello")            │  │ print("hello")       │   │
│  ```                       │  └──────────────────────┘   │
│                            │                             │
│  <YouTube id="abc" />      │  [▶ YouTube embed]         │
│                            │                             │
├────────────────────────────┴─────────────────────────────┤
│  [Create PR on GitHub]    [Download .md]                 │
└──────────────────────────────────────────────────────────┘
```

### Architecture

The editor is a React island (`client:load`) inside an Astro page:

```
src/pages/new-article.astro
  └── ArticleEditor.tsx (React, client:load)
        ├── EditorPanel (left)
        │     ├── Toolbar (bold, italic, heading, code, link, image, YouTube)
        │     └── CodeMirror / textarea with syntax highlighting
        ├── PreviewPanel (right)
        │     └── Rendered markdown → HTML (real-time)
        └── MetadataBar (top: title, author, steamId, category)
```

### Key Dependencies

| Dependency | Purpose | Notes |
|-----------|---------|-------|
| `@uiw/react-codemirror` | Code editor with markdown syntax highlighting | Lightweight, React wrapper for CodeMirror 6 |
| `@codemirror/lang-markdown` | Markdown language support | Syntax highlighting, auto-completion |
| `react-markdown` | Markdown → React rendering | For live preview panel |
| `remark-gfm` | GitHub Flavored Markdown | Tables, strikethrough, task lists |
| `rehype-highlight` or `shiki` | Code block syntax highlighting in preview | Lua, TypeScript, JavaScript, CSS |

**Alternative (simpler):** Use `marked` or `markdown-it` for preview rendering — faster, smaller bundle, HTML string output. `react-markdown` is heavier but allows custom component rendering (for `<YouTube>`, etc.).

### Implementation Details

#### Editor Panel (left side)

**Option A — CodeMirror 6 (recommended):**
```tsx
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

<CodeMirror
  value={content}
  onChange={setContent}
  extensions={[markdown()]}
  theme={darkMode ? oneDark : undefined}
  height="100%"
/>
```

**Option B — Plain textarea with toolbar (simpler, fewer deps):**
```tsx
<div className="toolbar">
  <button onClick={() => wrapSelection('**', '**')}>B</button>
  <button onClick={() => wrapSelection('*', '*')}>I</button>
  <button onClick={() => insertAtCursor('## ')}>H</button>
  <button onClick={() => insertAtCursor('```lua\n\n```')}>Code</button>
  <button onClick={() => insertAtCursor('<YouTube id="" />')}>YT</button>
</div>
<textarea value={content} onChange={e => setContent(e.target.value)} />
```

Toolbar helper functions:
```ts
function wrapSelection(before: string, after: string) {
  const textarea = textareaRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = content.substring(start, end);
  const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
  setContent(newContent);
  // Restore cursor position after wrap
}

function insertAtCursor(text: string) {
  const textarea = textareaRef.current;
  const pos = textarea.selectionStart;
  setContent(content.substring(0, pos) + text + content.substring(pos));
}
```

#### Preview Panel (right side)

Real-time rendered markdown with custom component support:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Custom renderers for ModDota components
const components = {
  // Render YouTube embeds in preview
  YouTube: ({ id, playlistId }) => (
    <div className="youtube-embed">
      <iframe src={`https://youtube.com/embed/${playlistId ? `videoseries?list=${playlistId}` : id}`} />
    </div>
  ),
  // Code blocks with syntax highlighting
  code: ({ className, children }) => {
    const language = className?.replace('language-', '');
    return <SyntaxHighlightedCode language={language}>{children}</SyntaxHighlightedCode>;
  },
};

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
  components={components}
>
  {content}
</ReactMarkdown>
```

**Handling custom components in preview:**
The preview needs to detect `<YouTube id="..." />`, `<Gfycat id="..." />`, etc. in the markdown and render them as actual embeds. Two approaches:

1. **Regex pre-processing** — before passing to ReactMarkdown, replace `<YouTube id="abc" />` with actual iframe HTML
2. **MDX runtime** — use `@mdx-js/mdx` to compile MDX on-the-fly in the browser (heavier but fully accurate)

Recommendation: **Regex pre-processing** for v1 (simple, fast), upgrade to MDX runtime later if needed.

#### Layout (split-view)

```tsx
const EditorLayout = styled.div`
  display: flex;
  height: calc(100vh - 200px); /* subtract metadata bar + navbar */
  gap: 1px;
  background: var(--color-border);

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
  }
`;

const Panel = styled.div`
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg);
`;
```

On mobile: stacked vertically — editor on top, preview below (toggleable via tabs).

#### Mobile adaptation

On screens < 768px, show tabs instead of split view:

```tsx
const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

// Mobile: tab switcher
<div className="md:hidden flex">
  <button onClick={() => setActiveTab('editor')}>Editor</button>
  <button onClick={() => setActiveTab('preview')}>Preview</button>
</div>

// Desktop: side-by-side
<div className="hidden md:flex">
  <EditorPanel />
  <PreviewPanel />
</div>

// Mobile: one at a time
<div className="md:hidden">
  {activeTab === 'editor' ? <EditorPanel /> : <PreviewPanel />}
</div>
```

#### Toolbar buttons

| Button | Insert | Keyboard shortcut |
|--------|--------|-------------------|
| **B** | `**selection**` | Ctrl+B |
| *I* | `*selection*` | Ctrl+I |
| H1-H3 | `## ` at line start | — |
| Code | `` `selection` `` or fenced block | Ctrl+` |
| Link | `[selection](url)` | Ctrl+K |
| Image | `![alt](url)` | — |
| YouTube | `<YouTube id="" />` | — |
| Table | Markdown table template | — |
| List | `- ` at line start | — |
| Quote | `> ` at line start | — |

#### Auto-save

Save editor state to `localStorage` to prevent data loss:

```tsx
useEffect(() => {
  const saved = localStorage.getItem('article-draft');
  if (saved) {
    const { title, author, steamId, category, content } = JSON.parse(saved);
    setTitle(title); setAuthor(author); /* ... */
  }
}, []);

useEffect(() => {
  const timer = setTimeout(() => {
    localStorage.setItem('article-draft', JSON.stringify({ title, author, steamId, category, content }));
  }, 500); // debounce 500ms
  return () => clearTimeout(timer);
}, [title, author, steamId, category, content]);
```

#### Image upload (optional, v2)

Drag-and-drop images into the editor → upload to GitHub via API or convert to base64 data URL for preview. This is complex and can be added later.

### Migration from current `new-article.tsx`

Keep all existing functionality:
- GitHub PR creation URL (with MAX_URL_LENGTH check)
- Download .md fallback
- Slug generation from title
- Frontmatter generation
- Category selection

Add on top:
- Replace textarea with CodeMirror (or enhanced textarea + toolbar)
- Replace raw preview with rendered markdown preview
- Split-view layout
- Keyboard shortcuts
- localStorage auto-save

---

## Phase 5: Build & Deploy

### 5.1 Build configuration

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://iwasinminedream.github.io',
  base: '/moddota.github.io',
  output: 'static',
});
```

Build output goes to `dist/` — a single static site.

### 5.2 Update deploy workflow

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Checkout dota-data
    uses: actions/checkout@v4
    with:
      repository: iwasinminedream/dota-data
      path: dota-data
  - uses: actions/setup-node@v4
    with:
      node-version: 22
  - run: npm ci
  - run: npm run build
  - run: touch dist/.nojekyll
  - uses: actions/upload-pages-artifact@v3
    with:
      path: dist
  - uses: actions/deploy-pages@v4
```

One build step instead of two. No `api/dist` + `build/` combining.

### 5.3 Dev server

```bash
npm run dev  # Single Astro dev server, hot reload for everything
```

No more dual servers, no proxy hack.

---

## Phase 6: Cleanup

- Delete `api/` directory entirely
- Delete `docusaurus.config.js`, `docusaurus/` directory
- Delete `sidebars.json`
- Delete old `src/custom.scss`
- Remove all Docusaurus and Webpack dependencies from `package.json`
- Update `.gitignore` for Astro (`dist/` instead of `build/`)
- Update CI workflow (`ci.yml`) — single lint + build

---

## Migration Order (recommended execution sequence)

```
Phase 1 → Phase 2.1-2.2 → Phase 3.1-3.3 → Phase 4.1 (dark mode)
    → Phase 3.4 items 1-5 (core components)
    → Phase 2.3-2.6 (article components + layout)
    → Phase 3.4 items 6-8 (page wrappers)
    → Phase 3.4 items 9-12 (specific pages)
    → Phase 4.2-4.5 (specific features)
    → Phase 5 (build + deploy)
    → Phase 6 (cleanup)
```

**Estimated scope:** ~50 files to create/migrate, ~30 files to delete.

---

## Critical Data Dependencies

All data comes from `@moddota/dota-data` package. These imports must work:

```ts
// JSON data files
import abilities from '@moddota/dota-data/files/abilities.json';
import abilityHeroMap from '@moddota/dota-data/files/ability-hero-map.json';
import convars from '@moddota/dota-data/files/convars.json';
import events from '@moddota/dota-data/files/events';
import panoramaApi from '@moddota/dota-data/files/panorama/api';
import panoramaCss from '@moddota/dota-data/files/panorama/css';
import panoramaEvents from '@moddota/dota-data/files/panorama/events';
import apiTypes from '@moddota/dota-data/files/vscripts/api-types';
import modifierList from '@moddota/dota-data/files/vscripts/modifier_list.json';

// Helper functions
import { allData, getFuncDeepTypes, getDeepTypes } from '@moddota/dota-data/lib/helpers/vscripts';
```

The `prebuild` script in `api/package.json` copies local dota-data into node_modules. Move this logic to the root project or use Astro's `vite.resolve.alias` for dev mode:

```js
// astro.config.mjs
vite: {
  resolve: {
    alias: {
      '@moddota/dota-data/files': path.resolve('../dota-data/files'),
      '@moddota/dota-data/lib': path.resolve('../dota-data/lib'),
    }
  }
}
```

---

## Risk Areas

1. **react-virtualized** — may have issues with Astro's SSR. Use `client:only="react"` directive to skip SSR for these components.
2. **Changelog remote fetch** — currently uses `fetch` in browser. For build-time SSG, need to handle in `getStaticPaths` or keep as client-only island.
3. **Article custom components in MDX** — need to ensure all `<YouTube>`, `<Gfycat>`, etc. are imported in each MDX file or configured globally via MDX integration.
4. **URL migration** — old `#!/vscripts` hash URLs will break. Consider adding a small redirect script in `src/pages/api/index.astro` that detects `#!` and redirects to clean URL.
5. **Algolia search index** — if keeping Algolia, the index needs recrawling after migration. If switching to Pagefind, this is automatic.
