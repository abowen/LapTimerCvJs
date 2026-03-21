import type { Mat } from '@techstark/opencv-js';
import type { HsvRange } from './hsv-helper';
import { hsvToRgb } from './utils';

const SWATCH_WIDTH  = '100px';
const SWATCH_HEIGHT = '20px';

/** A blocked HSV range with pre-allocated OpenCV bound matrices. */
export interface BlockedEntry {
  range:      HsvRange;
  lowerBound: Mat;
  upperBound: Mat;
}

/** All currently active blocked HSV ranges. */
export const blockedEntries: BlockedEntry[] = [];

/** Add a new blocked range, render it in the list, and return the entry. */
export function addBlockedEntry(
  range: HsvRange,
  canvas: HTMLCanvasElement,
  listElement: HTMLElement,
): void {
  const canvasHeight = canvas.height;
  const canvasWidth  = canvas.width;
  const entry: BlockedEntry = {
    range,
    lowerBound: new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC3,
      new cv.Scalar(range.hMin, range.sMin, range.vMin)),
    upperBound: new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC3,
      new cv.Scalar(range.hMax, range.sMax, range.vMax)),
  };
  const index = blockedEntries.push(entry) - 1;
  renderBlockedEntry(entry, index, listElement);
  listElement.closest('#blocked-section')?.classList.remove('d-none');
}

/** Remove a blocked range by index, free its Mats, and re-render the list. */
function removeBlockedEntry(index: number, listElement: HTMLElement): void {
  const [entry] = blockedEntries.splice(index, 1);
  entry.lowerBound.delete();
  entry.upperBound.delete();
  rerenderBlockedList(listElement);
  if (blockedEntries.length === 0) listElement.closest('#blocked-section')?.classList.add('d-none');
}

/** Render a single blocked entry row with colour swatch, range label, and remove button. */
function renderBlockedEntry(entry: BlockedEntry, index: number, listElement: HTMLElement): void {
  const { range } = entry;
  const row = document.createElement('div');
  row.className = 'd-flex align-items-center gap-2 mb-1';
  row.dataset['index'] = String(index);

  // Color swatch from HSV midpoint
  const swatch = document.createElement('span');
  swatch.className = 'flex-shrink-0 rounded border';
  swatch.style.width   = SWATCH_WIDTH;
  swatch.style.height  = SWATCH_HEIGHT;
  swatch.style.display = 'inline-block';
  const [r, g, b] = hsvToRgb(
    Math.round((range.hMin + range.hMax) / 2),
    Math.round((range.sMin + range.sMax) / 2),
    Math.round((range.vMin + range.vMax) / 2),
  );
  swatch.style.backgroundColor = `rgb(${r},${g},${b})`;

  const rangeLabel = document.createElement('span');
  rangeLabel.className   = 'font-monospace small flex-grow-1';
  rangeLabel.textContent = `H: ${range.hMin}–${range.hMax}  S: ${range.sMin}–${range.sMax}  V: ${range.vMin}–${range.vMax}`;

  const removeButton = document.createElement('button');
  removeButton.className   = 'btn btn-sm btn-outline-danger py-0 px-1 flex-shrink-0';
  removeButton.textContent = '×';
  removeButton.title       = 'Remove block';
  removeButton.addEventListener('click', () => removeBlockedEntry(index, listElement));

  row.append(swatch, rangeLabel, removeButton);
  listElement.appendChild(row);
}

/** Rebuild the blocked list element from scratch (called after a removal). */
function rerenderBlockedList(listElement: HTMLElement): void {
  listElement.innerHTML = '';
  blockedEntries.forEach((entry, i) => renderBlockedEntry(entry, i, listElement));
}

/** Remove all blocked entries, free their Mats, and clear the list. */
export function clearAllBlockedEntries(listElement: HTMLElement): void {
  for (const entry of blockedEntries) {
    entry.lowerBound.delete();
    entry.upperBound.delete();
  }
  blockedEntries.length = 0;
  listElement.innerHTML = '';
  listElement.closest('#blocked-section')?.classList.add('d-none');
}
