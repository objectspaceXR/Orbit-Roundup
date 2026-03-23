#!/usr/bin/env node
/**
 * Generate favicon.ico from saturn.png for link previews (Slack, Discord, etc.)
 * Run: node scripts/generate-favicon.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const pngPath = path.join(projectRoot, 'public', 'icons', 'planets', 'saturn.png');
const outPath = path.join(projectRoot, 'app', 'favicon.ico');

let pngToIco;
try {
  pngToIco = (await import('png-to-ico')).default;
} catch {
  console.error('Run: npm install --save-dev png-to-ico');
  process.exit(1);
}

const buf = await pngToIco(pngPath);
fs.writeFileSync(outPath, buf);
console.log('Wrote app/favicon.ico');
