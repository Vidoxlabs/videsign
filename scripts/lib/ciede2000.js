'use strict';

/**
 * Pure-JS CIEDE2000 (ΔE00).
 *
 * Lab inputs are [L, a, b]. Weighting factors are kL = kC = kH = 1.
 * Pair 1 from Sharma, Wu and Dalal (2005) evaluates to 2.0425.
 */

const DEG = Math.PI / 180;
const POW7_25 = 25 ** 7;

function hypot(x, y) {
  return Math.sqrt((x * x) + (y * y));
}

/** Hue angle in degrees, 0 when both components are 0. */
function hueDegrees(a, b) {
  if (a === 0 && b === 0) return 0;
  const degrees = Math.atan2(b, a) / DEG;
  return degrees < 0 ? degrees + 360 : degrees;
}

/**
 * @param {[number, number, number]} lab1
 * @param {[number, number, number]} lab2
 * @returns {number}
 */
function deltaE00(lab1, lab2) {
  const L1 = lab1[0];
  const a1 = lab1[1];
  const b1 = lab1[2];
  const L2 = lab2[0];
  const a2 = lab2[1];
  const b2 = lab2[2];

  const C1 = hypot(a1, b1);
  const C2 = hypot(a2, b2);
  const cBar = (C1 + C2) / 2;
  const cBar7 = cBar ** 7;
  const G = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + POW7_25)));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = hypot(a1p, b1);
  const C2p = hypot(a2p, b2);
  const h1p = hueDegrees(a1p, b1);
  const h2p = hueDegrees(a2p, b2);

  const dL = L2 - L1;
  const dC = C2p - C1p;

  let dh = 0;
  if (C1p !== 0 && C2p !== 0) {
    const raw = h2p - h1p;
    if (raw > 180) dh = raw - 360;
    else if (raw < -180) dh = raw + 360;
    else dh = raw;
  }

  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * DEG);
  const lBar = (L1 + L2) / 2;
  const cBarP = (C1p + C2p) / 2;

  let hBar = h1p + h2p;
  if (C1p !== 0 && C2p !== 0) {
    const sum = h1p + h2p;
    if (Math.abs(h1p - h2p) <= 180) hBar = sum / 2;
    else if (sum < 360) hBar = (sum + 360) / 2;
    else hBar = (sum - 360) / 2;
  }

  const T = 1
    - (0.17 * Math.cos((hBar - 30) * DEG))
    + (0.24 * Math.cos((2 * hBar) * DEG))
    + (0.32 * Math.cos(((3 * hBar) + 6) * DEG))
    - (0.20 * Math.cos(((4 * hBar) - 63) * DEG));

  const theta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
  const cBarP7 = cBarP ** 7;
  const Rc = 2 * Math.sqrt(cBarP7 / (cBarP7 + POW7_25));
  const lOff = lBar - 50;
  const Sl = 1 + ((0.015 * lOff * lOff) / Math.sqrt(20 + (lOff * lOff)));
  const Sc = 1 + (0.045 * cBarP);
  const Sh = 1 + (0.015 * cBarP * T);
  const Rt = -Math.sin((2 * theta) * DEG) * Rc;

  const termL = dL / Sl;
  const termC = dC / Sc;
  const termH = dH / Sh;
  return Math.sqrt((termL * termL) + (termC * termC) + (termH * termH) + (Rt * termC * termH));
}

const WHITE_X = 0.95047;
const WHITE_Z = 1.08883;
const LAB_EPS = 216 / 24389;
const LAB_KAPPA = 24389 / 27;

function srgbChannel(unit) {
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function labF(t) {
  return t > LAB_EPS ? Math.cbrt(t) : ((LAB_KAPPA * t) + 16) / 116;
}

/**
 * @param {string} hex #RRGGBB
 * @returns {[number, number, number]}
 */
function hexToLab(hex) {
  const raw = hex.charAt(0) === '#' ? hex.slice(1) : hex;
  const red = srgbChannel(Number.parseInt(raw.slice(0, 2), 16) / 255);
  const green = srgbChannel(Number.parseInt(raw.slice(2, 4), 16) / 255);
  const blue = srgbChannel(Number.parseInt(raw.slice(4, 6), 16) / 255);

  const x = ((0.4124564 * red) + (0.3575761 * green) + (0.1804375 * blue)) / WHITE_X;
  const y = (0.2126729 * red) + (0.7151522 * green) + (0.0721750 * blue);
  const z = ((0.0193339 * red) + (0.1191920 * green) + (0.9503041 * blue)) / WHITE_Z;
  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);
  return [(116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number}
 */
function deltaE00Hex(hex1, hex2) {
  return deltaE00(hexToLab(hex1), hexToLab(hex2));
}

module.exports = {
  deltaE00,
  deltaE00Hex,
  hexToLab,
};
