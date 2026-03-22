import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import type { ColorConfig } from '../types';

// localStorage keys
export const STORAGE_KEY_PROFILES         = 'lapTimerProfiles';
export const STORAGE_KEY_SELECTED_PROFILE = 'lapTimerSelectedProfile';
export const STORAGE_KEY_BEST_LAPS        = 'lapTimerBestLaps';
export const DEFAULT_PROFILE_NAME         = 'Demo';

// Detection timing constants
export const OVERLAY_HOLD_MS   = 2000;
export const BADGE_HOLD_FRAMES = 6;

/** Default colour assignment for the six car columns. */
export const DEFAULT_CAR_COLORS = [
  'purple', 'white', 'lightBlue', 'limeGreen', 'orange', 'silver',
];

/** Initial colour profiles (OpenCV HSV: H 0–179, S/V 0–255). */
const INITIAL_COLOR_CONFIGS: Record<string, ColorConfig> = {
  purple:    { label: 'Purple',        badgeColor: '#9b00e8', labelColor: '#e2b8ff',
               hMin: 110, hMax: 155, sMin:  50, sMax: 255, vMin:  40, vMax: 255 },
  white:     { label: 'White',         badgeColor: '#d4d4d4', labelColor: '#f0f0f0',
               hMin:   0, hMax: 179, sMin:   0, sMax:  30, vMin: 220, vMax: 255 },
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

export const useConfigStore = defineStore('config', () => {
  const minArea       = ref(6000);
  const cooldownMs    = ref(5000);
  const hsvSampleSize = ref(50);

  /** Mutable colour profiles — keyed by camelCase colour name. */
  const colorConfigs = reactive<Record<string, ColorConfig>>({ ...INITIAL_COLOR_CONFIGS });

  /** Replace all colour configs (used when applying a profile). */
  function replaceColorConfigs(configs: Record<string, ColorConfig>) {
    for (const key of Object.keys(colorConfigs)) delete colorConfigs[key];
    for (const [key, cfg] of Object.entries(configs)) colorConfigs[key] = { ...cfg };
  }

  /** Add or update a single colour config. */
  function setColorConfig(key: string, config: ColorConfig) {
    colorConfigs[key] = config;
  }

  /** Remove a colour config by key. */
  function removeColorConfig(key: string) {
    delete colorConfigs[key];
  }

  /** Generate a unique key for a new custom colour. */
  function generateColorKey(name: string): string {
    let baseKey = name.toLowerCase().replace(/\s+(.)/g, (_, char: string) => char.toUpperCase())
                      .replace(/[^a-zA-Z0-9]/g, '');
    if (!baseKey) baseKey = 'custom';
    let uniqueKey = baseKey;
    let suffix = 2;
    while (colorConfigs[uniqueKey]) uniqueKey = baseKey + suffix++;
    return uniqueKey;
  }

  return {
    minArea, cooldownMs, hsvSampleSize,
    colorConfigs,
    replaceColorConfigs, setColorConfig, removeColorConfig, generateColorKey,
  };
});
