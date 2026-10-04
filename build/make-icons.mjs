import sharp from 'sharp'; import fs from 'node:fs';
const svg = fs.readFileSync('../docs/icons/icon.svg');
for (const [n, s] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) await sharp(svg, { density: 300 }).resize(s, s).png().toFile(`../docs/icons/${n}.png`);
// maskable: full-bleed background, content in safe zone
const m = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#12141c"/><g transform="translate(256 256) scale(.72) translate(-256 -256)">${fs.readFileSync('../docs/icons/icon.svg','utf8').replace(/<svg[^>]*>|<\/svg>|<rect width="512" height="512"[^>]*\/>/g,'')}</g></svg>`;
await sharp(Buffer.from(m), { density: 300 }).resize(512, 512).png().toFile('../docs/icons/icon-maskable-512.png');
