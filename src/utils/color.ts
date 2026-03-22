/**
 * Convert OpenCV HSV (H 0–179, S/V 0–255) to sRGB (0–255 each).
 * Uses the standard HSV-to-RGB sector-based conversion algorithm.
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hueDegrees     = h * 2;
  const saturationNorm = s / 255;
  const valueNorm      = v / 255;
  const chroma         = valueNorm * saturationNorm;
  const secondary      = chroma * (1 - Math.abs(((hueDegrees / 60) % 2) - 1));
  const lightnessMatch = valueNorm - chroma;
  let r = 0, g = 0, b = 0;
  if      (hueDegrees < 60)  { r = chroma; g = secondary; b = 0; }
  else if (hueDegrees < 120) { r = secondary; g = chroma; b = 0; }
  else if (hueDegrees < 180) { r = 0; g = chroma; b = secondary; }
  else if (hueDegrees < 240) { r = 0; g = secondary; b = chroma; }
  else if (hueDegrees < 300) { r = secondary; g = 0; b = chroma; }
  else                       { r = chroma; g = 0; b = secondary; }
  return [
    Math.round((r + lightnessMatch) * 255),
    Math.round((g + lightnessMatch) * 255),
    Math.round((b + lightnessMatch) * 255),
  ];
}

/** Derive a hex badge color and contrasting label color from an HSV range midpoint. */
export function deriveColors(hMin: number, hMax: number, sMin: number, sMax: number, vMin: number, vMax: number): { badgeColor: string; labelColor: string } {
  const midH = Math.round((hMin + hMax) / 2);
  const midS = Math.round((sMin + sMax) / 2);
  const midV = Math.round((vMin + vMax) / 2);
  const [r, g, b] = hsvToRgb(midH, midS, midV);
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  const badgeColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const luminance  = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const labelColor = luminance > 0.5 ? '#333333' : '#ffffff';
  return { badgeColor, labelColor };
}
