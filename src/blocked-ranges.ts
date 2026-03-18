import type { Mat } from '@techstark/opencv-js';
import type { HsvRange } from './hsv-helper';
import { hsvToRgb } from './utils';

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
  listEl: HTMLElement,
): void {
  const h = canvas.height;
  const w = canvas.width;
  const entry: BlockedEntry = {
    range,
    lowerBound: new cv.Mat(h, w, cv.CV_8UC3, new cv.Scalar(range.hMin, range.sMin, range.vMin)),
    upperBound: new cv.Mat(h, w, cv.CV_8UC3, new cv.Scalar(range.hMax, range.sMax, range.vMax)),
  };
  const index = blockedEntries.push(entry) - 1;
  renderBlockedEntry(entry, index, listEl);
  listEl.closest('#blocked-section')?.classList.remove('d-none');
}

/** Remove a blocked range by index, free its Mats, and re-render the list. */
function removeBlockedEntry(index: number, listEl: HTMLElement): void {
  const [entry] = blockedEntries.splice(index, 1);
  entry.lowerBound.delete();
  entry.upperBound.delete();
  rerenderList(listEl);
  if (blockedEntries.length === 0) listEl.closest('#blocked-section')?.classList.add('d-none');
}

function renderBlockedEntry(entry: BlockedEntry, index: number, listEl: HTMLElement): void {
  const { range } = entry;
  const row = document.createElement('div');
  row.className = 'd-flex align-items-center gap-2 mb-1';
  row.dataset['index'] = String(index);

  // Color swatch from HSV midpoint
  const swatch = document.createElement('span');
  swatch.className = 'flex-shrink-0 rounded border';
  swatch.style.width  = '100px';
  swatch.style.height = '20px';
  swatch.style.display = 'inline-block';
  const [r, g, b] = hsvToRgb(
    Math.round((range.hMin + range.hMax) / 2),
    Math.round((range.sMin + range.sMax) / 2),
    Math.round((range.vMin + range.vMax) / 2),
  );
  swatch.style.backgroundColor = `rgb(${r},${g},${b})`;

  const label = document.createElement('span');
  label.className    = 'font-monospace small flex-grow-1';
  label.textContent  = `H: ${range.hMin}–${range.hMax}  S: ${range.sMin}–${range.sMax}  V: ${range.vMin}–${range.vMax}`;

  const removeBtn = document.createElement('button');
  removeBtn.className   = 'btn btn-sm btn-outline-danger py-0 px-1 flex-shrink-0';
  removeBtn.textContent = '×';
  removeBtn.title       = 'Remove block';
  removeBtn.addEventListener('click', () => removeBlockedEntry(index, listEl));

  row.append(swatch, label, removeBtn);
  listEl.appendChild(row);
}

/** Rebuild the list element from scratch (called after a removal). */
function rerenderList(listEl: HTMLElement): void {
  listEl.innerHTML = '';
  blockedEntries.forEach((entry, i) => renderBlockedEntry(entry, i, listEl));
}

/** Remove all blocked entries, free their Mats, and clear the list. */
export function clearAllBlockedEntries(listEl: HTMLElement): void {
  for (const entry of blockedEntries) {
    entry.lowerBound.delete();
    entry.upperBound.delete();
  }
  blockedEntries.length = 0;
  listEl.innerHTML = '';
  listEl.closest('#blocked-section')?.classList.add('d-none');
}
