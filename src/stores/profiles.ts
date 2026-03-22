import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Profile, CarData } from '../types';
import { useConfigStore, STORAGE_KEY_PROFILES, STORAGE_KEY_SELECTED_PROFILE, DEFAULT_PROFILE_NAME } from './config';
import { useBlockedRangesStore } from './blockedRanges';
import { useRaceStore } from './race';

export const useProfilesStore = defineStore('profiles', () => {
  const selectedProfile = ref(DEFAULT_PROFILE_NAME);

  /** Load all saved profiles from localStorage. */
  function loadProfiles(): Record<string, Profile> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /** Persist the profiles map to localStorage. */
  function persistProfiles(profiles: Record<string, Profile>) {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  }

  /** Save the currently selected profile name to localStorage. */
  function saveSelectedProfile(name: string) {
    selectedProfile.value = name;
    localStorage.setItem(STORAGE_KEY_SELECTED_PROFILE, name);
  }

  /** Load the previously selected profile name from localStorage. */
  function loadSelectedProfile(): string {
    const saved = localStorage.getItem(STORAGE_KEY_SELECTED_PROFILE) || DEFAULT_PROFILE_NAME;
    selectedProfile.value = saved;
    return saved;
  }

  /** Save the current colour configs, car assignments, blocked ranges, and settings as a named profile. */
  function saveCurrentProfile(name: string, cars: CarData[]) {
    const config = useConfigStore();
    const blocked = useBlockedRangesStore();
    const race = useRaceStore();
    const profiles = loadProfiles();
    const colors: Record<string, import('../types').ColorConfig> = {};
    for (const [key, cfg] of Object.entries(config.colorConfigs)) {
      colors[key] = { ...cfg };
    }
    profiles[name] = {
      colors,
      carAssignments: cars.map(car => car.configKey),
      blockedRanges: blocked.entries.map(e => ({ ...e.range })),
      settings: {
        minArea:       config.minArea,
        cooldownMs:    config.cooldownMs,
        hsvSampleSize: config.hsvSampleSize,
        lapsTarget:    race.lapsTarget,
      },
    };
    persistProfiles(profiles);
  }

  /** Delete a saved profile by name. */
  function deleteProfileByName(name: string) {
    const profiles = loadProfiles();
    delete profiles[name];
    persistProfiles(profiles);
  }

  /**
   * Apply a saved profile: replace COLOR_CONFIGS, restore blocked HSV ranges, and apply settings.
   * Returns the list of enabled car assignment keys, or null if profile not found.
   */
  function applyProfile(
    profileName: string,
    canvasWidth: number,
    canvasHeight: number,
  ): string[] | null {
    const profiles = loadProfiles();
    const profile = profiles[profileName];
    if (!profile) return null;

    const config = useConfigStore();
    const blocked = useBlockedRangesStore();
    const race = useRaceStore();

    config.replaceColorConfigs(profile.colors);

    if (profile.blockedRanges !== undefined) {
      blocked.clearAll();
      for (const range of profile.blockedRanges) {
        blocked.addEntry(range, canvasWidth, canvasHeight);
      }
    }

    if (profile.settings) {
      config.minArea       = profile.settings.minArea;
      config.cooldownMs    = profile.settings.cooldownMs;
      config.hsvSampleSize = profile.settings.hsvSampleSize;
      race.lapsTarget      = profile.settings.lapsTarget;
    }

    return profile.carAssignments.filter(key => config.colorConfigs[key]);
  }

  /** Ensure the Demo profile exists; apply it and return car keys, or null when created fresh. */
  function ensureDefaultProfile(
    cars: CarData[],
    canvasWidth: number,
    canvasHeight: number,
  ): string[] | null {
    const profiles = loadProfiles();
    if (!profiles[DEFAULT_PROFILE_NAME]) {
      saveCurrentProfile(DEFAULT_PROFILE_NAME, cars);
      return null;
    }
    return applyProfile(DEFAULT_PROFILE_NAME, canvasWidth, canvasHeight);
  }

  /** Get the list of profile names. */
  function profileNames(): string[] {
    return Object.keys(loadProfiles());
  }

  /** Import a profile from parsed JSON data. */
  function importProfile(name: string, data: Profile) {
    const profiles = loadProfiles();
    profiles[name] = data;
    persistProfiles(profiles);
  }

  /** Export the profile data for a given name. */
  function exportProfile(name: string): Profile | null {
    const profiles = loadProfiles();
    return profiles[name] ?? null;
  }

  return {
    selectedProfile,
    loadProfiles, persistProfiles,
    saveSelectedProfile, loadSelectedProfile,
    saveCurrentProfile, deleteProfileByName,
    applyProfile, ensureDefaultProfile,
    profileNames, importProfile, exportProfile,
  };
});
