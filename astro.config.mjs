import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import remarkRemove from './src/plugins/remark-remove.mjs';
import remarkComponents from './src/plugins/remark-components.mjs';
import path from 'path';

export default defineConfig({
  site: 'https://iwasinminedream.github.io',
  base: '/moddota.github.io/',
  output: 'static',
  markdown: {
    remarkPlugins: [remarkRemove, remarkComponents],
  },
  integrations: [
    react(),
    mdx({
      remarkPlugins: [remarkRemove, remarkComponents],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
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
