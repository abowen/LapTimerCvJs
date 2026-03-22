import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LapRecord } from '../types';
import { STORAGE_KEY_BEST_LAPS } from './config';

const TOP_OVERALL_COUNT    = 10;
const TOP_PER_DRIVER_COUNT = 5;

export const useBestLapsStore = defineStore('bestLaps', () => {
  const activeProfile = ref('');

  /**
   * Reactive trigger — increment to signal components to re-read.
   * Avoids storing the full list in reactive state (it lives in localStorage).
   */
  const version = ref(0);

  function setActiveProfile(name: string) {
    activeProfile.value = name;
    version.value++;
  }

  /** Load all lap records from localStorage. */
  function loadAll(): LapRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BEST_LAPS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** Load lap records filtered to the active profile. */
  function loadForProfile(): LapRecord[] {
    return loadAll().filter(r => r.profile === activeProfile.value);
  }

  function persist(records: LapRecord[]) {
    localStorage.setItem(STORAGE_KEY_BEST_LAPS, JSON.stringify(records));
  }

  /** Record a new lap under the active profile. */
  function recordLap(driver: string, lapTimeMs: number) {
    const records = loadAll();
    records.push({ driver, lapTimeMs, timestamp: Date.now(), profile: activeProfile.value });
    persist(records);
    version.value++;
  }

  /** Clear all lap records for the active profile. */
  function clearAll() {
    const records = loadAll().filter(r => r.profile !== activeProfile.value);
    persist(records);
    version.value++;
  }

  /** Clear lap records for a specific driver within the active profile. */
  function clearDriver(driver: string) {
    const records = loadAll().filter(
      r => !(r.profile === activeProfile.value && r.driver === driver),
    );
    persist(records);
    version.value++;
  }

  /** Top overall laps (computed from version trigger). */
  const overallBest = computed(() => {
    void version.value; // dependency
    return loadForProfile()
      .sort((a, b) => a.lapTimeMs - b.lapTimeMs)
      .slice(0, TOP_OVERALL_COUNT);
  });

  /** Top laps per driver (computed from version trigger). */
  const perDriverBest = computed(() => {
    void version.value; // dependency
    const records = loadForProfile();
    const byDriver = new Map<string, LapRecord[]>();
    for (const r of records) {
      if (!byDriver.has(r.driver)) byDriver.set(r.driver, []);
      byDriver.get(r.driver)!.push(r);
    }
    const result: { driver: string; laps: LapRecord[] }[] = [];
    for (const name of [...byDriver.keys()].sort()) {
      result.push({
        driver: name,
        laps: byDriver.get(name)!
          .sort((a, b) => a.lapTimeMs - b.lapTimeMs)
          .slice(0, TOP_PER_DRIVER_COUNT),
      });
    }
    return result;
  });

  return {
    activeProfile, version,
    setActiveProfile, recordLap,
    clearAll, clearDriver,
    overallBest, perDriverBest,
  };
});
