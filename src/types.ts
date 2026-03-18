import type { Mat } from '@techstark/opencv-js';

/** HSV colour range definition for car detection. */
export interface ColorConfig {
  label:      string;
  badgeColor: string;
  labelColor: string;
  hMin: number; hMax: number;
  sMin: number; sMax: number;
  vMin: number; vMax: number;
}

/** A detected bounding rectangle with contour area. */
export interface DetectedRect {
  x:      number;
  y:      number;
  width:  number;
  height: number;
  area:   number;
}

/** Race lifecycle stages. */
export type RaceState = 'idle' | 'countdown' | 'running';

/** Per-car runtime state including detection, timing, and DOM references. */
export interface CarState {
  configKey:       string;
  lowerBound:      Mat | null;
  upperBound:      Mat | null;
  disabled:        boolean;
  lapCount:        number;
  timerStart:      number;
  cooldownUntil:   number;
  wasInCooldown:   boolean;
  badgeHold:       number;
  lastRects:       DetectedRect[];
  lastDetectedAt:  number;
  colEl:           HTMLDivElement;
  labelEl:         HTMLSpanElement;
  rangeCanvasEl:   HTMLCanvasElement;
  timerEl:         HTMLDivElement;
  badgeEl:         HTMLSpanElement;
  cooldownBadgeEl: HTMLSpanElement;
  lapListEl:       HTMLDivElement;
  disableBtnEl:    HTMLButtonElement;
}
