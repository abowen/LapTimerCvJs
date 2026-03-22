import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './style.css';
import type { CarState } from './types';
import { DEFAULT_CAR_COLORS, COLOR_CONFIGS, DEFAULT_PROFILE_NAME, STORAGE_KEY_PROFILES } from './config';
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
  setActiveProfile,
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
const video              = document.getElementById('video')              as HTMLVideoElement;
const canvas             = document.getElementById('canvas')             as HTMLCanvasElement;
const ctx                = canvas.getContext('2d')!;
const statusElement      = document.getElementById('status')             as HTMLParagraphElement;
const carsTable          = document.getElementById('cars-table')         as HTMLDivElement;
const startButton        = document.getElementById('start-btn')          as HTMLButtonElement;
const lapsInput          = document.getElementById('laps-input')         as HTMLInputElement;
const profileSelect      = document.getElementById('profile-select')     as HTMLSelectElement;
const saveProfileButton  = document.getElementById('save-profile-btn')   as HTMLButtonElement;
const copyProfileButton  = document.getElementById('copy-profile-btn')   as HTMLButtonElement;
const addProfileButton   = document.getElementById('add-profile-btn')    as HTMLButtonElement;
const colorsListElement  = document.getElementById('colours-list')       as HTMLElement;
const blockedListElement = document.getElementById('blocked-list')       as HTMLElement;
const configMinAreaInput = document.getElementById('cfg-min-area')       as HTMLInputElement;
const configCooldownInput = document.getElementById('cfg-cooldown')      as HTMLInputElement;
const configHsvSizeInput = document.getElementById('cfg-hsv-size')       as HTMLInputElement;
const deleteProfileButton = document.getElementById('delete-profile-btn') as HTMLButtonElement;
const exportButton       = document.getElementById('export-btn')         as HTMLButtonElement;
const importFileInput    = document.getElementById('import-file')        as HTMLInputElement;
const importStatusElement = document.getElementById('import-status')     as HTMLParagraphElement;
const bestOverallLapsList = document.getElementById('best-overall-list') as HTMLElement;
const bestPerDriverLapsList = document.getElementById('best-driver-list') as HTMLElement;
const clearAllLapsButton = document.getElementById('clear-all-laps-btn') as HTMLButtonElement;

const cars: CarState[] = [];

function setStatus(message: string): void {
  statusElement.textContent = message;
}

/** Destroy all existing cars and recreate from a list of color keys. */
function rebuildCarsFromKeys(colorKeys: string[]): void {
  while (cars.length > 0) destroyCar(cars.pop()!);
  for (const colorKey of colorKeys) {
    const car = createCarColumn(colorKey, carsTable);
    rebuildCarBounds(car, canvas);
    updateCarColour(car);
    requestAnimationFrame(() => drawCarRangeBar(car));
    cars.push(car);
  }
}

/** Toggle a colour's car on or off when the Driver Configuration checkbox changes. */
function handleColorToggle(colorKey: string, enabled: boolean): void {
  if (enabled) {
    const car = createCarColumn(colorKey, carsTable);
    rebuildCarBounds(car, canvas);
    updateCarColour(car);
    requestAnimationFrame(() => drawCarRangeBar(car));
    cars.push(car);
  } else {
    const carIndex = cars.findIndex(car => car.configKey === colorKey);
    if (carIndex >= 0) {
      destroyCar(cars[carIndex]);
      cars.splice(carIndex, 1);
    }
  }
}

/** Refresh the best laps panels for the currently active profile. */
function refreshBestLaps(): void {
  renderOverallBestLaps(bestOverallLapsList);
  renderPerDriverBestLaps(bestPerDriverLapsList, (driverName) => {
    clearDriverLapRecords(driverName);
    refreshBestLaps();
  });
}

/** Apply a profile, rebuild cars, and re-render the colours list and best laps. */
function switchToProfile(profileName: string): void {
  const colorKeys = applyProfile(profileName, canvas, blockedListElement);
  if (colorKeys) rebuildCarsFromKeys(colorKeys);
  renderColoursList(colorsListElement, cars, handleColorToggle);
  setActiveProfile(profileName);
  refreshBestLaps();
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
      nameInput:          document.getElementById('hsv-name-input')  as HTMLInputElement,
      saveButton:         document.getElementById('hsv-save-btn')    as HTMLButtonElement,
      blockButton:        document.getElementById('hsv-hide-btn')    as HTMLButtonElement,
      blockedListElement: document.getElementById('blocked-list')    as HTMLElement,
      canvasReference:    canvas,
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
  const profileKeys = ensureDefaultProfile(cars, canvas, blockedListElement);
  if (profileKeys) rebuildCarsFromKeys(profileKeys);
  populateProfileDropdown(profileSelect);
  const savedProfileName = loadSelectedProfile();
  profileSelect.value = savedProfileName;
  // If the saved profile no longer exists, fall back to default
  if (profileSelect.value !== savedProfileName) profileSelect.value = DEFAULT_PROFILE_NAME;
  switchToProfile(profileSelect.value);
  renderColoursList(colorsListElement, cars, handleColorToggle);

  profileSelect.addEventListener('change', () => {
    switchToProfile(profileSelect.value);
    saveSelectedProfile(profileSelect.value);
  });

  saveProfileButton.addEventListener('click', () => {
    const profileName = profileSelect.value;
    if (!profileName) return;
    saveCurrentProfile(profileName, cars);
  });

  copyProfileButton.addEventListener('click', () => {
    const inputName = prompt('New profile name (copy of current):');
    if (!inputName || !inputName.trim()) return;
    const profileName = inputName.trim();
    saveCurrentProfile(profileName, cars);
    populateProfileDropdown(profileSelect);
    profileSelect.value = profileName;
    saveSelectedProfile(profileName);
    updateDeleteButton();
  });

  addProfileButton.addEventListener('click', () => {
    const inputName = prompt('New profile name:');
    if (!inputName || !inputName.trim()) return;
    const profileName = inputName.trim();
    // Destroy all existing cars and clear colours for a blank profile
    while (cars.length > 0) destroyCar(cars.pop()!);
    for (const key of Object.keys(COLOR_CONFIGS)) delete COLOR_CONFIGS[key];
    saveCurrentProfile(profileName, cars);
    populateProfileDropdown(profileSelect);
    profileSelect.value = profileName;
    saveSelectedProfile(profileName);
    renderColoursList(colorsListElement, cars, handleColorToggle);
    updateDeleteButton();
  });

  // Re-render colours list when a custom colour is saved via the HSV helper
  // and auto-enable the newly added colour
  document.getElementById('hsv-save-btn')!.addEventListener('click', () => {
    for (const key of Object.keys(COLOR_CONFIGS)) {
      if (!cars.some(car => car.configKey === key)) {
        handleColorToggle(key, true);
      }
    }
    renderColoursList(colorsListElement, cars, handleColorToggle);
  });

  startButton.addEventListener('click', () => {
    if (race.state === 'idle') {
      startRace(cars, startButton, lapsInput);
      profileSelect.disabled = true;
      deleteProfileButton.disabled = true;
    } else if (race.state === 'running') {
      resetRace(cars, startButton, lapsInput);
      profileSelect.disabled = false;
      updateDeleteButton();
    }
  });

  setStatus('Ready — press Start to begin the race!');
  startDetectionLoop(cars, video, canvas, ctx);

  configMinAreaInput.addEventListener('change', () => {
    const parsedValue = parseInt(configMinAreaInput.value, 10);
    if (!isNaN(parsedValue)) setMinArea(parsedValue);
  });

  configCooldownInput.addEventListener('change', () => {
    const parsedValue = parseInt(configCooldownInput.value, 10);
    if (!isNaN(parsedValue)) setCooldownMs(parsedValue);
  });

  configHsvSizeInput.addEventListener('change', () => {
    const parsedValue = parseInt(configHsvSizeInput.value, 10);
    if (!isNaN(parsedValue)) setHsvSampleSize(parsedValue);
  });

  // Update delete button state based on profile count
  function updateDeleteButton(): void {
    const profileCount = Object.keys(loadProfiles()).length;
    deleteProfileButton.disabled = profileCount <= 1;
  }
  updateDeleteButton();

  deleteProfileButton.addEventListener('click', () => {
    const profileName = profileSelect.value;
    if (!profileName) return;
    const profiles = loadProfiles();
    if (Object.keys(profiles).length <= 1) return;
    if (!confirm(`Delete profile "${profileName}"?`)) return;
    deleteProfileByName(profileName);
    populateProfileDropdown(profileSelect);
    const firstProfileName = profileSelect.options[0]?.value;
    if (firstProfileName) {
      profileSelect.value = firstProfileName;
      switchToProfile(firstProfileName);
      saveSelectedProfile(firstProfileName);
    }
    updateDeleteButton();
  });

  // Export current profile as JSON download
  exportButton.addEventListener('click', () => {
    const profileName = profileSelect.value || DEFAULT_PROFILE_NAME;
    const profiles = loadProfiles();
    const profile = profiles[profileName];
    if (!profile) return;

    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = `${profileName}.json`;
    downloadLink.click();
    URL.revokeObjectURL(downloadUrl);
  });

  // Import a profile JSON file
  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const profileData = JSON.parse(reader.result as string) as Profile;
        if (!profileData.colors || !profileData.carAssignments) {
          throw new Error('Invalid profile: missing colors or carAssignments');
        }

        const profileName = file.name.replace(/\.json$/i, '');
        const profiles = loadProfiles();
        profiles[profileName] = profileData;
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));

        populateProfileDropdown(profileSelect);
        profileSelect.value = profileName;
        switchToProfile(profileName);

        importStatusElement.textContent = `Imported profile "${profileName}"`;
        importStatusElement.className = 'small text-success mb-0';
        importStatusElement.classList.remove('d-none');
      } catch (err) {
        importStatusElement.textContent = `Import failed: ${String(err)}`;
        importStatusElement.className = 'small text-danger mb-0';
        importStatusElement.classList.remove('d-none');
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  onLapRecorded(refreshBestLaps);

  clearAllLapsButton.addEventListener('click', () => {
    clearAllLapRecords();
    refreshBestLaps();
  });
}

init().catch((err) => {
  setStatus(`Error: ${String(err)}`);
  console.error(err);
});
