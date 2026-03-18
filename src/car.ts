import type { CarState } from './types';
import { COOLDOWN_MS, COLOR_CONFIGS } from './config';
import { el } from './utils';

/** Reset a car's lap timer and start a fresh cooldown window. */
export function resetCarTimer(car: CarState): void {
  const now         = performance.now();
  car.timerStart    = now;
  car.cooldownUntil = now + COOLDOWN_MS;
  car.badgeHold     = 0;
  car.wasInCooldown = false;
}

/** Rebuild OpenCV HSV bound matrices for a car's current colour. */
export function rebuildCarBounds(car: CarState, canvas: HTMLCanvasElement): void {
  if (car.lowerBound) { car.lowerBound.delete(); car.lowerBound = null; }
  if (car.upperBound) { car.upperBound.delete(); car.upperBound = null; }
  const cfg = COLOR_CONFIGS[car.configKey];
  car.lowerBound = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC3,
    new cv.Scalar(cfg.hMin, cfg.sMin, cfg.vMin));
  car.upperBound = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC3,
    new cv.Scalar(cfg.hMax, cfg.sMax, cfg.vMax));
}

/** Sync a car's label, timer, and badge colours to its current colour config. */
export function updateCarColour(car: CarState): void {
  const cfg = COLOR_CONFIGS[car.configKey];
  car.labelEl.textContent      = cfg.label;
  car.labelEl.style.color      = cfg.badgeColor;
  car.timerEl.style.color      = cfg.badgeColor;
  car.badgeEl.textContent      = 'Detected!';
  car.badgeEl.style.background = cfg.badgeColor;
}

/** Prepend a new lap time badge to a car's lap list. */
export function addLapTime(car: CarState, timeStr: string): void {
  const entry = el('span', 'badge car-lap-entry');
  entry.style.background = COLOR_CONFIGS[car.configKey].badgeColor;
  entry.textContent = timeStr;
  car.lapListEl.prepend(entry);
}

/** Toggle a car between enabled and disabled states. */
export function toggleCarDisabled(car: CarState): void {
  car.disabled = !car.disabled;
  if (!car.disabled) resetCarTimer(car);

  const isDisabled = car.disabled;
  car.disableBtnEl.textContent = isDisabled ? '▶' : '⏹';
  car.disableBtnEl.title       = isDisabled ? 'Enable detection' : 'Disable detection';
  car.disableBtnEl.classList.toggle('btn-outline-secondary', !isDisabled);
  car.disableBtnEl.classList.toggle('btn-warning',            isDisabled);
  car.colEl.style.opacity = isDisabled ? '0.45' : '';

  if (isDisabled) {
    car.badgeEl.classList.add('d-none');
    car.cooldownBadgeEl.classList.add('d-none');
  }
}

/** Remove a car from the DOM and free its OpenCV resources. */
export function destroyCar(car: CarState): void {
  if (car.lowerBound) { car.lowerBound.delete(); car.lowerBound = null; }
  if (car.upperBound) { car.upperBound.delete(); car.upperBound = null; }
  car.colEl.remove();
}

/** Build a car column card and append it to the table container. */
export function createCarColumn(
  defaultColorKey: string,
  carsTable: HTMLDivElement,
): CarState {
  const colEl = el('div', 'car-col card shadow-sm');

  // Header
  const header        = el('div', 'card-header p-2 d-flex flex-column gap-1');
  const headerRowEl   = el('div', 'd-flex align-items-center gap-1');
  const labelEl       = el('span', 'small fw-semibold flex-grow-1');
  const disableBtnEl  = el('button', 'btn btn-sm btn-outline-secondary flex-shrink-0');
  const rangeCanvasEl = el('canvas', 'w-100 d-block rounded');
  const timerEl       = el('div', 'car-timer');
  const badgeEl       = el('span', 'badge d-none text-center');
  const cooldownBadgeEl = el('span', 'badge bg-secondary d-none text-center');

  const cfg = COLOR_CONFIGS[defaultColorKey];
  labelEl.textContent = cfg.label;
  labelEl.style.color = cfg.badgeColor;

  disableBtnEl.textContent    = '⏹';
  disableBtnEl.title          = 'Disable detection';
  rangeCanvasEl.height        = 40;
  timerEl.textContent         = '00.000';
  cooldownBadgeEl.textContent = '⏸ Cooldown…';

  headerRowEl.append(labelEl, disableBtnEl);
  header.append(headerRowEl, rangeCanvasEl, timerEl, badgeEl, cooldownBadgeEl);

  // Body (scrollable lap list)
  const bodyEl    = el('div', 'card-body p-2');
  const lapListEl = el('div');
  bodyEl.style.maxHeight = '40dvh';
  bodyEl.style.overflowY = 'auto';
  bodyEl.appendChild(lapListEl);

  colEl.append(header, bodyEl);
  carsTable.appendChild(colEl);

  const car: CarState = {
    configKey:      defaultColorKey,
    lowerBound:     null,
    upperBound:     null,
    disabled:       false,
    lapCount:       0,
    timerStart:     performance.now(),
    cooldownUntil:  0,
    wasInCooldown:  false,
    badgeHold:      0,
    lastRects:      [],
    lastDetectedAt: -Infinity,
    colEl, labelEl, rangeCanvasEl, timerEl,
    badgeEl, cooldownBadgeEl, lapListEl, disableBtnEl,
  };

  disableBtnEl.addEventListener('click', () => toggleCarDisabled(car));

  return car;
}
