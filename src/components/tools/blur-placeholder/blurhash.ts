/**
 * BlurHash — a TypeScript port of the reference implementation (npm
 * `blurhash` 2.0.5, Wolt, MIT). Operation order is kept identical so
 * `encode()` returns the same string as the package for the same pixels;
 * `__tests__/parity.test.ts` checks that against the real package.
 *
 * Pure: no React, no DOM.
 */

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

const decode83 = (str: string): number => {
  let value = 0;
  for (let i = 0; i < str.length; i++) value = value * 83 + DIGITS.indexOf(str[i]);
  return value;
};

const encode83 = (n: number, length: number): string => {
  let result = "";
  for (let i = 1; i <= length; i++) {
    const digit = (Math.floor(n) / Math.pow(83, length - i)) % 83;
    result += DIGITS[Math.floor(digit)];
  }
  return result;
};

const sRGBToLinear = (value: number): number => {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const linearTosRGB = (value: number): number => {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308
    ? Math.trunc(v * 12.92 * 255 + 0.5)
    : Math.trunc((1.055 * Math.pow(v, 0.4166666666666667) - 0.055) * 255 + 0.5);
};

const sign = (n: number): number => (n < 0 ? -1 : 1);
const signPow = (val: number, exp: number): number => sign(val) * Math.pow(Math.abs(val), exp);

type Triple = [number, number, number];

const multiplyBasisFunction = (
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  basisFunction: (i: number, j: number) => number,
): Triple => {
  let r = 0;
  let g = 0;
  let b = 0;
  const bytesPerRow = width * 4;
  for (let x = 0; x < width; x++) {
    const bytesPerPixel = 4 * x;
    for (let y = 0; y < height; y++) {
      const basePixelIndex = bytesPerPixel + y * bytesPerRow;
      const basis = basisFunction(x, y);
      r += basis * sRGBToLinear(pixels[basePixelIndex]);
      g += basis * sRGBToLinear(pixels[basePixelIndex + 1]);
      b += basis * sRGBToLinear(pixels[basePixelIndex + 2]);
    }
  }
  const scale = 1 / (width * height);
  return [r * scale, g * scale, b * scale];
};

const encodeDC = (value: Triple): number => {
  const r = linearTosRGB(value[0]);
  const g = linearTosRGB(value[1]);
  const b = linearTosRGB(value[2]);
  return (r << 16) + (g << 8) + b;
};

const encodeAC = (value: Triple, maximumValue: number): number => {
  const quant = (v: number) => Math.floor(Math.max(0, Math.min(18, Math.floor(signPow(v / maximumValue, 0.5) * 9 + 9.5))));
  return quant(value[0]) * 19 * 19 + quant(value[1]) * 19 + quant(value[2]);
};

/** RGBA pixels (alpha ignored) → BlurHash string. Components 1–9 each way. */
export function encodeBlurhash(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  componentX: number,
  componentY: number,
): string {
  if (componentX < 1 || componentX > 9 || componentY < 1 || componentY > 9)
    throw new Error("BlurHash must have between 1 and 9 components");
  if (width * height * 4 !== pixels.length) throw new Error("Width and height must match the pixels array");

  const factors: Triple[] = [];
  for (let y = 0; y < componentY; y++) {
    for (let x = 0; x < componentX; x++) {
      const normalisation = x === 0 && y === 0 ? 1 : 2;
      const factor = multiplyBasisFunction(
        pixels,
        width,
        height,
        (i, j) => normalisation * Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height),
      );
      factors.push(factor);
    }
  }

  const dc = factors[0];
  const ac = factors.slice(1);
  let hash = "";
  const sizeFlag = componentX - 1 + (componentY - 1) * 9;
  hash += encode83(sizeFlag, 1);

  let maximumValue: number;
  if (ac.length > 0) {
    const actualMaximumValue = Math.max(...ac.map((val) => Math.max(...val)));
    const quantisedMaximumValue = Math.floor(Math.max(0, Math.min(82, Math.floor(actualMaximumValue * 166 - 0.5))));
    maximumValue = (quantisedMaximumValue + 1) / 166;
    hash += encode83(quantisedMaximumValue, 1);
  } else {
    maximumValue = 1;
    hash += encode83(0, 1);
  }

  hash += encode83(encodeDC(dc), 4);
  for (const factor of ac) hash += encode83(encodeAC(factor, maximumValue), 2);
  return hash;
}

/** True when the string has a valid BlurHash shape. */
export function isBlurhashValid(hash: string): boolean {
  if (!hash || hash.length < 6) return false;
  const sizeFlag = decode83(hash[0]);
  const numY = Math.floor(sizeFlag / 9) + 1;
  const numX = (sizeFlag % 9) + 1;
  return hash.length === 4 + 2 * numX * numY;
}

/** BlurHash → RGBA pixels at the requested size (opaque). */
export function decodeBlurhash(blurhash: string, width: number, height: number, punch = 1): Uint8ClampedArray {
  if (!isBlurhashValid(blurhash)) throw new Error("Invalid BlurHash");
  const p = punch | 1;
  const sizeFlag = decode83(blurhash[0]);
  const numY = Math.floor(sizeFlag / 9) + 1;
  const numX = (sizeFlag % 9) + 1;
  const maximumValue = (decode83(blurhash[1]) + 1) / 166;

  const colors: Triple[] = new Array(numX * numY);
  for (let i = 0; i < colors.length; i++) {
    if (i === 0) {
      const value = decode83(blurhash.substring(2, 6));
      colors[i] = [sRGBToLinear(value >> 16), sRGBToLinear((value >> 8) & 255), sRGBToLinear(value & 255)];
    } else {
      const value = decode83(blurhash.substring(4 + i * 2, 6 + i * 2));
      const mv = maximumValue * p;
      const qR = Math.floor(value / (19 * 19));
      const qG = Math.floor(value / 19) % 19;
      const qB = value % 19;
      colors[i] = [signPow((qR - 9) / 9, 2) * mv, signPow((qG - 9) / 9, 2) * mv, signPow((qB - 9) / 9, 2) * mv];
    }
  }

  const bytesPerRow = width * 4;
  const pixels = new Uint8ClampedArray(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < numY; j++) {
        for (let i = 0; i < numX; i++) {
          const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
          const color = colors[i + j * numX];
          r += color[0] * basis;
          g += color[1] * basis;
          b += color[2] * basis;
        }
      }
      pixels[4 * x + 0 + y * bytesPerRow] = linearTosRGB(r);
      pixels[4 * x + 1 + y * bytesPerRow] = linearTosRGB(g);
      pixels[4 * x + 2 + y * bytesPerRow] = linearTosRGB(b);
      pixels[4 * x + 3 + y * bytesPerRow] = 255;
    }
  }
  return pixels;
}
