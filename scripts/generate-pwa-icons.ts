import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. Standard EcoFresh Master SVG
  const standardSvg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#012d1d" />
        <stop offset="100%" stop-color="#02472e" />
      </linearGradient>
      <linearGradient id="frostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#00d2ff" />
        <stop offset="100%" stop-color="#10b981" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#34d399" />
        <stop offset="100%" stop-color="#059669" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#00d2ff" flood-opacity="0.3" />
      </filter>
    </defs>

    <!-- App Icon Background -->
    <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
    
    <!-- Outer Decorative Border -->
    <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#10b981" stroke-width="4" stroke-opacity="0.25" />

    <!-- Central EcoFresh Emblem -->
    <g filter="url(#glow)">
      <!-- Snowflake / Cold-Chain Arms -->
      <g stroke="url(#frostGrad)" stroke-width="18" stroke-linecap="round">
        <!-- Vertical axis -->
        <line x1="256" y1="96" x2="256" y2="416" />
        <!-- Horizontal axis -->
        <line x1="96" y1="256" x2="416" y2="256" />
        <!-- Diagonal 1 -->
        <line x1="142" y1="142" x2="370" y2="370" />
        <!-- Diagonal 2 -->
        <line x1="142" y1="370" x2="370" y2="142" />

        <!-- Outer branch details -->
        <!-- Top -->
        <path d="M226 136 L256 106 L286 136" fill="none" />
        <!-- Bottom -->
        <path d="M226 376 L256 406 L286 376" fill="none" />
        <!-- Left -->
        <path d="M136 226 L106 256 L136 286" fill="none" />
        <!-- Right -->
        <path d="M376 226 L406 256 L376 286" fill="none" />

        <!-- Diagonal branches -->
        <path d="M165 130 L155 155 L180 165" fill="none" />
        <path d="M347 130 L357 155 L332 165" fill="none" />
        <path d="M165 382 L155 357 L180 347" fill="none" />
        <path d="M347 382 L357 357 L332 347" fill="none" />
      </g>

      <!-- Center Hexagon & Letter E Core -->
      <polygon points="256,180 322,218 322,294 256,332 190,294 190,218" fill="#012d1d" stroke="url(#accentGrad)" stroke-width="12" />
      
      <!-- Styled 'E' for EcoFresh -->
      <path d="M224 220 H288 M224 220 V292 H288 M224 256 H276" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>
  </svg>
  `;

  // 2. Maskable SVG (extra safe padding for Android adaptive icons)
  const maskableSvg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#012d1d" />
        <stop offset="100%" stop-color="#02472e" />
      </linearGradient>
      <linearGradient id="frostGradM" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#00d2ff" />
        <stop offset="100%" stop-color="#10b981" />
      </linearGradient>
      <linearGradient id="accentGradM" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#34d399" />
        <stop offset="100%" stop-color="#059669" />
      </linearGradient>
    </defs>

    <!-- Full Bleed Background for Maskable -->
    <rect width="512" height="512" fill="url(#bgGradM)" />

    <!-- Centered within 80% safe zone -->
    <g transform="translate(51.2, 51.2) scale(0.8)">
      <g stroke="url(#frostGradM)" stroke-width="18" stroke-linecap="round">
        <line x1="256" y1="96" x2="256" y2="416" />
        <line x1="96" y1="256" x2="416" y2="256" />
        <line x1="142" y1="142" x2="370" y2="370" />
        <line x1="142" y1="370" x2="370" y2="142" />

        <path d="M226 136 L256 106 L286 136" fill="none" />
        <path d="M226 376 L256 406 L286 376" fill="none" />
        <path d="M136 226 L106 256 L136 286" fill="none" />
        <path d="M376 226 L406 256 L376 286" fill="none" />
      </g>

      <polygon points="256,180 322,218 322,294 256,332 190,294 190,218" fill="#012d1d" stroke="url(#accentGradM)" stroke-width="12" />
      <path d="M224 220 H288 M224 220 V292 H288 M224 256 H276" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>
  </svg>
  `;

  const standardBuffer = Buffer.from(standardSvg);
  const maskableBuffer = Buffer.from(maskableSvg);

  console.log('Generating PWA icons...');

  // 192x192
  await sharp(standardBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192x192.png'));
  console.log('✓ Created icon-192x192.png');

  // 512x512
  await sharp(standardBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512x512.png'));
  console.log('✓ Created icon-512x512.png');

  // Maskable 512x512
  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));
  console.log('✓ Created icon-maskable-512x512.png');

  // Apple Touch Icon 180x180
  await sharp(standardBuffer).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png (180x180)');

  // Favicon sizes
  await sharp(standardBuffer).resize(32, 32).png().toFile(path.join(iconsDir, 'favicon-32x32.png'));
  await sharp(standardBuffer).resize(16, 16).png().toFile(path.join(iconsDir, 'favicon-16x16.png'));
  await sharp(standardBuffer).resize(48, 48).png().toFile(path.join(process.cwd(), 'public', 'favicon.ico'));
  console.log('✓ Created favicons');

  // Also save SVG
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), standardSvg.trim());
  console.log('✓ Created icon.svg');

  console.log('🎉 All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
