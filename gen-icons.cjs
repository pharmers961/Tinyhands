// Generates the Tiny Taps app icons (no external deps) for the PWA / home-screen install.
// Design: warm diagonal gradient, white rounded "card", gold star (the in-app reward motif).
const zlib = require('zlib');
const fs = require('fs');

function crc32(buf){
  const table = crc32._t || (crc32._t = (() => {
    const t = [];
    for (let n = 0; n < 256; n++){
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(N, rgba){
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit depth, RGBA
  const stride = N * 4;
  const raw = Buffer.alloc((stride + 1) * N);
  for (let y = 0; y < N; y++){
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

function inRoundRect(px, py, x, y, w, h, r){
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const rx = Math.min(r, w / 2), ry = Math.min(r, h / 2);
  const dx = Math.min(px - x, x + w - px), dy = Math.min(py - y, y + h - py);
  if (dx >= rx || dy >= ry) return true;
  const ddx = rx - dx, ddy = ry - dy;
  return (ddx * ddx) / (rx * rx) + (ddy * ddy) / (ry * ry) <= 1;
}

function inPoly(px, py, pts){
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++){
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function render(N){
  const img = Buffer.alloc(N * N * 4);
  const card = N * 0.60, cardXY = (N - card) / 2, cardR = card * 0.24;
  const starBox = card * 0.74, starXY = (N - starBox) / 2;
  const starPts = [[50,7],[61,38],[94,38],[67,58],[78,90],[50,70],[22,90],[33,58],[6,38],[39,38]]
    .map(p => [starXY + p[0] / 100 * starBox, starXY + p[1] / 100 * starBox]);
  for (let y = 0; y < N; y++){
    for (let x = 0; x < N; x++){
      const t = (x + y) / (2 * N);
      let r = 255, g = lerp(0xd1, 0x7a, t), b = lerp(0x66, 0x92, t); // #ffd166 -> #ff7a92
      if (inRoundRect(x, y, cardXY, cardXY, card, card, cardR)){ r = 255; g = 255; b = 255; }
      if (inPoly(x, y, starPts)){ r = 0xff; g = 0xcf; b = 0x33; }
      const o = (y * N + x) * 4;
      img[o] = r; img[o + 1] = g; img[o + 2] = b; img[o + 3] = 255;
    }
  }
  return img;
}

[['icon-512.png', 512], ['icon-192.png', 192], ['icon-180.png', 180]].forEach(([name, size]) => {
  fs.writeFileSync(name, encodePNG(size, render(size)));
  console.log('wrote', name, size + 'x' + size);
});
