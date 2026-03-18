import type { CarState, DetectedRect } from './types';
import { COLOR_CONFIGS } from './config';
import { hsvToRgb } from './utils';

/** Draw bounding-box overlays for detected regions on the camera canvas. */
export function drawDetectionOverlay(
  ctx: CanvasRenderingContext2D,
  car: CarState,
  rects: DetectedRect[],
): void {
  const cfg = COLOR_CONFIGS[car.configKey];
  for (const rect of rects) {
    ctx.fillStyle   = cfg.badgeColor + '1f';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = cfg.badgeColor;
    ctx.lineWidth   = 3;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    const label    = `${Math.round(rect.area).toLocaleString()} px²`;
    const fontSize = Math.max(11, Math.min(16, rect.width / 8));
    ctx.font         = `bold ${fontSize}px "Courier New", monospace`;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    const tx = rect.x + 4;
    const ty = rect.y + 4;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(tx - 2, ty - 1, tw + 4, fontSize + 4);
    ctx.fillStyle = cfg.labelColor;
    ctx.fillText(label, tx, ty);
  }
}

/** Draw the countdown number centred on the camera canvas. */
export function drawCountdown(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  value: number,
): void {
  const text     = String(value);
  const fontSize = Math.min(canvas.width, canvas.height) * 0.45;
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = `bold ${fontSize}px "Courier New", monospace`;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillText(text, canvas.width / 2 + 4, canvas.height / 2 + 4);
  ctx.fillStyle = '#ffe600';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
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
  const padding  = 12;
  const fontSize = Math.max(18, Math.min(canvas.width * 0.08, 48));
  ctx.save();
  ctx.font         = `bold ${fontSize}px "Courier New", monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  const bannerH = fontSize + padding * 2;
  ctx.fillStyle = color + 'cc';
  ctx.fillRect(0, 0, canvas.width, bannerH);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(label.toUpperCase(), canvas.width / 2 + 2, padding + 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label.toUpperCase(), canvas.width / 2, padding);
  ctx.restore();
}

/** Draw the HSV colour range preview bar inside a car column header. */
export function drawCarRangeBar(car: CarState): void {
  const cfg    = COLOR_CONFIGS[car.configKey];
  const barCtx = car.rangeCanvasEl.getContext('2d')!;
  const w      = car.rangeCanvasEl.offsetWidth || 150;
  const gradH  = car.rangeCanvasEl.height - 18;
  car.rangeCanvasEl.width = w;

  const midS = Math.round((cfg.sMin + cfg.sMax) / 2);
  const midV = Math.round((cfg.vMin + cfg.vMax) / 2);

  for (let x = 0; x < w; x++) {
    const hVal = cfg.hMin + ((cfg.hMax - cfg.hMin) * x) / w;
    const [r, g, b] = hsvToRgb(hVal, midS, midV);
    barCtx.fillStyle = `rgb(${r},${g},${b})`;
    barCtx.fillRect(x, 0, 1, gradH);
  }

  barCtx.strokeStyle = 'rgba(255,255,255,0.7)';
  barCtx.lineWidth   = 1.5;
  barCtx.beginPath();
  barCtx.moveTo(0, 0);     barCtx.lineTo(0, gradH);
  barCtx.moveTo(w - 1, 0); barCtx.lineTo(w - 1, gradH);
  barCtx.stroke();

  barCtx.fillStyle    = 'rgba(0,0,0,0.72)';
  barCtx.fillRect(0, gradH, w, 18);
  barCtx.fillStyle    = cfg.labelColor;
  barCtx.font         = '9px monospace';
  barCtx.textAlign    = 'center';
  barCtx.textBaseline = 'middle';
  barCtx.fillText(
    `H${cfg.hMin}–${cfg.hMax} S${cfg.sMin}–${cfg.sMax} V${cfg.vMin}–${cfg.vMax}`,
    w / 2, gradH + 9,
  );
}
