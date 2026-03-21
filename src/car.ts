import type { CarState } from './types';
import { COOLDOWN_MS, COLOR_CONFIGS } from './config';
import { createElement } from './utils';

const RANGE_CANVAS_HEIGHT    = 40;
const MAX_LAP_LIST_HEIGHT    = '40dvh';
const COOLDOWN_BADGE_TEXT    = '⏸ Cooldown…';
const INITIAL_TIMER_DISPLAY  = '00.000';

/** Reset a car's lap timer and start a fresh cooldown window. */
export function resetCarTimer(car: CarState): void {
  const now             = performance.now();
  car.timerStart        = now;
  car.cooldownUntil     = now + COOLDOWN_MS;
  car.badgeHoldFrames   = 0;
  car.wasInCooldown     = false;
}

/** Rebuild OpenCV HSV bound matrices for a car's current colour. */
export function rebuildCarBounds(car: CarState, canvas: HTMLCanvasElement): void {
  if (car.lowerBound) { car.lowerBound.delete(); car.lowerBound = null; }
  if (car.upperBound) { car.upperBound.delete(); car.upperBound = null; }
  const colorConfig = COLOR_CONFIGS[car.configKey];
  car.lowerBound = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC3,
    new cv.Scalar(colorConfig.hMin, colorConfig.sMin, colorConfig.vMin));
  car.upperBound = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC3,
    new cv.Scalar(colorConfig.hMax, colorConfig.sMax, colorConfig.vMax));
}

/** Sync a car's label, timer, and badge colours to its current colour config. */
export function updateCarColour(car: CarState): void {
  const colorConfig = COLOR_CONFIGS[car.configKey];
  car.labelElement.textContent        = colorConfig.label;
  car.labelElement.style.color        = colorConfig.badgeColor;
  car.timerElement.style.color        = colorConfig.badgeColor;
  car.detectionBadge.textContent      = 'Detected!';
  car.detectionBadge.style.background = colorConfig.badgeColor;
}

/** Prepend a new lap time badge to a car's lap list. */
export function addLapTime(car: CarState, timeStr: string): void {
  const entry = createElement('span', 'badge car-lap-entry');
  entry.style.background = COLOR_CONFIGS[car.configKey].badgeColor;
  entry.textContent = timeStr;
  car.lapListElement.prepend(entry);
}

/** Toggle a car between enabled and disabled states. */
export function toggleCarDisabled(car: CarState): void {
  car.disabled = !car.disabled;
  if (!car.disabled) resetCarTimer(car);

  const isDisabled = car.disabled;
  car.disableButton.textContent = isDisabled ? '▶' : '⏹';
  car.disableButton.title       = isDisabled ? 'Enable detection' : 'Disable detection';
  car.disableButton.classList.toggle('btn-outline-secondary', !isDisabled);
  car.disableButton.classList.toggle('btn-warning',            isDisabled);
  car.columnElement.style.opacity = isDisabled ? '0.45' : '';

  if (isDisabled) {
    car.detectionBadge.classList.add('d-none');
    car.cooldownBadge.classList.add('d-none');
  }
}

/** Remove a car from the DOM and free its OpenCV resources. */
export function destroyCar(car: CarState): void {
  if (car.lowerBound) { car.lowerBound.delete(); car.lowerBound = null; }
  if (car.upperBound) { car.upperBound.delete(); car.upperBound = null; }
  car.columnElement.remove();
}

/** Build a car column card and append it to the table container. */
export function createCarColumn(
  initialColorKey: string,
  carsTable: HTMLDivElement,
): CarState {
  const columnElement = createElement('div', 'car-col card shadow-sm');

  // Header
  const header             = createElement('div', 'card-header p-2 d-flex flex-column gap-1');
  const headerRow          = createElement('div', 'd-flex align-items-center gap-1');
  const labelElement       = createElement('span', 'small fw-semibold flex-grow-1');
  const disableButton      = createElement('button', 'btn btn-sm btn-outline-secondary flex-shrink-0');
  const rangeCanvasElement = createElement('canvas', 'w-100 d-block rounded');
  const timerElement       = createElement('div', 'car-timer');
  const detectionBadge     = createElement('span', 'badge d-none text-center');
  const cooldownBadge      = createElement('span', 'badge bg-secondary d-none text-center');

  const colorConfig = COLOR_CONFIGS[initialColorKey];
  labelElement.textContent = colorConfig.label;
  labelElement.style.color = colorConfig.badgeColor;

  disableButton.textContent      = '⏹';
  disableButton.title            = 'Disable detection';
  rangeCanvasElement.height      = RANGE_CANVAS_HEIGHT;
  timerElement.textContent       = INITIAL_TIMER_DISPLAY;
  cooldownBadge.textContent      = COOLDOWN_BADGE_TEXT;

  headerRow.append(labelElement, disableButton);
  header.append(headerRow, rangeCanvasElement, timerElement, detectionBadge, cooldownBadge);

  // Body (scrollable lap list)
  const bodyElement    = createElement('div', 'card-body p-2');
  const lapListElement = createElement('div');
  bodyElement.style.maxHeight = MAX_LAP_LIST_HEIGHT;
  bodyElement.style.overflowY = 'auto';
  bodyElement.appendChild(lapListElement);

  columnElement.append(header, bodyElement);
  carsTable.appendChild(columnElement);

  const car: CarState = {
    configKey:                initialColorKey,
    lowerBound:               null,
    upperBound:               null,
    disabled:                 false,
    lapCount:                 0,
    timerStart:               performance.now(),
    cooldownUntil:            0,
    wasInCooldown:            false,
    badgeHoldFrames:          0,
    lastDetectedRects:        [],
    lastDetectionTimestampMs: -Infinity,
    columnElement, labelElement, rangeCanvasElement, timerElement,
    detectionBadge, cooldownBadge, lapListElement, disableButton,
  };

  disableButton.addEventListener('click', () => toggleCarDisabled(car));

  return car;
}
