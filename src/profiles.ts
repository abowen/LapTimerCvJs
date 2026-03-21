import type { CarState, ColorConfig } from './types';
import type { HsvRange } from './hsv-helper';
import { COLOR_CONFIGS } from './config';
import { destroyCar } from './car';
import { blockedEntries, addBlockedEntry, clearAllBlockedEntries } from './blocked-ranges';

const STORAGE_KEY = 'lapTimerProfiles';
const SELECTED_PROFILE_KEY = 'lapTimerSelectedProfile';

/** Save the currently selected profile name to local storage. */
export function saveSelectedProfile(name: string): void {
  localStorage.setItem(SELECTED_PROFILE_KEY, name);
}

/** Load the previously selected profile name, falling back to 'Demo'. */
export function loadSelectedProfile(): string {
  return localStorage.getItem(SELECTED_PROFILE_KEY) || 'Demo';
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
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Persist the profiles map to localStorage. */
function persistProfiles(profiles: Record<string, Profile>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

/** Save the current colour configs, car assignments, and blocked ranges as a named profile. */
export function saveCurrentProfile(name: string, cars: CarState[]): void {
  const profiles = loadProfiles();
  const colors: Record<string, ColorConfig> = {};
  for (const [key, cfg] of Object.entries(COLOR_CONFIGS)) {
    colors[key] = { ...cfg };
  }
  profiles[name] = {
    colors,
    carAssignments: cars.map(c => c.configKey),
    blockedRanges: blockedEntries.map(e => ({ ...e.range })),
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
  blockedListEl: HTMLElement,
): string[] | null {
  const profiles = loadProfiles();
  const profile = profiles[profileName];
  if (!profile) return null;

  // Replace COLOR_CONFIGS with the profile's colours
  for (const key of Object.keys(COLOR_CONFIGS)) delete COLOR_CONFIGS[key];
  for (const [key, cfg] of Object.entries(profile.colors)) {
    COLOR_CONFIGS[key] = { ...cfg };
  }

  // Restore blocked HSV ranges (only when the profile includes the field)
  if (profile.blockedRanges !== undefined) {
    clearAllBlockedEntries(blockedListEl);
    for (const range of profile.blockedRanges) {
      addBlockedEntry(range, canvas, blockedListEl);
    }
  }

  return profile.carAssignments.filter(k => COLOR_CONFIGS[k]);
}

/** Remove a colour from COLOR_CONFIGS and destroy its car if one exists. */
export function removeColour(
  key: string,
  cars: CarState[],
  listEl: HTMLElement,
  onToggle: (key: string, enabled: boolean) => void,
): void {
  if (Object.keys(COLOR_CONFIGS).length <= 1) return;

  delete COLOR_CONFIGS[key];

  const idx = cars.findIndex(c => c.configKey === key);
  if (idx >= 0) {
    destroyCar(cars[idx]);
    cars.splice(idx, 1);
  }

  renderColoursList(listEl, cars, onToggle);
}

/** Render the available colours list with enabled checkboxes and delete buttons. */
export function renderColoursList(
  listEl: HTMLElement,
  cars: CarState[],
  onToggle: (key: string, enabled: boolean) => void,
): void {
  listEl.innerHTML = '';

  for (const [key, cfg] of Object.entries(COLOR_CONFIGS)) {
    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-2 mb-1';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input flex-shrink-0';
    checkbox.checked = cars.some(c => c.configKey === key);
    checkbox.title = 'Enable / disable car';
    checkbox.addEventListener('change', () => {
      onToggle(key, checkbox.checked);
    });

    const swatch = document.createElement('span');
    swatch.className = 'flex-shrink-0 rounded border';
    swatch.style.cssText = 'width:100px;height:20px;display:inline-block';
    swatch.style.backgroundColor = cfg.badgeColor;

    const label = document.createElement('span');
    label.className = 'small flex-grow-1';
    label.textContent = cfg.label;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-sm btn-outline-danger py-0 px-1 flex-shrink-0';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove colour';
    removeBtn.addEventListener('click', () => removeColour(key, cars, listEl, onToggle));

    row.append(checkbox, swatch, label, removeBtn);
    listEl.appendChild(row);
  }
}

/** Populate the profile dropdown with names of all saved profiles. */
export function populateProfileDropdown(selectEl: HTMLSelectElement): void {
  const profiles = loadProfiles();
  const current = selectEl.value;
  selectEl.innerHTML = '';
  for (const name of Object.keys(profiles)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    selectEl.appendChild(opt);
  }
  if (current && profiles[current]) selectEl.value = current;
}

/**
 * Create the Demo profile from the current state if it does not already
 * exist, then apply it. Returns the car assignment keys if loaded, or null
 * when a new Demo was created.
 */
export function ensureDefaultProfile(
  cars: CarState[],
  canvas: HTMLCanvasElement,
  blockedListEl: HTMLElement,
): string[] | null {
  const profiles = loadProfiles();
  if (!profiles['Demo']) {
    saveCurrentProfile('Demo', cars);
    return null;
  }
  return applyProfile('Demo', canvas, blockedListEl);
}
