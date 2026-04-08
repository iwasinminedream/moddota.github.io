import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    steamId: z.union([z.string(), z.number()]).transform(String).optional(),
    outdated: z.boolean().optional(),
    date: z.string().optional().transform((val) => {
      if (!val) return undefined;
      // Handle DD.MM.YYYY format
      const dotMatch = val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (dotMatch) return new Date(`${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`);
      // Handle DD/MM/YYYY format
      const slashMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) return new Date(`${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`);
      return new Date(val);
    }),
  }),
});

export const collections = { articles };
