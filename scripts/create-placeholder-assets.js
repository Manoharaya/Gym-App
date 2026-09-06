const fs = require('fs');
const path = require('path');

const assetsDir = path.resolve(__dirname, '../apps/mobile/src/assets');
fs.mkdirSync(assetsDir, { recursive: true });

// Minimal valid PNG buffer (1x1 red pixel)
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'].forEach((file) => {
  fs.writeFileSync(path.join(assetsDir, file), pngBuffer);
});

console.log('Mobile placeholder image assets created successfully.');
