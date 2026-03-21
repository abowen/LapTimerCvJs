import type { CarState, ColorConfig } from './types';
import type { HsvRange } from './hsv-helper';
import { COLOR_CONFIGS, STORAGE_KEY_PROFILES, STORAGE_KEY_SELECTED_PROFILE, DEFAULT_PROFILE_NAME } from './config';
import { destroyCar } from './car';
import { blockedEntries, addBlockedEntry, clearAllBlockedEntries } from './blocked-ranges';

/** Save the currently selected profile name to local storage. */
export function saveSelectedProfile(name: string): void {
  localStorage.setItem(STORAGE_KEY_SELECTED_PROFILE, name);
}

/** Load the previously selected profile name, falling back to the default. */
export function loadSelectedProfile(): string {
  return localStorage.getItem(STORAGE_KEY_SELECTED_PROFILE) || DEFAULT_PROFILE_NAME;
}

/** A saved profile containing colour configurations, car assignments, and blocked ranges. */
export interface Profile {
  colors: Record<string, ColorConfig>;
  carAssignments: string[];
  blockedRanges?: HsvRange[];
}

/** Load all saved profiles from localStorage. */
export function loadProfiles(): Record<string, Profile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Persist the profiles map to localStorage. */
function persistProfiles(profiles: Record<string, Profile>): void {
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
}

/** Save the current colour configs, car assignments, and blocked ranges as a named profile. */
export function saveCurrentProfile(name: string, cars: CarState[]): void {
  const profiles = loadProfiles();
  const colors: Record<string, ColorConfig> = {};
  for (const [key, colorConfig] of Object.entries(COLOR_CONFIGS)) {
    colors[key] = { ...colorConfig };
  }
  profiles[name] = {
    colors,
    carAssignments: cars.map(car => car.configKey),
    blockedRanges: blockedEntries.map(entry => ({ ...entry.range })),
  };
  persistProfiles(profiles);
}

/** Delete a saved profile by name. */
export function deleteProfileByName(name: string): void {
  const profiles = loadProfiles();
  delete profiles[name];
  persistProfiles(profiles);
}

/**
 * Apply a saved profile: replace COLOR_CONFIGS and restore blocked HSV ranges.
 * Returns the list of enabled car assignment keys, or null if profile not found.
 */
export function applyProfile(
  profileName: string,
  canvas: HTMLCanvasElement,
  blockedListElement: HTMLElement,
): string[] | null {
  const profiles = loadProfiles();
  const profile = profiles[profileName];
  if (!profile) return null;

  // Replace COLOR_CONFIGS with the profile's colours
  for (const key of Object.keys(COLOR_CONFIGS)) delete COLOR_CONFIGS[key];
  for (const [key, colorConfig] of Object.entries(profile.colors)) {
    COLOR_CONFIGS[key] = { ...colorConfig };
  }

  // Restore blocked HSV ranges (only when the profile includes the field)
  if (profile.blockedRanges !== undefined) {
    clearAllBlockedEntries(blockedListElement);
    for (const range of profile.blockedRanges) {
      addBlockedEntry(range, canvas, blockedListElement);
    }
  }

  // Filter out any car assignments whose colour no longer exists
  return profile.carAssignments.filter(colorKey => COLOR_CONFIGS[colorKey]);
}

/** Remove a colour from COLOR_CONFIGS and destroy its car if one exists. */
export function removeColour(
  key: string,
  cars: CarState[],
  listElement: HTMLElement,
  onCarColorToggle: (key: string, enabled: boolean) => void,
): void {
  if (Object.keys(COLOR_CONFIGS).length <= 1) return;

  delete COLOR_CONFIGS[key];

  const carIndex = cars.findIndex(car => car.configKey === key);
  if (carIndex >= 0) {
    destroyCar(cars[carIndex]);
    cars.splice(carIndex, 1);
  }

  renderColoursList(listElement, cars, onCarColorToggle);
}

/** Render the available colours list with enabled checkboxes and delete buttons. */
export function renderColoursList(
  listElement: HTMLElement,
  cars: CarState[],
  onCarColorToggle: (key: string, enabled: boolean) => void,
): void {
  listElement.innerHTML = '';

  for (const [key, colorConfig] of Object.entries(COLOR_CONFIGS)) {
    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-2 mb-1';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input flex-shrink-0';
    checkbox.checked = cars.some(car => car.configKey === key);
    checkbox.title = 'Enable / disable car';
    checkbox.addEventListener('change', () => {
      onCarColorToggle(key, checkbox.checked);
    });

    const swatch = document.createElement('span');
    swatch.className = 'flex-shrink-0 rounded border';
    swatch.style.cssText = 'width:100px;height:20px;display:inline-block';
    swatch.style.backgroundColor = colorConfig.badgeColor;

    const label = document.createElement('span');
    label.className = 'small flex-grow-1';
    label.textContent = colorConfig.label;

    const removeButton = document.createElement('button');
    removeButton.className = 'btn btn-sm btn-outline-danger py-0 px-1 flex-shrink-0';
    removeButton.textContent = '×';
    removeButton.title = 'Remove colour';
    removeButton.addEventListener('click', () => removeColour(key, cars, listElement, onCarColorToggle));

    row.append(checkbox, swatch, label, removeButton);
    listElement.appendChild(row);
  }
}

/** Populate the profile dropdown with names of all saved profiles. */
export function populateProfileDropdown(selectElement: HTMLSelectElement): void {
  const profiles = loadProfiles();
  const currentValue = selectElement.value;
  selectElement.innerHTML = '';
  for (const name of Object.keys(profiles)) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    selectElement.appendChild(option);
  }
  if (currentValue && profiles[currentValue]) selectElement.value = currentValue;
}

/**
 * Create the Demo profile from the current state if it does not already
 * exist, then apply it. Returns the car assignment keys if loaded, or null
 * when a new Demo was created.
 */
export function ensureDefaultProfile(
  cars: CarState[],
  canvas: HTMLCanvasElement,
  blockedListElement: HTMLElement,
): string[] | null {
  const profiles = loadProfiles();
  if (!profiles[DEFAULT_PROFILE_NAME]) {
    saveCurrentProfile(DEFAULT_PROFILE_NAME, cars);
    return null;
  }
  return applyProfile(DEFAULT_PROFILE_NAME, canvas, blockedListElement);
}
