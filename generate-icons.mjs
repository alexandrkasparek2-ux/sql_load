#!/usr/bin/env node
// Generates CycloFuel PWA icons: bicycle wheel on dark background
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = data instanceof Buffer ? data : Buffer.from(data);
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crcBuf]);
}

function createIcon(size) {
  const px = new Uint8Array(size * size * 3);
  // Background #080c14
  for (let i = 0; i < size * size; i++) { px[i*3]=8; px[i*3+1]=12; px[i*3+2]=20; }

  const cx = size / 2, cy = size / 2;
  const R = 8, G = 12, B = 20;           // bg
  const GR = 34, GG = 197, GB = 94;       // #22c55e green
  const WR = 226, WG = 232, WB = 240;     // #e2e8f0 light

  const outerR   = size * 0.40;
  const rimW     = size * 0.058;
  const hubR     = size * 0.065;
  const spokeHalf = Math.max(1.2, size * 0.018);
  const numSpokes = 6;

  function blend(dst, src, alpha) { return Math.round(dst * (1-alpha) + src * alpha); }

  function paintAt(x, y, r, g, b, alpha=1) {
    if (x<0||x>=size||y<0||y>=size) return;
    const i = (Math.floor(y)*size+Math.floor(x))*3;
    px[i]   = blend(px[i],   r, alpha);
    px[i+1] = blend(px[i+1], g, alpha);
    px[i+2] = blend(px[i+2], b, alpha);
  }

  // Rounded rectangle background (slightly lighter) — subtle card
  const pad = size * 0.08;
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    const i = (y*size+x)*3;
    px[i]=10; px[i+1]=15; px[i+2]=26;
  }

  // Outer rim & hub via per-pixel distance
  for (let y=0; y<size; y++) {
    for (let x=0; x<size; x++) {
      const dx=x-cx, dy=y-cy, dist=Math.sqrt(dx*dx+dy*dy);
      // Rim
      const rimDist = Math.abs(dist - outerR);
      if (rimDist < rimW + 1) {
        const a = Math.max(0, 1 - Math.max(0, rimDist - rimW));
        paintAt(x, y, GR, GG, GB, a);
      }
      // Hub
      if (dist < hubR + 1) {
        const a = Math.max(0, Math.min(1, hubR + 1 - dist));
        paintAt(x, y, GR, GG, GB, a);
      }
    }
  }

  // Spokes
  const innerR = hubR;
  for (let s=0; s<numSpokes; s++) {
    const angle = (s / numSpokes) * Math.PI * 2 - Math.PI/2;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const perp_x = -dy, perp_y = dx;
    for (let t=innerR; t<=outerR-rimW/2; t+=0.4) {
      for (let w=-spokeHalf; w<=spokeHalf; w+=0.4) {
        const fx = cx + dx*t + perp_x*w;
        const fy = cy + dy*t + perp_y*w;
        const edgeDist = spokeHalf - Math.abs(w);
        const alpha = Math.min(1, edgeDist / 0.8);
        paintAt(fx, fy, GR, GG, GB, alpha * 0.9);
      }
    }
  }

  // Build PNG scanlines
  const scanlines = Buffer.alloc(size * (1 + size*3));
  for (let y=0; y<size; y++) {
    scanlines[y*(1+size*3)] = 0;
    for (let x=0; x<size; x++) {
      const src = (y*size+x)*3, dst = y*(1+size*3)+1+x*3;
      scanlines[dst]=px[src]; scanlines[dst+1]=px[src+1]; scanlines[dst+2]=px[src+2];
    }
  }
  const compressed = deflateSync(scanlines, { level: 6 });

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); ihdrData.writeUInt32BE(size, 4);
  ihdrData[8]=8; ihdrData[9]=2; // 8-bit RGB

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = join(__dirname, 'public');
if (!existsSync(publicDir)) mkdirSync(publicDir);

writeFileSync(join(publicDir, 'icon-192.png'),          createIcon(192));
writeFileSync(join(publicDir, 'icon-512.png'),          createIcon(512));
writeFileSync(join(publicDir, 'apple-touch-icon.png'),  createIcon(180));
console.log('Icons created in public/');
