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
