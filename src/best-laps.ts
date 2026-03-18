const STORAGE_KEY = 'lapTimerBestLaps';

/** A single recorded lap. */
export interface LapRecord {
  driver: string;
  lapTimeMs: number;
  timestamp: number;
}

/** Load all lap records from localStorage. */
export function loadLapRecords(): LapRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist lap records to localStorage. */
function persistLapRecords(records: LapRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/** Optional callback invoked after a lap is recorded. */
let onRecordCallback: (() => void) | null = null;

/** Register a callback that fires whenever a lap is recorded. */
export function onLapRecorded(cb: () => void): void {
  onRecordCallback = cb;
}

/** Record a new lap. */
export function recordLap(driver: string, lapTimeMs: number): void {
  const records = loadLapRecords();
  records.push({ driver, lapTimeMs, timestamp: Date.now() });
  persistLapRecords(records);
  onRecordCallback?.();
}

/** Clear all lap records. */
export function clearAllLapRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Clear lap records for a specific driver. */
export function clearDriverLapRecords(driver: string): void {
  const records = loadLapRecords().filter(r => r.driver !== driver);
  persistLapRecords(records);
}

/** Format milliseconds as ss.mm */
function formatLapTime(ms: number): string {
  const t = Math.max(0, ms);
  const secs = Math.floor(t / 1000);
  const centis = Math.floor((t % 1000) / 10);
  return `${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

/** Format a timestamp as a short date/time string. */
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Render the top 10 overall fastest laps panel. */
export function renderOverallBestLaps(listEl: HTMLElement): void {
  const records = loadLapRecords()
    .sort((a, b) => a.lapTimeMs - b.lapTimeMs)
    .slice(0, 10);

  listEl.innerHTML = '';

  if (records.length === 0) {
    listEl.innerHTML = '<p class="text-muted small mb-0 text-center">No laps recorded yet</p>';
    return;
  }

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-2 mb-1 small';

    const rank = document.createElement('span');
    rank.className = 'text-muted';
    rank.style.minWidth = '24px';
    rank.textContent = `${i + 1}.`;

    const driver = document.createElement('span');
    driver.className = 'fw-semibold';
    driver.style.minWidth = '90px';
    driver.textContent = rec.driver;

    const time = document.createElement('span');
    time.className = 'font-monospace flex-grow-1';
    time.textContent = formatLapTime(rec.lapTimeMs);

    const ts = document.createElement('span');
    ts.className = 'text-muted';
    ts.textContent = formatTimestamp(rec.timestamp);

    row.append(rank, driver, time, ts);
    listEl.appendChild(row);
  }
}

/** Render the top 5 fastest laps per driver panel. */
export function renderPerDriverBestLaps(
  listEl: HTMLElement,
  onClear: (driver: string) => void,
): void {
  const records = loadLapRecords();

  // Group by driver
  const byDriver = new Map<string, LapRecord[]>();
  for (const rec of records) {
    if (!byDriver.has(rec.driver)) byDriver.set(rec.driver, []);
    byDriver.get(rec.driver)!.push(rec);
  }

  listEl.innerHTML = '';

  if (byDriver.size === 0) {
    listEl.innerHTML = '<p class="text-muted small mb-0 text-center">No laps recorded yet</p>';
    return;
  }

  // Sort drivers alphabetically
  const drivers = [...byDriver.keys()].sort();

  for (const driver of drivers) {
    const laps = byDriver.get(driver)!
      .sort((a, b) => a.lapTimeMs - b.lapTimeMs)
      .slice(0, 5);

    const header = document.createElement('div');
    header.className = 'd-flex align-items-center gap-2 mb-1';

    const name = document.createElement('span');
    name.className = 'small fw-semibold flex-grow-1';
    name.textContent = driver;

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-sm btn-outline-danger py-0 px-1';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => onClear(driver));

    header.append(name, clearBtn);
    listEl.appendChild(header);

    for (let i = 0; i < laps.length; i++) {
      const rec = laps[i];
      const row = document.createElement('div');
      row.className = 'd-flex align-items-center gap-2 mb-1 small ps-2';

      const rank = document.createElement('span');
      rank.className = 'text-muted';
      rank.style.minWidth = '24px';
      rank.textContent = `${i + 1}.`;

      const time = document.createElement('span');
      time.className = 'font-monospace flex-grow-1';
      time.textContent = formatLapTime(rec.lapTimeMs);

      const ts = document.createElement('span');
      ts.className = 'text-muted';
      ts.textContent = formatTimestamp(rec.timestamp);

      row.append(rank, time, ts);
      listEl.appendChild(row);
    }
  }
}
