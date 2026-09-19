import sharp from 'sharp';

// An 8x8 average hash (aHash), not a full DCT-based perceptual hash: same
// purpose (near-duplicate detection via Hamming distance on a fixed-length
// bit string). Swapping in a real DCT phash later is a drop-in replacement
// of this one function.
const HASH_SIZE = 8;

export async function computeAverageHash(imageBytes: Buffer): Promise<string> {
  const { data } = await sharp(imageBytes)
    .resize(HASH_SIZE, HASH_SIZE, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const average = data.reduce((sum, value) => sum + value, 0) / data.length;

  let bits = '';
  for (const value of data) bits += value >= average ? '1' : '0';

  // Pack the 64-bit string into hex for compact storage.
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    distance += diff.toString(2).split('1').length - 1;
  }
  return distance;
}
