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

/** Minimum and maximum HSV values for each channel. */
export interface HsvRange {
  hMin: number; hMax: number;
  sMin: number; sMax: number;
  vMin: number; vMax: number;
}

/** Per-car runtime state (reactive display + internal detection state). */
export interface CarData {
  /** Unique instance id. */
  id:                       string;
  /** Key into COLOR_CONFIGS identifying this car's colour. */
  configKey:                string;
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
  /** List of lap time display strings (most recent first). */
  lapTimes:                 string[];
  /** Whether to show the "Detected!" badge. */
  showDetectionBadge:       boolean;
  /** Whether to show the "Cooldown" badge. */
  showCooldownBadge:        boolean;
}

/** OpenCV HSV bound matrices for a car (managed outside reactive state). */
export interface CarBounds {
  lowerBound: Mat;
  upperBound: Mat;
}

/** A blocked HSV range with pre-allocated OpenCV bound matrices. */
export interface BlockedEntry {
  range:      HsvRange;
  lowerBound: Mat;
  upperBound: Mat;
}

/** Profile-level settings for detection configuration. */
export interface ProfileSettings {
  minArea:       number;
  cooldownMs:    number;
  hsvSampleSize: number;
  lapsTarget:    number;
}

/** A saved profile containing colour configurations, car assignments, and blocked ranges. */
export interface Profile {
  colors: Record<string, ColorConfig>;
  carAssignments: string[];
  blockedRanges?: HsvRange[];
  settings?: ProfileSettings;
}

/** A single recorded lap. */
export interface LapRecord {
  driver: string;
  lapTimeMs: number;
  timestamp: number;
  profile?: string;
}
