/** Create a typed DOM element with an optional CSS class string. */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/** Format milliseconds as a SS.mmm stopwatch string. */
export function formatTime(ms: number): string {
  const clampedMs = Math.max(0, ms);
  const seconds   = Math.floor(clampedMs / 1000);
  const millis    = Math.floor(clampedMs % 1000);
  return `${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

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

const SPEECH_RATE  = 0.9;
const SPEECH_PITCH = 1.0;

/** Speak text via the Web Speech API, cancelling any previous speech. No-op if unavailable. */
export function speakText(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate  = SPEECH_RATE;
  utterance.pitch = SPEECH_PITCH;
  window.speechSynthesis.speak(utterance);
}
