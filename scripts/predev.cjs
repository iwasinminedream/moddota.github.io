const fs = require('fs');
const p = require('path');
const { execSync } = require('child_process');

const __dir = p.resolve(__dirname, '..');

// Find dota-data sibling
const paths = ['./dota-data', '../dota-data', '../../dota-data'];
const dst = p.resolve(__dir, 'node_modules/@moddota/dota-data');

for (const rel of paths) {
  const src = p.resolve(__dir, rel);
  if (fs.existsSync(src)) {
    // Build dota-data
    console.log('Building dota-data...');
    execSync('npm run build', { cwd: src, stdio: 'inherit' });

    // Copy files and lib
    for (const d of ['files', 'lib']) {
      const s = p.join(src, d);
      const t = p.join(dst, d);
      if (fs.existsSync(s)) {
        fs.cpSync(s, t, { recursive: true });
        console.log('Copied', d, 'from', src);
      }
    }
    break;
  }
}

// Clear Vite/Astro cache so it picks up new data
for (const d of ['.astro', 'node_modules/.vite']) {
  const full = p.resolve(__dir, d);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log('Cleared cache:', d);
  }
}
