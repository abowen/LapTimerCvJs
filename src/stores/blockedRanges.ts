import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { BlockedEntry, HsvRange } from '../types';

export const useBlockedRangesStore = defineStore('blockedRanges', () => {
  const entries = ref<BlockedEntry[]>([]);

  /** Add a new blocked range, allocating OpenCV bound matrices. */
  function addEntry(range: HsvRange, canvasWidth: number, canvasHeight: number) {
    entries.value.push({
      range: { ...range },
      lowerBound: new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC3,
        new cv.Scalar(range.hMin, range.sMin, range.vMin)),
      upperBound: new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC3,
        new cv.Scalar(range.hMax, range.sMax, range.vMax)),
    });
  }

  /** Remove a blocked range by index, freeing its OpenCV mats. */
  function removeEntry(index: number) {
    const [entry] = entries.value.splice(index, 1);
    if (entry) {
      entry.lowerBound.delete();
      entry.upperBound.delete();
    }
  }

  /** Remove all blocked entries, freeing all OpenCV mats. */
  function clearAll() {
    for (const entry of entries.value) {
      entry.lowerBound.delete();
      entry.upperBound.delete();
    }
    entries.value.splice(0);
  }

  return { entries, addEntry, removeEntry, clearAll };
});
