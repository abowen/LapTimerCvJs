/** Format milliseconds as a SS.mmm stopwatch string. */
export function formatTime(ms: number): string {
  const clampedMs = Math.max(0, ms);
  const seconds   = Math.floor(clampedMs / 1000);
  const millis    = Math.floor(clampedMs % 1000);
  return `${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/** Format milliseconds as ss.cc (seconds and centiseconds). */
export function formatLapTime(ms: number): string {
  const clampedMs    = Math.max(0, ms);
  const seconds      = Math.floor(clampedMs / 1000);
  const centiseconds = Math.floor((clampedMs % 1000) / 10);
  return `${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

/** Format a Unix timestamp as a short human-readable date/time string. */
export function formatTimestamp(unixMs: number): string {
  const date = new Date(unixMs);
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
