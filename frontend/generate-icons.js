const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function crc32(buf) {
  let crc = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBytes, data]);
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crc32(crcInput))]);
}

function makePNG(size) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);   // width
  ihdr.writeUInt32BE(size, 4);   // height
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build raw RGB pixel data
  const raw = [];
  const r = Math.round(size * 0.19); // corner radius

  for (let y = 0; y < size; y++) {
    raw.push(0); // filter type: None
    for (let x = 0; x < size; x++) {
      // Rounded rect check
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      let inRect = true;
      if (dx < r && dy < r) {
        inRect = (dx - r) ** 2 + (dy - r) ** 2 <= r * r;
      }

      if (!inRect) {
        // White background
        raw.push(255, 255, 255);
      } else {
        // Draw "A" letter in white on blue
        const cx = size / 2;
        const cy = size / 2 + size * 0.03;
        const fw = size * 0.42;
        const fh = size * 0.52;
        const lx = x - cx;
        const ly = y - cy;

        // Normalize to -1..1
        const nx = lx / fw;
        const ny = ly / fh;

        // A shape: two diagonal strokes + crossbar
        const thick = 0.13;
        const leftStroke  = Math.abs(nx + ny * 0.55 + 0.01) < thick && ny < 0.5 && ny > -0.95;
        const rightStroke = Math.abs(nx - ny * 0.55 - 0.01) < thick && ny < 0.5 && ny > -0.95;
        const crossbar    = Math.abs(ny + 0.1) < 0.1 && Math.abs(nx) < 0.42;

        if (leftStroke || rightStroke || crossbar) {
          raw.push(255, 255, 255); // white letter
        } else {
          raw.push(37, 99, 235);   // blue background #2563EB
        }
      }
    }
  }

  const rawBuf = Buffer.from(raw);
  const compressed = zlib.deflateSync(rawBuf);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  return png;
}

for (const size of [192, 512]) {
  const png = makePNG(size);
  const outPath = path.join(__dirname, `public/icons/icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Created icon-${size}.png (${png.length} bytes)`);
}
