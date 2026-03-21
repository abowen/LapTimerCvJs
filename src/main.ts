import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './style.css';
import type { CarState } from './types';
import { DEFAULT_CAR_COLORS, COLOR_CONFIGS } from './config';
import { setMinArea, setCooldownMs, setHsvSampleSize } from './config';
import { startCamera, waitForOpenCV } from './camera';
import { drawCarRangeBar } from './overlays';
import { createCarColumn, destroyCar, rebuildCarBounds, updateCarColour } from './car';
import { race, startRace, resetRace } from './race';
import { startDetectionLoop } from './detection';
import { initHsvHelper } from './hsv-helper';
import {
  clearAllLapRecords,
  clearDriverLapRecords,
  renderOverallBestLaps,
  renderPerDriverBestLaps,
  onLapRecorded,
} from './best-laps';
import {
  ensureDefaultProfile,
  saveCurrentProfile,
  deleteProfileByName,
  applyProfile,
  populateProfileDropdown,
  renderColoursList,
  loadProfiles,
  saveSelectedProfile,
  loadSelectedProfile,
} from './profiles';
import type { Profile } from './profiles';

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const video     = document.getElementById('video')      as HTMLVideoElement;
const canvas    = document.getElementById('canvas')     as HTMLCanvasElement;
const ctx       = canvas.getContext('2d')!;
const statusEl  = document.getElementById('status')     as HTMLParagraphElement;
const carsTable = document.getElementById('cars-table') as HTMLDivElement;
const startBtn  = document.getElementById('start-btn')  as HTMLButtonElement;
const lapsInput = document.getElementById('laps-input') as HTMLInputElement;
const profileSelect    = document.getElementById('profile-select')     as HTMLSelectElement;
const saveProfileBtn   = document.getElementById('save-profile-btn')   as HTMLButtonElement;
const copyProfileBtn   = document.getElementById('copy-profile-btn')   as HTMLButtonElement;
const addProfileBtn    = document.getElementById('add-profile-btn')    as HTMLButtonElement;
const coloursListEl    = document.getElementById('colours-list')       as HTMLElement;
const blockedListEl    = document.getElementById('blocked-list')       as HTMLElement;
const cfgMinAreaInput  = document.getElementById('cfg-min-area')       as HTMLInputElement;
const cfgCooldownInput = document.getElementById('cfg-cooldown')       as HTMLInputElement;
const cfgHsvSizeInput  = document.getElementById('cfg-hsv-size')       as HTMLInputElement;
const deleteProfileBtn = document.getElementById('delete-profile-btn') as HTMLButtonElement;
const exportBtn        = document.getElementById('export-btn')         as HTMLButtonElement;
const importFileInput  = document.getElementById('import-file')        as HTMLInputElement;
const importStatusEl   = document.getElementById('import-status')      as HTMLParagraphElement;
const bestOverallList  = document.getElementById('best-overall-list')   as HTMLElement;
const bestDriverList   = document.getElementById('best-driver-list')    as HTMLElement;
const clearAllLapsBtn  = document.getElementById('clear-all-laps-btn') as HTMLButtonElement;

const cars: CarState[] = [];

function setStatus(msg: string): void {
  statusEl.textContent = msg;
}

/** Destroy all existing cars and recreate from a list of color keys. */
function rebuildCarsFromKeys(keys: string[]): void {
  while (cars.length > 0) destroyCar(cars.pop()!);
  for (const key of keys) {
    const car = createCarColumn(key, carsTable);
    rebuildCarBounds(car, canvas);
    updateCarColour(car);
    requestAnimationFrame(() => drawCarRangeBar(car));
    cars.push(car);
  }
}

/** Toggle a colour's car on or off when the Driver Configuration checkbox changes. */
function handleColorToggle(key: string, enabled: boolean): void {
  if (enabled) {
    const car = createCarColumn(key, carsTable);
    rebuildCarBounds(car, canvas);
    updateCarColour(car);
    requestAnimationFrame(() => drawCarRangeBar(car));
    cars.push(car);
  } else {
    const idx = cars.findIndex(c => c.configKey === key);
    if (idx >= 0) {
      destroyCar(cars[idx]);
      cars.splice(idx, 1);
    }
  }
}

/** Apply a profile, rebuild cars, and re-render the colours list. */
function switchToProfile(name: string): void {
  const keys = applyProfile(name, canvas, blockedListEl);
  if (keys) rebuildCarsFromKeys(keys);
  renderColoursList(coloursListEl, cars, handleColorToggle);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function init(): Promise<void> {
  await startCamera(video, canvas, setStatus);
  await waitForOpenCV();

  initHsvHelper(
    canvas, ctx,
    document.getElementById('hsv-result') as HTMLDivElement,
    document.getElementById('hsv-swatch') as HTMLCanvasElement,
    {
      hMin: document.getElementById('hsv-h-min') as HTMLInputElement,
      hMax: document.getElementById('hsv-h-max') as HTMLInputElement,
      sMin: document.getElementById('hsv-s-min') as HTMLInputElement,
      sMax: document.getElementById('hsv-s-max') as HTMLInputElement,
      vMin: document.getElementById('hsv-v-min') as HTMLInputElement,
      vMax: document.getElementById('hsv-v-max') as HTMLInputElement,
    },
    {
      nameInputEl:   document.getElementById('hsv-name-input')  as HTMLInputElement,
      saveBtnEl:     document.getElementById('hsv-save-btn')     as HTMLButtonElement,
      hideBtnEl:     document.getElementById('hsv-hide-btn')     as HTMLButtonElement,
      blockedListEl: document.getElementById('blocked-list')     as HTMLElement,
      canvasRef:     canvas,
    },
  );
  for (const colorKey of DEFAULT_CAR_COLORS) {
    const car = createCarColumn(colorKey, carsTable);
    rebuildCarBounds(car, canvas);
    updateCarColour(car);
    requestAnimationFrame(() => drawCarRangeBar(car));
    cars.push(car);
  }

  // Profiles: create Demo if missing, otherwise load it and rebuild cars
  const profileKeys = ensureDefaultProfile(cars, canvas, blockedListEl);
  if (profileKeys) rebuildCarsFromKeys(profileKeys);
  populateProfileDropdown(profileSelect);
  const savedProfile = loadSelectedProfile();
  profileSelect.value = savedProfile;
  // If the saved profile no longer exists, fall back to Demo
  if (profileSelect.value !== savedProfile) profileSelect.value = 'Demo';
  switchToProfile(profileSelect.value);
  renderColoursList(coloursListEl, cars, handleColorToggle);

  profileSelect.addEventListener('change', () => {
    switchToProfile(profileSelect.value);
    saveSelectedProfile(profileSelect.value);
  });

  saveProfileBtn.addEventListener('click', () => {
    const name = profileSelect.value;
    if (!name) return;
    saveCurrentProfile(name, cars);
  });

  copyProfileBtn.addEventListener('click', () => {
    const name = prompt('New profile name (copy of current):');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    saveCurrentProfile(trimmed, cars);
    populateProfileDropdown(profileSelect);
    profileSelect.value = trimmed;
    saveSelectedProfile(trimmed);
    updateDeleteBtn();
  });

  addProfileBtn.addEventListener('click', () => {
    const name = prompt('New profile name:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    // Destroy all existing cars and clear colours for a blank profile
    while (cars.length > 0) destroyCar(cars.pop()!);
    for (const key of Object.keys(COLOR_CONFIGS)) delete COLOR_CONFIGS[key];
    saveCurrentProfile(trimmed, cars);
    populateProfileDropdown(profileSelect);
    profileSelect.value = trimmed;
    saveSelectedProfile(trimmed);
    renderColoursList(coloursListEl, cars, handleColorToggle);
    updateDeleteBtn();
  });

  // Re-render colours list when a custom colour is saved via the HSV helper
  // and auto-enable the newly added colour
  document.getElementById('hsv-save-btn')!.addEventListener('click', () => {
    for (const key of Object.keys(COLOR_CONFIGS)) {
      if (!cars.some(c => c.configKey === key)) {
        handleColorToggle(key, true);
      }
    }
    renderColoursList(coloursListEl, cars, handleColorToggle);
  });

  startBtn.addEventListener('click', () => {
    if (race.state === 'idle') {
      startRace(cars, startBtn, lapsInput);
      profileSelect.disabled = true;
      deleteProfileBtn.disabled = true;
    } else if (race.state === 'running') {
      resetRace(cars, startBtn, lapsInput);
      profileSelect.disabled = false;
      updateDeleteBtn();
    }
  });

  setStatus('Ready — press Start to begin the race!');
  startDetectionLoop(cars, video, canvas, ctx);

  cfgMinAreaInput.addEventListener('change', () => {
    const v = parseInt(cfgMinAreaInput.value, 10);
    if (!isNaN(v)) setMinArea(v);
  });

  cfgCooldownInput.addEventListener('change', () => {
    const v = parseInt(cfgCooldownInput.value, 10);
    if (!isNaN(v)) setCooldownMs(v);
  });

  cfgHsvSizeInput.addEventListener('change', () => {
    const v = parseInt(cfgHsvSizeInput.value, 10);
    if (!isNaN(v)) setHsvSampleSize(v);
  });

  // Update delete button state based on profile count
  function updateDeleteBtn(): void {
    const count = Object.keys(loadProfiles()).length;
    deleteProfileBtn.disabled = count <= 1;
  }
  updateDeleteBtn();

  deleteProfileBtn.addEventListener('click', () => {
    const name = profileSelect.value;
    if (!name) return;
    const profiles = loadProfiles();
    if (Object.keys(profiles).length <= 1) return;
    if (!confirm(`Delete profile "${name}"?`)) return;
    deleteProfileByName(name);
    populateProfileDropdown(profileSelect);
    const first = profileSelect.options[0]?.value;
    if (first) {
      profileSelect.value = first;
      switchToProfile(first);
      saveSelectedProfile(first);
    }
    updateDeleteBtn();
  });

  // Export current profile as JSON download
  exportBtn.addEventListener('click', () => {
    const name = profileSelect.value || 'Demo';
    const profiles = loadProfiles();
    const profile = profiles[name];
    if (!profile) return;

    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import a profile JSON file
  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as Profile;
        if (!data.colors || !data.carAssignments) {
          throw new Error('Invalid profile: missing colors or carAssignments');
        }

        const name = file.name.replace(/\.json$/i, '');
        const profiles = loadProfiles();
        profiles[name] = data;
        localStorage.setItem('lapTimerProfiles', JSON.stringify(profiles));

        populateProfileDropdown(profileSelect);
        profileSelect.value = name;
        switchToProfile(name);

        importStatusEl.textContent = `Imported profile "${name}"`;
        importStatusEl.className = 'small text-success mb-0';
        importStatusEl.classList.remove('d-none');
      } catch (err) {
        importStatusEl.textContent = `Import failed: ${String(err)}`;
        importStatusEl.className = 'small text-danger mb-0';
        importStatusEl.classList.remove('d-none');
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // Best Laps panels
  function refreshBestLaps(): void {
    renderOverallBestLaps(bestOverallList);
    renderPerDriverBestLaps(bestDriverList, (driver) => {
      clearDriverLapRecords(driver);
      refreshBestLaps();
    });
  }

  refreshBestLaps();
  onLapRecorded(refreshBestLaps);

  clearAllLapsBtn.addEventListener('click', () => {
    clearAllLapRecords();
    refreshBestLaps();
  });
}

init().catch((err) => {
  setStatus(`Error: ${String(err)}`);
  console.error(err);
});
