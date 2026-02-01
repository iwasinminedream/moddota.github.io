# [moddota.github.io](https://iwasinminedream.github.io/moddota.github.io)

ModDota GitHub Pages project.

This website is built using [Docusaurus 2](https://v2.docusaurus.io/), a modern static website generator.

## 🌐 GitHub Pages Deployment

This repository is configured for automatic deployment to GitHub Pages.

**Live Site:** [https://iwasinminedream.github.io/moddota.github.io](https://iwasinminedream.github.io/moddota.github.io)

For detailed setup instructions, see [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md)

### Installation

```bash
$ npm install
```

### Local Development

```bash
$ npm run start
```

This command starts a local development server and open up a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
$ npm run build
```

This command generates static content into the `build` directory which is then deployed to GitHub Pages.

### Deployment

Deployment happens automatically via GitHub Actions when changes are pushed to the `source` branch. See the [deployment workflow](.github/workflows/deploy.yml) for details.
