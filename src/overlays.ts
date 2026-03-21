import type { CarState, DetectedRect } from './types';
import { COLOR_CONFIGS } from './config';
import { hsvToRgb } from './utils';

// ---------------------------------------------------------------------------
// Overlay drawing constants
// ---------------------------------------------------------------------------
const RECT_FILL_ALPHA          = '1f';           // ~12% opacity fill
const RECT_BORDER_WIDTH        = 3;
const AREA_FONT_MIN            = 11;
const AREA_FONT_MAX            = 16;
const AREA_FONT_DIVISOR        = 8;              // fontSize = rectWidth / divisor
const AREA_LABEL_BG            = 'rgba(0,0,0,0.55)';

const COUNTDOWN_FONT_SCALE     = 0.45;           // fraction of canvas short side
const COUNTDOWN_SHADOW_COLOR   = 'rgba(0,0,0,0.65)';
const COUNTDOWN_SHADOW_OFFSET  = 4;
const COUNTDOWN_TEXT_COLOR     = '#ffe600';

const BANNER_PADDING           = 12;
const BANNER_FONT_MIN          = 18;
const BANNER_FONT_MAX          = 48;
const BANNER_FONT_SCALE        = 0.08;           // fraction of canvas width
const BANNER_BG_ALPHA          = 'cc';            // ~80% opacity
const BANNER_SHADOW_COLOR      = 'rgba(0,0,0,0.5)';
const BANNER_SHADOW_OFFSET     = 2;
const BANNER_TEXT_COLOR        = '#ffffff';

const RANGE_BAR_LABEL_HEIGHT   = 18;
const RANGE_BAR_BORDER_COLOR   = 'rgba(255,255,255,0.7)';
const RANGE_BAR_BORDER_WIDTH   = 1.5;
const RANGE_BAR_LABEL_BG       = 'rgba(0,0,0,0.72)';
const RANGE_BAR_FONT           = '9px monospace';
const RANGE_BAR_DEFAULT_WIDTH  = 150;

/** Draw bounding-box overlays for detected regions on the camera canvas. */
export function drawDetectionOverlay(
  ctx: CanvasRenderingContext2D,
  car: CarState,
  rects: DetectedRect[],
): void {
  const colorConfig = COLOR_CONFIGS[car.configKey];
  for (const rect of rects) {
    ctx.fillStyle   = colorConfig.badgeColor + RECT_FILL_ALPHA;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = colorConfig.badgeColor;
    ctx.lineWidth   = RECT_BORDER_WIDTH;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    const areaLabel = `${Math.round(rect.area).toLocaleString()} px²`;
    const fontSize  = Math.max(AREA_FONT_MIN, Math.min(AREA_FONT_MAX, rect.width / AREA_FONT_DIVISOR));
    ctx.font         = `bold ${fontSize}px "Courier New", monospace`;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    const textX     = rect.x + 4;
    const textY     = rect.y + 4;
    const textWidth = ctx.measureText(areaLabel).width;
    ctx.fillStyle = AREA_LABEL_BG;
    ctx.fillRect(textX - 2, textY - 1, textWidth + 4, fontSize + 4);
    ctx.fillStyle = colorConfig.labelColor;
    ctx.fillText(areaLabel, textX, textY);
  }
}

/** Draw the countdown number centred on the camera canvas. */
export function drawCountdown(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  value: number,
): void {
  const text     = String(value);
  const fontSize = Math.min(canvas.width, canvas.height) * COUNTDOWN_FONT_SCALE;
  const centerX  = canvas.width / 2;
  const centerY  = canvas.height / 2;
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = `bold ${fontSize}px "Courier New", monospace`;
  ctx.fillStyle = COUNTDOWN_SHADOW_COLOR;
  ctx.fillText(text, centerX + COUNTDOWN_SHADOW_OFFSET, centerY + COUNTDOWN_SHADOW_OFFSET);
  ctx.fillStyle = COUNTDOWN_TEXT_COLOR;
  ctx.fillText(text, centerX, centerY);
  ctx.restore();
}

/** Draw the winner banner across the top of the camera canvas. */
export function drawWinnerBanner(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  label: string,
  color: string,
): void {
  if (!label) return;
  const fontSize = Math.max(BANNER_FONT_MIN, Math.min(canvas.width * BANNER_FONT_SCALE, BANNER_FONT_MAX));
  const bannerHeight = fontSize + BANNER_PADDING * 2;
  const centerX = canvas.width / 2;
  ctx.save();
  ctx.font         = `bold ${fontSize}px "Courier New", monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color + BANNER_BG_ALPHA;
  ctx.fillRect(0, 0, canvas.width, bannerHeight);
  ctx.fillStyle = BANNER_SHADOW_COLOR;
  ctx.fillText(label.toUpperCase(), centerX + BANNER_SHADOW_OFFSET, BANNER_PADDING + BANNER_SHADOW_OFFSET);
  ctx.fillStyle = BANNER_TEXT_COLOR;
  ctx.fillText(label.toUpperCase(), centerX, BANNER_PADDING);
  ctx.restore();
}

/** Draw the HSV colour range preview bar inside a car column header. */
export function drawCarRangeBar(car: CarState): void {
  const colorConfig  = COLOR_CONFIGS[car.configKey];
  const barCtx       = car.rangeCanvasElement.getContext('2d')!;
  const canvasWidth  = car.rangeCanvasElement.offsetWidth || RANGE_BAR_DEFAULT_WIDTH;
  const gradientHeight = car.rangeCanvasElement.height - RANGE_BAR_LABEL_HEIGHT;
  car.rangeCanvasElement.width = canvasWidth;

  const midSaturation = Math.round((colorConfig.sMin + colorConfig.sMax) / 2);
  const midValue      = Math.round((colorConfig.vMin + colorConfig.vMax) / 2);

  // Draw horizontal HSV gradient
  for (let x = 0; x < canvasWidth; x++) {
    const hueValue = colorConfig.hMin + ((colorConfig.hMax - colorConfig.hMin) * x) / canvasWidth;
    const [r, g, b] = hsvToRgb(hueValue, midSaturation, midValue);
    barCtx.fillStyle = `rgb(${r},${g},${b})`;
    barCtx.fillRect(x, 0, 1, gradientHeight);
  }

  // Draw left/right border markers
  barCtx.strokeStyle = RANGE_BAR_BORDER_COLOR;
  barCtx.lineWidth   = RANGE_BAR_BORDER_WIDTH;
  barCtx.beginPath();
  barCtx.moveTo(0, 0);                barCtx.lineTo(0, gradientHeight);
  barCtx.moveTo(canvasWidth - 1, 0);  barCtx.lineTo(canvasWidth - 1, gradientHeight);
  barCtx.stroke();

  // Draw HSV range label below gradient
  barCtx.fillStyle    = RANGE_BAR_LABEL_BG;
  barCtx.fillRect(0, gradientHeight, canvasWidth, RANGE_BAR_LABEL_HEIGHT);
  barCtx.fillStyle    = colorConfig.labelColor;
  barCtx.font         = RANGE_BAR_FONT;
  barCtx.textAlign    = 'center';
  barCtx.textBaseline = 'middle';
  barCtx.fillText(
    `H${colorConfig.hMin}–${colorConfig.hMax} S${colorConfig.sMin}–${colorConfig.sMax} V${colorConfig.vMin}–${colorConfig.vMax}`,
    canvasWidth / 2, gradientHeight + RANGE_BAR_LABEL_HEIGHT / 2,
  );
}
