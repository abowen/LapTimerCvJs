import type { ColorConfig } from './types';
import { COLOR_CONFIGS, HSV_SAMPLE_SIZE } from './config';
import { hsvToRgb } from './utils';

import { addBlockedEntry } from './blocked-ranges';

/** Minimum and maximum HSV values for each channel. */
export interface HsvRange {
  hMin: number; hMax: number;
  sMin: number; sMax: number;
  vMin: number; vMax: number;
}

/**
 * Sample a region of canvas pixels centred on (centerX, centerY) and return
 * the per-channel HSV min/max values together with the raw ImageData so
 * callers can render a swatch.
 */
export function sampleHsvAt(
  centerX: number,
  centerY: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): { range: HsvRange; imageData: ImageData } {
  const halfSize     = Math.floor(HSV_SAMPLE_SIZE / 2);
  const sampleX      = Math.max(0, Math.min(canvas.width  - 1, centerX - halfSize));
  const sampleY      = Math.max(0, Math.min(canvas.height - 1, centerY - halfSize));
  const sampleWidth  = Math.min(HSV_SAMPLE_SIZE, canvas.width  - sampleX);
  const sampleHeight = Math.min(HSV_SAMPLE_SIZE, canvas.height - sampleY);

  const imageData = ctx.getImageData(sampleX, sampleY, sampleWidth, sampleHeight);
  const sourceMat = cv.matFromImageData(imageData);
  const rgbMat    = new cv.Mat();
  const hsvMat    = new cv.Mat();
  const channels  = new cv.MatVector();

  try {
    cv.cvtColor(sourceMat, rgbMat, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgbMat, hsvMat, cv.COLOR_RGB2HSV);
    cv.split(hsvMat, channels);

    const hueChannel        = channels.get(0);
    const saturationChannel = channels.get(1);
    const valueChannel      = channels.get(2);

    const getMinMax = (mat: { data: ArrayLike<number> }): { min: number; max: number } => {
      const data = mat.data as Uint8Array;
      let lo = 255, hi = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] < lo) lo = data[i];
        if (data[i] > hi) hi = data[i];
      }
      return { min: lo, max: hi };
    };

    const hueRange        = getMinMax(hueChannel);
    const saturationRange = getMinMax(saturationChannel);
    const valueRange      = getMinMax(valueChannel);

    hueChannel.delete(); saturationChannel.delete(); valueChannel.delete();

    return {
      range: {
        hMin: hueRange.min,        hMax: hueRange.max,
        sMin: saturationRange.min,  sMax: saturationRange.max,
        vMin: valueRange.min,       vMax: valueRange.max,
      },
      imageData,
    };
  } finally {
    sourceMat.delete(); rgbMat.delete(); hsvMat.delete(); channels.delete();
  }
}

/**
 * Add a custom color derived from an HsvRange to COLOR_CONFIGS and append
 * a matching option to every car select dropdown already in the DOM.
 */
function registerCustomColor(name: string, range: HsvRange): void {
  let baseKey = name.toLowerCase().replace(/\s+(.)/g, (_, char: string) => char.toUpperCase())
                    .replace(/[^a-zA-Z0-9]/g, '');
  if (!baseKey) baseKey = 'custom';
  let uniqueKey = baseKey;
  let suffix = 2;
  while (COLOR_CONFIGS[uniqueKey]) uniqueKey = baseKey + suffix++;

  // Derive a representative badge color from the HSV mid-point
  const midHue        = Math.round((range.hMin + range.hMax) / 2);
  const midSaturation = Math.round((range.sMin + range.sMax) / 2);
  const midValue      = Math.round((range.vMin + range.vMax) / 2);
  const [r, g, b]     = hsvToRgb(midHue, midSaturation, midValue);
  const toHex         = (value: number) => value.toString(16).padStart(2, '0');
  const badgeColor    = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const luminance     = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const labelColor    = luminance > 0.5 ? '#333333' : '#ffffff';

  const colorConfig: ColorConfig = { label: name, badgeColor, labelColor, ...range };
  COLOR_CONFIGS[uniqueKey] = colorConfig;
}

/** HSV input field references for the six range values. */
interface HsvRangeInputs {
  hMin: HTMLInputElement; hMax: HTMLInputElement;
  sMin: HTMLInputElement; sMax: HTMLInputElement;
  vMin: HTMLInputElement; vMax: HTMLInputElement;
}

/** References to the save/block panel elements. */
interface SavePanelElements {
  nameInput:       HTMLInputElement;
  saveButton:      HTMLButtonElement;
  blockButton:     HTMLButtonElement;
  blockedListElement: HTMLElement;
  canvasReference: HTMLCanvasElement;
}

/**
 * Attach click/touch listeners to the canvas. On each interaction, sample
 * the HSV range and update the helper UI elements.
 */
export function initHsvHelper(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  resultElement: HTMLDivElement,
  swatchCanvas: HTMLCanvasElement,
  hsvInputs: HsvRangeInputs,
  savePanel: SavePanelElements,
): void {
  let lastSampledRange: HsvRange | null = null;

  /** Read the current HSV range from the input fields. */
  function readRangeFromInputs(): HsvRange {
    return {
      hMin: parseInt(hsvInputs.hMin.value, 10) || 0,
      hMax: parseInt(hsvInputs.hMax.value, 10) || 0,
      sMin: parseInt(hsvInputs.sMin.value, 10) || 0,
      sMax: parseInt(hsvInputs.sMax.value, 10) || 0,
      vMin: parseInt(hsvInputs.vMin.value, 10) || 0,
      vMax: parseInt(hsvInputs.vMax.value, 10) || 0,
    };
  }

  const handleCanvasInteraction = (clientX: number, clientY: number): void => {
    const canvasRect = canvas.getBoundingClientRect();
    const pixelX = Math.round((clientX - canvasRect.left) * (canvas.width  / canvasRect.width));
    const pixelY = Math.round((clientY - canvasRect.top)  * (canvas.height / canvasRect.height));

    const { range, imageData } = sampleHsvAt(pixelX, pixelY, canvas, ctx);
    lastSampledRange = range;

    hsvInputs.hMin.value = String(range.hMin);
    hsvInputs.hMax.value = String(range.hMax);
    hsvInputs.sMin.value = String(range.sMin);
    hsvInputs.sMax.value = String(range.sMax);
    hsvInputs.vMin.value = String(range.vMin);
    hsvInputs.vMax.value = String(range.vMax);

    // Render the sampled region as a preview swatch
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width  = imageData.width;
    tempCanvas.height = imageData.height;
    tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);
    swatchCanvas.getContext('2d')!.drawImage(tempCanvas, 0, 0, swatchCanvas.width, swatchCanvas.height);

    resultElement.classList.remove('d-none');
  };

  savePanel.saveButton.addEventListener('click', () => {
    if (!lastSampledRange) return;
    const name = savePanel.nameInput.value.trim();
    if (!name) return;
    registerCustomColor(name, readRangeFromInputs());
    savePanel.nameInput.value = '';
  });

  savePanel.blockButton.addEventListener('click', () => {
    if (!lastSampledRange) return;
    addBlockedEntry(readRangeFromInputs(), savePanel.canvasReference, savePanel.blockedListElement);
  });

  canvas.addEventListener('click', (event) => handleCanvasInteraction(event.clientX, event.clientY));
  canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    handleCanvasInteraction(event.touches[0].clientX, event.touches[0].clientY);
  }, { passive: false });
}
