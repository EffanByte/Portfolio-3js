const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'public', 'Floor.png');
const source = fs.readFileSync(sourcePath);
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!source.subarray(0, 8).equals(signature)) {
  throw new Error('public/Floor.png is not a PNG image.');
}

let width;
let height;
let bitDepth;
let colorType;
const compressedData = [];
for (let offset = 8; offset < source.length;) {
  const length = source.readUInt32BE(offset);
  const type = source.toString('ascii', offset + 4, offset + 8);
  const data = source.subarray(offset + 8, offset + 8 + length);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
  } else if (type === 'IDAT') {
    compressedData.push(data);
  } else if (type === 'IEND') {
    break;
  }
  offset += length + 12;
}

if (bitDepth !== 8 || colorType !== 2) {
  throw new Error('Floor map generator expects an 8-bit RGB source PNG.');
}

const bytesPerPixel = 3;
const stride = width * bytesPerPixel;
const filtered = zlib.inflateSync(Buffer.concat(compressedData));
const pixels = Buffer.alloc(height * stride);

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

for (let y = 0; y < height; y++) {
  const filter = filtered[y * (stride + 1)];
  for (let x = 0; x < stride; x++) {
    const raw = filtered[y * (stride + 1) + x + 1];
    const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0;
    const above = y > 0 ? pixels[(y - 1) * stride + x] : 0;
    const upperLeft = y > 0 && x >= bytesPerPixel
      ? pixels[(y - 1) * stride + x - bytesPerPixel]
      : 0;
    let predictor = 0;
    if (filter === 1) predictor = left;
    else if (filter === 2) predictor = above;
    else if (filter === 3) predictor = Math.floor((left + above) / 2);
    else if (filter === 4) predictor = paethPredictor(left, above, upperLeft);
    else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}.`);
    pixels[y * stride + x] = (raw + predictor) & 255;
  }
}

const luminance = new Float32Array(width * height);
for (let index = 0; index < luminance.length; index++) {
  const pixel = index * bytesPerPixel;
  luminance[index] = (
    pixels[pixel] * 0.2126
    + pixels[pixel + 1] * 0.7152
    + pixels[pixel + 2] * 0.0722
  ) / 255;
}

const heights = new Float32Array(width * height);
for (let index = 0; index < heights.length; index++) {
  heights[index] = 0.5 + (luminance[index] - 0.5) * 0.28;
}

const normalPixels = Buffer.alloc(width * height * 4);
const heightPixels = Buffer.alloc(width * height * 4);
function sampleHeight(x, y) {
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));
  return heights[clampedY * width + clampedX];
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const index = y * width + x;
    const left = sampleHeight(x - 1, y - 1) + 2 * sampleHeight(x - 1, y) + sampleHeight(x - 1, y + 1);
    const right = sampleHeight(x + 1, y - 1) + 2 * sampleHeight(x + 1, y) + sampleHeight(x + 1, y + 1);
    const top = sampleHeight(x - 1, y - 1) + 2 * sampleHeight(x, y - 1) + sampleHeight(x + 1, y - 1);
    const bottom = sampleHeight(x - 1, y + 1) + 2 * sampleHeight(x, y + 1) + sampleHeight(x + 1, y + 1);
    const dx = (right - left) * 0.25 * 10;
    const dy = (bottom - top) * 0.25 * 10;
    const nx = -dx;
    const ny = dy;
    const inverseLength = 1 / Math.hypot(nx, ny, 1);
    const normalOffset = index * 4;
    normalPixels[normalOffset] = Math.round((nx * inverseLength * 0.5 + 0.5) * 255);
    normalPixels[normalOffset + 1] = Math.round((ny * inverseLength * 0.5 + 0.5) * 255);
    normalPixels[normalOffset + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
    normalPixels[normalOffset + 3] = 255;

    const heightValue = Math.round(heights[index] * 255);
    const heightOffset = index * 4;
    heightPixels[heightOffset] = heightValue;
    heightPixels[heightOffset + 1] = heightValue;
    heightPixels[heightOffset + 2] = heightValue;
    heightPixels[heightOffset + 3] = 255;
  }
}

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const targetOffset = y * (width * 4 + 1);
    scanlines[targetOffset] = 0;
    rgba.copy(scanlines, targetOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

fs.writeFileSync(path.join(root, 'public', 'floor-normal.png'), encodePng(normalPixels));
fs.writeFileSync(path.join(root, 'public', 'floor-height.png'), encodePng(heightPixels));
console.log(`Generated floor normal and height maps (${width}x${height}).`);
