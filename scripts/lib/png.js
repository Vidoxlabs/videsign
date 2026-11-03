'use strict';

/**
 * Minimal deterministic PNG reader for the canon pipeline.
 *
 * Pure JavaScript on top of node:zlib. Supports the shapes the canon
 * validator needs: 8-bit grayscale (0), RGB (2), palette (3), grayscale
 * + alpha (4) and RGBA (6), non-interlaced. Returns header facts plus a
 * pixel sampler and a colour histogram. Anything else fails closed.
 */

const zlib = require('zlib');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const COLOR_TYPE_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const COLOR_TYPE_MODE = { 0: 'RGB', 2: 'RGB', 3: 'RGB', 4: 'RGBA', 6: 'RGBA' };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * @param {Buffer} bytes
 * @returns {{width:number, height:number, colorType:number, mode:string,
 *   palette: Array<[number,number,number]> | null,
 *   pixelAt:(x:number,y:number)=>[number,number,number,number],
 *   histogram: Map<string, {r:number,g:number,b:number,count:number}>}}
 */
function decodePng(bytes) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('not a png (bad signature)');
  }

  let offset = 8;
  let ihdr = null;
  let palette = null;
  const idat = [];

  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const body = bytes.subarray(offset + 8, offset + 8 + length);
    if (body.length !== length) throw new Error(`truncated ${type} chunk`);
    if (type === 'IHDR') {
      if (length !== 13) throw new Error('bad IHDR length');
      ihdr = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        bitDepth: body[8],
        colorType: body[9],
        compression: body[10],
        filter: body[11],
        interlace: body[12],
      };
    } else if (type === 'PLTE') {
      palette = [];
      for (let i = 0; i + 2 < body.length; i += 3) {
        palette.push([body[i], body[i + 1], body[i + 2]]);
      }
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (!ihdr) throw new Error('missing IHDR');
  if (ihdr.compression !== 0 || ihdr.filter !== 0) throw new Error('unsupported png method');
  if (ihdr.interlace !== 0) throw new Error('interlaced png not supported');
  if (ihdr.bitDepth !== 8) throw new Error(`bit depth ${ihdr.bitDepth} not supported (8 only)`);
  const channels = COLOR_TYPE_CHANNELS[ihdr.colorType];
  if (!channels) throw new Error(`color type ${ihdr.colorType} not supported`);

  const { width, height } = ihdr;
  if (width <= 0 || height <= 0) throw new Error('empty canvas');
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  if (raw.length !== height * (stride + 1)) {
    throw new Error('pixel data length mismatch');
  }

  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y === 0 ? Buffer.alloc(stride) : pixels.subarray((y - 1) * stride, y * stride);
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? out[x - channels] : 0;
      const up = prev[x];
      const upLeft = x >= channels ? prev[x - channels] : 0;
      let value;
      if (filter === 0) value = row[x];
      else if (filter === 1) value = row[x] + left;
      else if (filter === 2) value = row[x] + up;
      else if (filter === 3) value = row[x] + ((left + up) >> 1);
      else if (filter === 4) value = row[x] + paeth(left, up, upLeft);
      else throw new Error(`unknown filter ${filter}`);
      out[x] = value & 0xff;
    }
  }

  function pixelAt(x, y) {
    const i = (y * width + x) * channels;
    if (ihdr.colorType === 0) return [pixels[i], pixels[i], pixels[i], 255];
    if (ihdr.colorType === 2) return [pixels[i], pixels[i + 1], pixels[i + 2], 255];
    if (ihdr.colorType === 3) {
      const entry = palette && palette[pixels[i]];
      if (!entry) return [0, 0, 0, 255];
      return [entry[0], entry[1], entry[2], 255];
    }
    if (ihdr.colorType === 4) return [pixels[i], pixels[i], pixels[i], pixels[i + 1]];
    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
  }

  const histogram = new Map();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelAt(x, y);
      if (a === 0) continue;
      const key = `${r},${g},${b}`;
      const entry = histogram.get(key);
      if (entry) entry.count += 1;
      else histogram.set(key, { r, g, b, count: 1 });
    }
  }

  return {
    width,
    height,
    colorType: ihdr.colorType,
    mode: COLOR_TYPE_MODE[ihdr.colorType],
    palette,
    pixelAt,
    histogram,
  };
}

module.exports = { decodePng };
