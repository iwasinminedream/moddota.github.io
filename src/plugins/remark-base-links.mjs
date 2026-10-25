import fs from 'fs';
import path from 'path';
import { slug as githubSlug } from 'github-slugger';
import { visit } from 'unist-util-visit';

/**
 * Remark plugin that makes internal URLs in articles work under the site base.
 *
 * - Root-relative URLs (`/images/x.png`, `/new-article`) get the base prefix: Astro
 *   does not add it in markdown, and on GitHub Pages the site lives under
 *   `/moddota.github.io/`, so without it they point outside the site.
 * - Relative links to other articles (`item-keyvalues`, `../react#JSX`,
 *   `scripting-introduction.md`) become that article's URL. They were written for
 *   page URLs without a trailing slash; here every article URL ends in `/`, so the
 *   browser would resolve them one level too deep. A link is looked up next to the
 *   article first, then from the articles root (`scripting/item-restrictions-requirements`
 *   from `abilities/`). Slugs are made the way Astro's glob loader makes article ids.
 *
 * Applies to markdown links and images and to href/src attributes in raw HTML.
 * Also keeps Docusaurus heading ids (`### Modifier Transmitters {#transmitters}`)
 * working: the id goes on the heading instead of into its text.
 */
export default function remarkBaseLinks({ base = '/', articlesDir } = {}) {
  const prefix = base.replace(/\/$/, '');

  const isArticle = (target) =>
    ['.md', '.mdx', '/index.md', '/index.mdx'].some((ext) =>
      fs.existsSync(path.join(articlesDir, target.replace(/\.mdx?$/, '') + ext)),
    );

  const toSlug = (target) =>
    target
      .replace(/\.mdx?$/, '')
      .split('/')
      .map((segment) => githubSlug(segment))
      .join('/')
      .replace(/(^|\/)index$/, '');

  return function transform(tree, file) {
    const filePath = file?.path ? path.resolve(file.path) : '';
    const articleRel = articlesDir && filePath ? path.relative(articlesDir, filePath) : '';
    const inArticles = articleRel && !articleRel.startsWith('..') && !path.isAbsolute(articleRel);
    const articleDir = inArticles ? path.posix.dirname(articleRel.split(path.sep).join('/')) : '.';

    const resolve = (url, isLink) => {
      if (url === '' || url.startsWith('#') || url.startsWith('//')) return url;
      if (url.startsWith('/')) {
        return url === prefix || url.startsWith(`${prefix}/`) ? url : prefix + url;
      }
      if (!isLink || !inArticles || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;

      const [, pathPart, rest] = url.match(/^([^?#]*)(.*)$/);
      // Only page links: leave files (`model.vmdl`) alone.
      if (!pathPart || /\.(?!mdx?$)[a-z0-9]+$/i.test(pathPart)) return url;
      const candidates = [path.posix.join(articleDir, pathPart), path.posix.normalize(pathPart)]
        .map((target) => target.replace(/\/$/, ''))
        .filter((target) => !target.startsWith('..'));
      const target = candidates.find(isArticle) ?? candidates[0];
      return target === undefined ? url : `${prefix}/${toSlug(target)}${rest}`;
    };

    visit(tree, ['link', 'image', 'definition'], (node) => {
      if (typeof node.url === 'string') node.url = resolve(node.url, node.type !== 'image');
    });
    visit(tree, 'heading', (node) => {
      const last = node.children[node.children.length - 1];
      const match = last?.type === 'text' && last.value.match(/\s*\{#([\w-]+)\}\s*$/);
      if (!match) return;
      last.value = last.value.slice(0, match.index);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: match[1] } };
    });
    visit(tree, 'html', (node) => {
      node.value = node.value.replace(
        /(\s(href|src)=")([^"]*)"/g,
        (_, start, attr, url) => `${start}${resolve(url, attr === 'href')}"`,
      );
    });
  };
}
