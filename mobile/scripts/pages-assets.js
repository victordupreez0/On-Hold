// Runs after `expo export -p web` (npm run export:web).
// `wrangler pages deploy` skips every folder named node_modules, and the export puts the fonts
// and icons in dist/assets/node_modules. Rename it and point the bundle at the new path, or the
// deployed app has no fonts and no icons.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
fs.renameSync(path.join(dist, 'assets', 'node_modules'), path.join(dist, 'assets', 'vendor'));

for (const file of fs.readdirSync(dist, { recursive: true })) {
  if (!/\.(js|css|html)$/.test(file)) continue;
  const p = path.join(dist, file);
  const text = fs.readFileSync(p, 'utf8');
  if (text.includes('/assets/node_modules/')) fs.writeFileSync(p, text.replaceAll('/assets/node_modules/', '/assets/vendor/'));
}
