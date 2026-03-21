import type { Mat } from '@techstark/opencv-js';

/** HSV colour range and display metadata for a detectable car colour. */
export interface ColorConfig {
  /** Human-readable colour name shown in the UI. */
  label:      string;
  /** Hex colour used for badges, borders, and overlays. */
  badgeColor: string;
  /** Hex colour used for label text (chosen for contrast against badgeColor). */
  labelColor: string;
  /** OpenCV HSV range (H 0–179, S/V 0–255). */
  hMin: number; hMax: number;
  sMin: number; sMax: number;
  vMin: number; vMax: number;
}

/** A detected bounding rectangle with its contour area in pixels. */
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
  /** Key into COLOR_CONFIGS identifying this car's colour. */
  configKey:                string;
  /** OpenCV lower HSV bound matrix (allocated per-canvas). */
  lowerBound:               Mat | null;
  /** OpenCV upper HSV bound matrix (allocated per-canvas). */
  upperBound:               Mat | null;
  /** Whether this car's detection is currently disabled. */
  disabled:                 boolean;
  /** Number of laps completed so far in the current race. */
  lapCount:                 number;
  /** performance.now() timestamp when the current lap timer started. */
  timerStart:               number;
  /** performance.now() timestamp until which new detections are suppressed. */
  cooldownUntil:            number;
  /** Whether the car was in cooldown during the previous frame. */
  wasInCooldown:            boolean;
  /** Remaining frames to keep the "Detected!" badge visible. */
  badgeHoldFrames:          number;
  /** Bounding rectangles from the most recent detection. */
  lastDetectedRects:        DetectedRect[];
  /** performance.now() timestamp of the last successful detection. */
  lastDetectionTimestampMs: number;

  // DOM element references
  columnElement:        HTMLDivElement;
  labelElement:         HTMLSpanElement;
  rangeCanvasElement:   HTMLCanvasElement;
  timerElement:         HTMLDivElement;
  detectionBadge:       HTMLSpanElement;
  cooldownBadge:        HTMLSpanElement;
  lapListElement:       HTMLDivElement;
  disableButton:        HTMLButtonElement;
}
