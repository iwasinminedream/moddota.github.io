import { visit } from 'unist-util-visit';

/**
 * Remark plugin that converts custom JSX-like tags in markdown HTML
 * into actual HTML embeds. Handles: YouTube, Gfycat, StaticVideo.
 */
export default function remarkComponents({ base = '/' } = {}) {
  return function transform(tree) {
    visit(tree, 'html', (node) => {
      // <YouTube id="xxx" /> or <YouTube playlistId="xxx" />
      node.value = node.value.replace(
        /<YouTube\s+(?:id="([^"]+)"|playlistId="([^"]+)")\s*\/?>/g,
        (_, id, playlistId) => {
          const src = playlistId
            ? `https://www.youtube.com/embed/videoseries?list=${playlistId}`
            : `https://www.youtube.com/embed/${id}`;
          return `<p style="position:relative;padding-bottom:56.25%"><iframe src="${src}" frameborder="0" allowfullscreen width="100%" height="100%" style="position:absolute;top:0;left:0"></iframe></p>`;
        }
      );

      // <Gfycat id="xxx" />
      node.value = node.value.replace(
        /<Gfycat\s+id="([^"]+)"\s*\/?>/g,
        (_, id) => `<div style="position:relative;padding-bottom:56.25%"><iframe src="https://gfycat.com/ifr/${id}" frameborder="0" scrolling="no" allowfullscreen width="100%" height="100%" style="position:absolute;top:0;left:0"></iframe></div>`
      );

      // <StaticVideo path="xxx" />, <StaticVideo path="xxx" controls /> or controls="true".
      // The path is relative to the site root (`videos/x.mp4` is public/videos/x.mp4).
      node.value = node.value.replace(
        /<StaticVideo\s+path="([^"]+)"([^>]*?)\/?>/g,
        (match, path, attributes) => {
          const controls = /\bcontrols\b(?!="false")/.test(attributes) ? ' controls' : '';
          const src = /^([a-z]+:)?\/\//i.test(path) ? path : `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
          return `<video width="100%" height="100%" autoplay muted loop${controls}><source src="${src}" type="video/mp4"></video>`;
        }
      );
    });
  };
}
