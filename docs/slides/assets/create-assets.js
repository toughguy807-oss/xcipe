const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname);

async function createGradient(filename, color1, color2, angle = '135') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1}"/>
        <stop offset="100%" style="stop-color:${color2}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, filename));
  console.log(`Created ${filename}`);
}

async function createSolidBg(filename, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <rect width="100%" height="100%" fill="${color}"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, filename));
  console.log(`Created ${filename}`);
}

async function main() {
  // Cover gradient: Deep Navy to darker navy
  await createGradient('bg-cover.png', '#1C2833', '#0D1520');
  // Section gradient: Navy to Teal accent
  await createGradient('bg-section.png', '#1C2833', '#1A3A4A');
  // Light background
  await createSolidBg('bg-light.png', '#F8F9FA');
  // White background
  await createSolidBg('bg-white.png', '#FFFFFF');
  // QA slide dark
  await createGradient('bg-dark.png', '#0D1520', '#1C2833');
  console.log('All assets created.');
}

main().catch(console.error);
