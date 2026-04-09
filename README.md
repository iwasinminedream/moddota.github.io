# ModDota

Documentation and API reference for Dota 2 modding, built with [Astro](https://astro.build/).

The site combines tutorial articles and an interactive Lua/Panorama API browser into a single static site.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- npm

## Setup

The site consumes the [`@moddota/dota-data`](https://github.com/iwasinminedream/dota-data) package for API reference data. Clone it as a sibling directory for live updates:

```
parent/
  dota-data/          # git clone https://github.com/iwasinminedream/dota-data
  moddota.github.io/  # this repo
```

The `prebuild` script automatically copies `dota-data/files/` and `dota-data/lib/` into `node_modules/@moddota/dota-data` before each build.

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:4321`. Hot-reloads on changes to articles, components, and styles.

## Build

```bash
npm run build       # Production build → dist/
npm run preview     # Preview production build locally
```

## Lint

```bash
npm run lint        # Prettier check
npm run fix:prettier  # Apply formatting
```

## Project Structure

```
src/
  pages/             # Astro pages (route entries)
  content/
    articles/        # Markdown/MDX article content collection
  components/        # Shared React + Astro components
    api/             # API browser (abilities, modifiers, vscripts, panorama, ...)
  data/              # Data adapters wrapping @moddota/dota-data
  styles/            # Global Tailwind + custom CSS
  plugins/           # Remark plugins (remark-components, remark-remove)
public/              # Static assets served as-is (images, videos, fonts)
.github/workflows/   # CI and deploy workflows
astro.config.mjs     # Astro config (MDX, React, Tailwind integrations)
```

## Writing Articles

Articles are Markdown/MDX files in `src/content/articles/` with YAML frontmatter:

```yaml
---
title: 'My Article Title'
author: 'Your Name'
steamId: '76561198000000000'
date: 06.04.2026
---

Article content in Markdown...
```

You can also use the [Article Editor](/new-article) on the site to create articles and submit them as Pull Requests.

See [Contribute](/contribute) for more details on formatting, embeds, and submission.

## Deployment

The site deploys automatically to GitHub Pages when changes are pushed to the `source` branch.
