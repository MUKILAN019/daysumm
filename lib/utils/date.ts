/**
 * Shared date and timezone helpers for consistent todayKey, startOfDayISO, and cutoff handling.
 */

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Returns a YYYY-MM-DD date key formatted for a specific timezone (defaults to device timezone).
 */
export function getDateKey(date: Date = new Date(), timeZone?: string): string {
  const tz = timeZone || getUserTimezone();
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = dtf.formatToParts(date);
  let year = '';
  let month = '';
  let day = '';

  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'day') day = part.value;
  }

  return `${year}-${month}-${day}`;
}

/**
 * Returns ISO string for the start of the day (00:00:00.000) for a given date and timezone.
 * Defaults to device local midnight if timezone is not provided or matches device timezone.
 */
export function getStartOfDayISO(date: Date = new Date(), timeZone?: string): string {
  const tz = timeZone || getUserTimezone();
  const dateKey = getDateKey(date, tz);

  // Construct start of day timestamp
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const localMidnight = new Date(year, month, day, 0, 0, 0, 0);
  return localMidnight.toISOString();
}

/**
 * Returns the YYYY-MM-DD date key for `maxDaysBack` days prior to today in the given timezone.
 */
export function getCutoffDateKey(maxDaysBack: number, timeZone?: string): string {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - maxDaysBack * 24 * 60 * 60 * 1000);
  return getDateKey(cutoffDate, timeZone);
}
