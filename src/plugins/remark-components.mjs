import { visit } from 'unist-util-visit';

/**
 * Remark plugin that converts custom JSX-like tags in markdown HTML
 * into actual HTML embeds. Handles: YouTube, Gfycat, StaticVideo.
 */
export default function remarkComponents() {
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

      // <StaticVideo path="xxx" /> or <StaticVideo path="xxx" controls />
      node.value = node.value.replace(
        /<StaticVideo\s+path="([^"]+)"(?:\s+controls)?\s*\/?>/g,
        (match, path) => {
          const controls = match.includes('controls') ? ' controls' : '';
          return `<video width="100%" height="100%" autoplay muted loop${controls}><source src="${path}" type="video/mp4"></video>`;
        }
      );
    });
  };
}
