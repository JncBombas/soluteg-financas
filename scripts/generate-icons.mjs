import sharp from 'sharp';
import { mkdirSync } from 'fs';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

mkdirSync('public/icons', { recursive: true });

for (const size of sizes) {
  await sharp('public/logo3.png')
    .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
    .toFile(`public/icons/icon-${size}x${size}.png`);
  console.log(`✓ icon-${size}x${size}.png`);
}

console.log('Icons gerados em public/icons/');
