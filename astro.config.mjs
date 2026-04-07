import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import remarkRemove from './src/plugins/remark-remove.mjs';
import path from 'path';

export default defineConfig({
  site: 'https://iwasinminedream.github.io',
  base: '/moddota.github.io',
  output: 'static',
  integrations: [
    react(),
    mdx({
      remarkPlugins: [remarkRemove],
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
