import type { ColorConfig } from './types';

// ---------------------------------------------------------------------------
// localStorage keys (centralised to avoid duplication)
// ---------------------------------------------------------------------------
export const STORAGE_KEY_PROFILES         = 'lapTimerProfiles';
export const STORAGE_KEY_SELECTED_PROFILE = 'lapTimerSelectedProfile';
export const STORAGE_KEY_BEST_LAPS        = 'lapTimerBestLaps';

/** Profile name used when no saved selection exists. */
export const DEFAULT_PROFILE_NAME = 'Demo';

// ---------------------------------------------------------------------------
// Detection tuning (runtime-adjustable)
// ---------------------------------------------------------------------------

/** Minimum contour area (px²) to count as a detection. */
export let MIN_AREA = 6000;

/** Gap between lap recordings per car (ms). */
export let COOLDOWN_MS = 5000;

/** Update the minimum detection area at runtime. */
export function setMinArea(value: number): void {
  MIN_AREA = Math.max(1, value);
}

/** Update the cooldown duration at runtime. */
export function setCooldownMs(value: number): void {
  COOLDOWN_MS = Math.max(0, value);
}

/** Size of the HSV sample area in pixels (width & height). */
export let HSV_SAMPLE_SIZE = 50;

/** Update the HSV sample area size at runtime. */
export function setHsvSampleSize(value: number): void {
  HSV_SAMPLE_SIZE = Math.max(1, value);
}

// ---------------------------------------------------------------------------
// Detection timing constants
// ---------------------------------------------------------------------------

/** How long the bounding box lingers after detection (ms). */
export const OVERLAY_HOLD_MS = 2000;

/** Number of frames the "Detected!" badge stays visible. */
export const BADGE_HOLD_FRAMES = 6;

/** Default colour assignment for the six car columns. */
export const DEFAULT_CAR_COLORS = [
  'purple', 'white', 'lightBlue', 'limeGreen', 'orange', 'silver',
];

/** Available colour profiles (OpenCV HSV: H 0–179, S/V 0–255). */
export const COLOR_CONFIGS: Record<string, ColorConfig> = {
  purple:    { label: 'Purple',        badgeColor: '#9b00e8', labelColor: '#e2b8ff',
               hMin: 110, hMax: 155, sMin:  50, sMax: 255, vMin:  40, vMax: 255 },
  white:     { label: 'White',         badgeColor: '#888888', labelColor: '#f0f0f0',
               hMin:   0, hMax: 179, sMin:   0, sMax:  40, vMin: 180, vMax: 255 },
  lightBlue: { label: 'Light Blue',    badgeColor: '#00b4d8', labelColor: '#b8f0ff',
               hMin:  85, hMax: 115, sMin:  60, sMax: 255, vMin:  60, vMax: 255 },
  limeGreen: { label: 'Lime Green',    badgeColor: '#32cd32', labelColor: '#b8ffb8',
               hMin:  35, hMax:  85, sMin:  80, sMax: 255, vMin:  60, vMax: 255 },
  orange:    { label: 'Bright Orange', badgeColor: '#ff6d00', labelColor: '#ffd0a0',
               hMin:   5, hMax:  25, sMin: 120, sMax: 255, vMin: 120, vMax: 255 },
  silver:    { label: 'Silver',        badgeColor: '#909090', labelColor: '#e8e8e8',
               hMin:   0, hMax: 179, sMin:   0, sMax:  60, vMin: 130, vMax: 200 },
  red:       { label: 'Red',           badgeColor: '#e00000', labelColor: '#ffb8b8',
               hMin: 160, hMax: 179, sMin:  50, sMax: 255, vMin:  40, vMax: 255 },
  darkBlue:  { label: 'Dark Blue',     badgeColor: '#0033cc', labelColor: '#b8c8ff',
               hMin: 100, hMax: 130, sMin:  80, sMax: 255, vMin:  20, vMax: 140 },
  yellow:    { label: 'Yellow',        badgeColor: '#f5c400', labelColor: '#fff8b0',
               hMin:  20, hMax:  35, sMin: 100, sMax: 255, vMin: 120, vMax: 255 },
  pink:      { label: 'Pink',          badgeColor: '#ff69b4', labelColor: '#ffd6ee',
               hMin: 145, hMax: 170, sMin:  50, sMax: 255, vMin: 120, vMax: 255 },
};
