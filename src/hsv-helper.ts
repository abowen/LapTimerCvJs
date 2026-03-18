import type { ColorConfig } from './types';
import { COLOR_CONFIGS, HSV_SAMPLE_SIZE } from './config';
import { hsvToRgb } from './utils';

import { addBlockedEntry } from './blocked-ranges';

export interface HsvRange {
  hMin: number; hMax: number;
  sMin: number; sMax: number;
  vMin: number; vMax: number;
}

/**
 * Sample a 50×50 region of canvas pixels centred on (cx, cy) and return
 * the per-channel HSV min/max values together with the raw ImageData so
 * callers can render a swatch.
 */
export function sampleHsvAt(
  cx: number,
  cy: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): { range: HsvRange; imageData: ImageData } {
  const half = Math.floor(HSV_SAMPLE_SIZE / 2);
  const x = Math.max(0, Math.min(canvas.width  - 1, cx - half));
  const y = Math.max(0, Math.min(canvas.height - 1, cy - half));
  const w = Math.min(HSV_SAMPLE_SIZE, canvas.width  - x);
  const h = Math.min(HSV_SAMPLE_SIZE, canvas.height - y);

  const imageData = ctx.getImageData(x, y, w, h);
  const src = cv.matFromImageData(imageData);
  const rgb = new cv.Mat();
  const hsv = new cv.Mat();
  const channels = new cv.MatVector();

  try {
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
    cv.split(hsv, channels);

    const hCh = channels.get(0);
    const sCh = channels.get(1);
    const vCh = channels.get(2);

    const getMinMax = (mat: { data: ArrayLike<number> }): { min: number; max: number } => {
      const d = mat.data as Uint8Array;
      let lo = 255, hi = 0;
      for (let i = 0; i < d.length; i++) {
        if (d[i] < lo) lo = d[i];
        if (d[i] > hi) hi = d[i];
      }
      return { min: lo, max: hi };
    };

    const hR = getMinMax(hCh);
    const sR = getMinMax(sCh);
    const vR = getMinMax(vCh);

    hCh.delete(); sCh.delete(); vCh.delete();

    return {
      range: { hMin: hR.min, hMax: hR.max, sMin: sR.min, sMax: sR.max, vMin: vR.min, vMax: vR.max },
      imageData,
    };
  } finally {
    src.delete(); rgb.delete(); hsv.delete(); channels.delete();
  }
}

/**
 * Add a custom color derived from an HsvRange to COLOR_CONFIGS and append
 * a matching option to every car select dropdown already in the DOM.
 */
function registerCustomColor(name: string, range: HsvRange): void {
  // Build a unique camelCase key
  let base = name.toLowerCase().replace(/\s+(.)/g, (_, c: string) => c.toUpperCase())
                 .replace(/[^a-zA-Z0-9]/g, '');
  if (!base) base = 'custom';
  let key = base;
  let n = 2;
  while (COLOR_CONFIGS[key]) key = base + n++;

  // Derive a representative badge color from the HSV mid-point
  const midH = Math.round((range.hMin + range.hMax) / 2);
  const midS = Math.round((range.sMin + range.sMax) / 2);
  const midV = Math.round((range.vMin + range.vMax) / 2);
  const [r, g, b] = hsvToRgb(midH, midS, midV);
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  const badgeColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const luminance  = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const labelColor = luminance > 0.5 ? '#333333' : '#ffffff';

  const cfg: ColorConfig = { label: name, badgeColor, labelColor, ...range };
  COLOR_CONFIGS[key] = cfg;
}

/**
 * Attach click/touch listeners to the canvas.  On each interaction, sample
 * the HSV range and update the helper UI elements.
 */
export function initHsvHelper(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  resultEl: HTMLDivElement,
  swatchEl: HTMLCanvasElement,
  spans: { hMin: HTMLInputElement; hMax: HTMLInputElement; sMin: HTMLInputElement; sMax: HTMLInputElement; vMin: HTMLInputElement; vMax: HTMLInputElement },
  saveEls: {
    nameInputEl: HTMLInputElement;
    saveBtnEl:   HTMLButtonElement;
    hideBtnEl:   HTMLButtonElement;
    blockedListEl: HTMLElement;
    canvasRef:   HTMLCanvasElement;
  },
): void {
  let lastRange: HsvRange | null = null;

  const handle = (clientX: number, clientY: number): void => {
    const rect = canvas.getBoundingClientRect();
    const cx = Math.round((clientX - rect.left) * (canvas.width  / rect.width));
    const cy = Math.round((clientY - rect.top)  * (canvas.height / rect.height));

    const { range, imageData } = sampleHsvAt(cx, cy, canvas, ctx);
    lastRange = range;

    spans.hMin.value = String(range.hMin);
    spans.hMax.value = String(range.hMax);
    spans.sMin.value = String(range.sMin);
    spans.sMax.value = String(range.sMax);
    spans.vMin.value = String(range.vMin);
    spans.vMax.value = String(range.vMax);

    const tmp = document.createElement('canvas');
    tmp.width  = imageData.width;
    tmp.height = imageData.height;
    tmp.getContext('2d')!.putImageData(imageData, 0, 0);
    swatchEl.getContext('2d')!.drawImage(tmp, 0, 0, swatchEl.width, swatchEl.height);

    resultEl.classList.remove('d-none');
  };

  /** Read the current HSV range from the input fields. */
  function readRangeFromInputs(): HsvRange {
    return {
      hMin: parseInt(spans.hMin.value, 10) || 0,
      hMax: parseInt(spans.hMax.value, 10) || 0,
      sMin: parseInt(spans.sMin.value, 10) || 0,
      sMax: parseInt(spans.sMax.value, 10) || 0,
      vMin: parseInt(spans.vMin.value, 10) || 0,
      vMax: parseInt(spans.vMax.value, 10) || 0,
    };
  }

  saveEls.saveBtnEl.addEventListener('click', () => {
    if (!lastRange) return;
    const name = saveEls.nameInputEl.value.trim();
    if (!name) return;
    registerCustomColor(name, readRangeFromInputs());
    saveEls.nameInputEl.value = '';
  });

  saveEls.hideBtnEl.addEventListener('click', () => {
    if (!lastRange) return;
    addBlockedEntry(readRangeFromInputs(), saveEls.canvasRef, saveEls.blockedListEl);
  });

  canvas.addEventListener('click', (e) => handle(e.clientX, e.clientY));
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handle(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
}
