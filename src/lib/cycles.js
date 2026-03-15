/**
 * Cycle grouping and day estimation.
 * Cycles are anchored by explicit period start dates.
 * Fallback: 35-day window clustering when no period starts are recorded.
 */

/**
 * Group entries by menstrual cycle.
 * @param {Array<{ id, timestamp, severity, cycleDay }>} entries - From local index
 * @param {string[]} periodStarts - ISO date strings sorted chronologically
 * @returns {Array<{ startDate: string, entries: Array }>} Cycles sorted newest-first
 */
export function groupByCycle(entries, periodStarts) {
  if (!entries.length) return [];

  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  const starts = [...periodStarts].sort();

  if (starts.length === 0) {
    return clusterByWindow(sorted, 35);
  }

  const cycles = new Map();

  for (const entry of sorted) {
    const entryDate = new Date(entry.timestamp);
    let assignedStart = null;

    // Find most recent periodStart <= entry timestamp
    for (let i = starts.length - 1; i >= 0; i--) {
      if (new Date(starts[i]) <= entryDate) {
        assignedStart = starts[i];
        break;
      }
    }

    if (!assignedStart) {
      // Entry is before any recorded period start — assign to earliest
      assignedStart = starts[0];
    }

    if (!cycles.has(assignedStart)) {
      cycles.set(assignedStart, []);
    }
    cycles.get(assignedStart).push(entry);
  }

  return Array.from(cycles.entries())
    .map(([startDate, entries]) => ({ startDate, entries }))
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
}

/**
 * Fallback: cluster entries into cycles using a max gap window.
 */
function clusterByWindow(sortedEntries, maxDays) {
  if (!sortedEntries.length) return [];

  const clusters = [];
  let current = {
    startDate: sortedEntries[0].timestamp.split("T")[0],
    entries: [sortedEntries[0]],
  };

  for (let i = 1; i < sortedEntries.length; i++) {
    const prev = new Date(sortedEntries[i - 1].timestamp);
    const curr = new Date(sortedEntries[i].timestamp);
    const gapDays = (curr - prev) / (1000 * 60 * 60 * 24);

    if (gapDays > maxDays) {
      clusters.push(current);
      current = {
        startDate: sortedEntries[i].timestamp.split("T")[0],
        entries: [],
      };
    }
    current.entries.push(sortedEntries[i]);
  }
  clusters.push(current);

  return clusters.sort(
    (a, b) => new Date(b.startDate) - new Date(a.startDate)
  );
}

/**
 * Estimate current cycle day from period start dates.
 * @param {string[]} periodStarts - ISO date strings
 * @returns {number | null} Cycle day (1-based), or null if no starts recorded
 */
export function estimateCycleDay(periodStarts) {
  if (!periodStarts.length) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...periodStarts].sort();
  let mostRecent = null;

  for (let i = sorted.length - 1; i >= 0; i--) {
    if (new Date(sorted[i]) <= today) {
      mostRecent = sorted[i];
      break;
    }
  }

  if (!mostRecent) return null;

  const diffMs = today - new Date(mostRecent);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Pair each period start with the earliest end that comes after it
 * (and before the next start).
 * @param {string[]} periodStarts - ISO date strings sorted
 * @param {string[]} periodEnds - ISO date strings sorted
 * @returns {Array<{ start: string, end: string|null }>}
 */
function pairStartsAndEnds(periodStarts, periodEnds) {
  const starts = [...periodStarts].sort();
  const ends = [...periodEnds].sort();
  const pairs = [];

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const nextStart = starts[i + 1] || null;
    let matchedEnd = null;

    for (const end of ends) {
      if (end >= start && (!nextStart || end < nextStart)) {
        matchedEnd = end;
        break;
      }
    }

    pairs.push({ start, end: matchedEnd });
  }

  return pairs;
}

/**
 * Is a given date within any period start-end range?
 * If a start has no matching end, treat period as ongoing.
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @param {string[]} periodStarts
 * @param {string[]} periodEnds
 * @returns {boolean}
 */
export function isPeriodDay(dateStr, periodStarts, periodEnds) {
  const pairs = pairStartsAndEnds(periodStarts, periodEnds);

  for (const { start, end } of pairs) {
    if (dateStr >= start) {
      if (end) {
        if (dateStr <= end) return true;
      } else {
        // No end — period is ongoing, only match if this is the last pair
        if (start === pairs[pairs.length - 1].start) return true;
      }
    }
  }

  return false;
}

/**
 * Current period status: is there an active (unended) period?
 * @param {string[]} periodStarts
 * @param {string[]} periodEnds
 * @returns {{ active: boolean, startDate: string|null }}
 */
export function getCurrentPeriodStatus(periodStarts, periodEnds) {
  if (!periodStarts.length) return { active: false, startDate: null };

  const pairs = pairStartsAndEnds(periodStarts, periodEnds);
  const last = pairs[pairs.length - 1];

  if (!last.end) {
    return { active: true, startDate: last.start };
  }

  return { active: false, startDate: null };
}

/**
 * Average period length (days) from matched start/end pairs.
 * @param {string[]} periodStarts
 * @param {string[]} periodEnds
 * @returns {number|null} Average days, or null if no completed periods
 */
export function getAveragePeriodLength(periodStarts, periodEnds) {
  const pairs = pairStartsAndEnds(periodStarts, periodEnds);
  const completed = pairs.filter((p) => p.end);

  if (!completed.length) return null;

  let totalDays = 0;
  for (const { start, end } of completed) {
    const diffMs = new Date(end) - new Date(start);
    totalDays += Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
  }

  return Math.round(totalDays / completed.length);
}

/**
 * Average cycle length from period start dates.
 * @param {string[]} periodStarts
 * @returns {number | null} Average days between starts, or null if < 2 starts
 */
export function getAverageCycleLength(periodStarts) {
  if (periodStarts.length < 2) return null;

  const sorted = [...periodStarts]
    .sort()
    .map((d) => new Date(d).getTime());

  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i] - sorted[i - 1];
  }

  const avgMs = totalGap / (sorted.length - 1);
  return Math.round(avgMs / (1000 * 60 * 60 * 24));
}
