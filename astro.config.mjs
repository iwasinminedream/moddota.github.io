import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import remarkRemove from './src/plugins/remark-remove.mjs';
import remarkComponents from './src/plugins/remark-components.mjs';
import remarkBaseLinks from './src/plugins/remark-base-links.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = '/moddota.github.io/';
const articleLinks = [remarkBaseLinks, { base, articlesDir: path.resolve(__dirname, 'src/content/articles') }];

export default defineConfig({
  site: 'https://iwasinminedream.github.io',
  base,
  output: 'static',
  // Prefetch internal links on hover so client-side tab navigation feels instant.
  // `hover` uses document-level event delegation, so it also covers the nav links
  // rendered by the React island after hydration.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  markdown: {
    remarkPlugins: [remarkRemove, [remarkComponents, { base }], articleLinks],
  },
  integrations: [
    react(),
    mdx({
      remarkPlugins: [remarkRemove, [remarkComponents, { base }], articleLinks],
    }),
  ],
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'serve-changelog-data',
        configureServer(server) {
          const dotaDataFiles = path.resolve(__dirname, '../dota-data/files');
          server.middlewares.use('/changelog-data', (req, res, next) => {
            const filePath = path.join(dotaDataFiles, req.url || '');
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.setHeader('Content-Type', 'application/json');
              fs.createReadStream(filePath).pipe(res);
            } else {
              next();
            }
          });
        },
      },
      {
        name: 'serve-report-data',
        configureServer(server) {
          const reportFiles = path.resolve(__dirname, '../dota-data/reports');
          server.middlewares.use('/report-data', (req, res, next) => {
            const filePath = path.join(reportFiles, req.url || '');
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
              fs.createReadStream(filePath).pipe(res);
            } else {
              next();
            }
          });
        },
      },
      {
        name: 'serve-localization-data',
        configureServer(server) {
          const localizationFiles = path.resolve(__dirname, '../dota-data/files/localization');
          server.middlewares.use('/localization-data', (req, res, next) => {
            const filePath = path.join(localizationFiles, req.url || '');
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.setHeader('Content-Type', 'application/json');
              fs.createReadStream(filePath).pipe(res);
            } else {
              next();
            }
          });
        },
      },
    ],
    server: {
      fs: {
        allow: [path.resolve('./'), path.resolve('../dota-data')],
      },
    },
    resolve: {
      alias: {
        '~components': path.resolve('./src/components/api'),
        '~data': path.resolve('./src/data'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    ssr: {
      noExternal: ['@moddota/dota-data'],
    },
  },
  content: {
    collections: {
      articles: {
        type: 'content',
        source: 'src/content/articles/**/*.{md,mdx}',
      },
    },
  },
});
