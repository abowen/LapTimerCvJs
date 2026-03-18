/** Create a typed DOM element with an optional CSS class string. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/** Format milliseconds as a SS.mmm stopwatch string. */
export function formatTime(ms: number): string {
  const t      = Math.max(0, ms);
  const secs   = Math.floor(t / 1000);
  const millis = Math.floor(t % 1000);
  return `${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/** Convert OpenCV HSV (H 0–179, S/V 0–255) to sRGB (0–255 each). */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hDeg = h * 2;
  const sn   = s / 255;
  const vn   = v / 255;
  const c    = vn * sn;
  const x    = c * (1 - Math.abs(((hDeg / 60) % 2) - 1));
  const m    = vn - c;
  let r = 0, g = 0, b = 0;
  if      (hDeg < 60)  { r = c; g = x; b = 0; }
  else if (hDeg < 120) { r = x; g = c; b = 0; }
  else if (hDeg < 180) { r = 0; g = c; b = x; }
  else if (hDeg < 240) { r = 0; g = x; b = c; }
  else if (hDeg < 300) { r = x; g = 0; b = c; }
  else                 { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Speak text via the Web Speech API (no-op if unavailable). */
export function speakText(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate  = 0.9;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}
