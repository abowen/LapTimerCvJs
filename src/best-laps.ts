import { STORAGE_KEY_BEST_LAPS } from './config';

const TOP_OVERALL_LAPS_COUNT   = 10;
const TOP_PER_DRIVER_LAPS_COUNT = 5;

const RANK_COLUMN_MIN_WIDTH    = '24px';
const DRIVER_COLUMN_MIN_WIDTH  = '90px';

/** The currently active profile name — lap records are tagged with this. */
let activeProfileName = '';

/** Set the active profile name used when recording and filtering laps. */
export function setActiveProfile(profileName: string): void {
  activeProfileName = profileName;
}

/** A single recorded lap. */
export interface LapRecord {
  /** Driver name (typically the colour label). */
  driver: string;
  /** Lap duration in milliseconds. */
  lapTimeMs: number;
  /** Unix timestamp (ms) when the lap was recorded. */
  timestamp: number;
  /** Profile name the lap was recorded under. */
  profile?: string;
}

/** Load all lap records from localStorage. */
function loadAllLapRecords(): LapRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BEST_LAPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Load lap records filtered to the currently active profile. */
export function loadLapRecords(): LapRecord[] {
  return loadAllLapRecords().filter(
    lapRecord => lapRecord.profile === activeProfileName,
  );
}

/** Persist lap records to localStorage. */
function persistLapRecords(records: LapRecord[]): void {
  localStorage.setItem(STORAGE_KEY_BEST_LAPS, JSON.stringify(records));
}

/** Optional callback invoked after a lap is recorded. */
let onRecordCallback: (() => void) | null = null;

/** Register a callback that fires whenever a lap is recorded. */
export function onLapRecorded(callback: () => void): void {
  onRecordCallback = callback;
}

/** Record a new lap under the currently active profile. */
export function recordLap(driver: string, lapTimeMs: number): void {
  const records = loadAllLapRecords();
  records.push({ driver, lapTimeMs, timestamp: Date.now(), profile: activeProfileName });
  persistLapRecords(records);
  onRecordCallback?.();
}

/** Clear all lap records for the currently active profile. */
export function clearAllLapRecords(): void {
  const records = loadAllLapRecords().filter(
    lapRecord => lapRecord.profile !== activeProfileName,
  );
  persistLapRecords(records);
}

/** Clear lap records for a specific driver within the currently active profile. */
export function clearDriverLapRecords(driver: string): void {
  const records = loadAllLapRecords().filter(
    lapRecord => !(lapRecord.profile === activeProfileName && lapRecord.driver === driver),
  );
  persistLapRecords(records);
}

/** Format milliseconds as ss.cc (seconds and centiseconds). */
function formatLapTime(ms: number): string {
  const clampedMs    = Math.max(0, ms);
  const seconds      = Math.floor(clampedMs / 1000);
  const centiseconds = Math.floor((clampedMs % 1000) / 10);
  return `${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

/** Format a Unix timestamp as a short human-readable date/time string. */
function formatTimestamp(unixMs: number): string {
  const date = new Date(unixMs);
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Render the top overall fastest laps panel. */
export function renderOverallBestLaps(listElement: HTMLElement): void {
  const records = loadLapRecords()
    .sort((a, b) => a.lapTimeMs - b.lapTimeMs)
    .slice(0, TOP_OVERALL_LAPS_COUNT);

  listElement.innerHTML = '';

  if (records.length === 0) {
    listElement.innerHTML = '<p class="text-muted small mb-0 text-center">No laps recorded yet</p>';
    return;
  }

  for (let i = 0; i < records.length; i++) {
    const lapRecord = records[i];
    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-2 mb-1 small';

    const rankElement = document.createElement('span');
    rankElement.className = 'text-muted';
    rankElement.style.minWidth = RANK_COLUMN_MIN_WIDTH;
    rankElement.textContent = `${i + 1}.`;

    const driverElement = document.createElement('span');
    driverElement.className = 'fw-semibold';
    driverElement.style.minWidth = DRIVER_COLUMN_MIN_WIDTH;
    driverElement.textContent = lapRecord.driver;

    const timeElement = document.createElement('span');
    timeElement.className = 'font-monospace flex-grow-1';
    timeElement.textContent = formatLapTime(lapRecord.lapTimeMs);

    const timestampElement = document.createElement('span');
    timestampElement.className = 'text-muted';
    timestampElement.textContent = formatTimestamp(lapRecord.timestamp);

    row.append(rankElement, driverElement, timeElement, timestampElement);
    listElement.appendChild(row);
  }
}

/** Render the top fastest laps per driver panel. */
export function renderPerDriverBestLaps(
  listElement: HTMLElement,
  onClear: (driver: string) => void,
): void {
  const records = loadLapRecords();

  // Group by driver
  const lapsByDriver = new Map<string, LapRecord[]>();
  for (const lapRecord of records) {
    if (!lapsByDriver.has(lapRecord.driver)) lapsByDriver.set(lapRecord.driver, []);
    lapsByDriver.get(lapRecord.driver)!.push(lapRecord);
  }

  listElement.innerHTML = '';

  if (lapsByDriver.size === 0) {
    listElement.innerHTML = '<p class="text-muted small mb-0 text-center">No laps recorded yet</p>';
    return;
  }

  const sortedDriverNames = [...lapsByDriver.keys()].sort();

  for (const driverName of sortedDriverNames) {
    const driverLaps = lapsByDriver.get(driverName)!
      .sort((a, b) => a.lapTimeMs - b.lapTimeMs)
      .slice(0, TOP_PER_DRIVER_LAPS_COUNT);

    const header = document.createElement('div');
    header.className = 'd-flex align-items-center gap-2 mb-1';

    const nameElement = document.createElement('span');
    nameElement.className = 'small fw-semibold flex-grow-1';
    nameElement.textContent = driverName;

    const clearButton = document.createElement('button');
    clearButton.className = 'btn btn-sm btn-outline-danger py-0 px-1';
    clearButton.textContent = 'Clear';
    clearButton.addEventListener('click', () => onClear(driverName));

    header.append(nameElement, clearButton);
    listElement.appendChild(header);

    for (let i = 0; i < driverLaps.length; i++) {
      const lapRecord = driverLaps[i];
      const row = document.createElement('div');
      row.className = 'd-flex align-items-center gap-2 mb-1 small ps-2';

      const rankElement = document.createElement('span');
      rankElement.className = 'text-muted';
      rankElement.style.minWidth = RANK_COLUMN_MIN_WIDTH;
      rankElement.textContent = `${i + 1}.`;

      const timeElement = document.createElement('span');
      timeElement.className = 'font-monospace flex-grow-1';
      timeElement.textContent = formatLapTime(lapRecord.lapTimeMs);

      const timestampElement = document.createElement('span');
      timestampElement.className = 'text-muted';
      timestampElement.textContent = formatTimestamp(lapRecord.timestamp);

      row.append(rankElement, timeElement, timestampElement);
      listElement.appendChild(row);
    }
  }
}
