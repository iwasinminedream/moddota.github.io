import { visit } from 'unist-util-visit';

export default function remarkRemove() {
  return function transform(tree) {
    visit(tree, 'code', (node) => {
      node.value = node.value
        .replace(/(^|\n)\s*\/\/ @remove-next-line\n.+/g, '')
        .replace(/\s*\/\/ @remove-line:.+/g, '');
    });
  };
}
