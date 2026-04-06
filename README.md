# ModDota

Documentation and API reference for Dota 2 modding.

The site consists of two parts:
- **Articles** — tutorials and guides built with [Docusaurus](https://docusaurus.io/) (root)
- **API Reference** — interactive Lua/Panorama API browser built with React (under `/api`)

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- npm

## Local Development

### Articles site

```bash
npm install
npm start
```

Opens at `http://localhost:3000`. Changes to `_articles/*.md` hot-reload automatically.

### API site

The API site requires [dota-data](https://github.com/iwasinminedream/dota-data) cloned as a sibling directory:

```
parent/
  dota-data/          # git clone https://github.com/iwasinminedream/dota-data
  moddota.github.io/  # this repo
```

Then:

```bash
cd api
npm install
npm run dev
```

Opens at `http://localhost:3000`.

### Build

```bash
# Build articles
npm run build

# Build API
cd api
npm run build
```

### Lint

```bash
npm run lint          # Prettier check (articles)
cd api && npm run lint  # ESLint (API)
```

## Project Structure

```
_articles/           # Markdown articles (Docusaurus docs)
  abilities/         # Ability/item/modifier tutorials
  scripting/         # Lua and TypeScript scripting guides
  panorama/          # Panorama UI tutorials
  assets/            # Particles, models, maps, sounds
  units/             # Unit creation guides
  tools/             # Development tools and setup
api/                 # API reference site (React SPA)
src/                 # Docusaurus pages and components
  pages/             # Custom pages (e.g. article editor)
  components/        # Shared React components
docusaurus/          # Docusaurus plugins (remark)
static/              # Static assets (images, videos)
.github/workflows/   # CI and deploy workflows
```

## Writing Articles

Articles are Markdown files in `_articles/` with YAML frontmatter:

```yaml
---
title: "My Article Title"
author: "Your Name"
steamId: '76561198000000000'
date: 06.04.2026
---

Article content in Markdown...
```

You can also use the [Article Editor](/new-article) on the site to create articles and submit them as Pull Requests.

See [Contribute](/contribute) for more details on formatting, embeds, and submission.

## Deployment

The site deploys automatically to GitHub Pages when changes are pushed to the `source` branch. Both articles and API are built and combined into a single deployment.
