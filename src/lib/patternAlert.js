/**
 * Local pattern detection — pure heuristic, no LLM.
 * Runs entirely on local entry index data.
 * Used for the dashboard flag and end-of-journal alert.
 */

import { groupByCycle } from './cycles';

/**
 * Detect a clinically significant pattern across cycles.
 * Returns a pattern object if found, null if not enough data.
 * @param {Array} entries - From local entry index
 * @param {string[]} periodStarts
 * @returns {{ type, label, message, cyclesAffected } | null}
 */
export function detectPattern(entries, periodStarts) {
  const cycles = groupByCycle(entries, periodStarts);
  if (cycles.length < 2) return null;

  const cyclesWithSevereDysmenorrhea = cycles.filter(c =>
    c.entries.some(e => e.severity >= 7 && e.cycleDay >= 1 && e.cycleDay <= 3)
  );

  const cyclesWithMidCyclePain = cycles.filter(c =>
    c.entries.some(e => e.cycleDay != null && e.cycleDay >= 8 && e.severity >= 4)
  );

  const cyclesWithFunctionalImpact = cycles.filter(c =>
    c.entries.some(e => e.severity >= 7)
  );

  // Extended pain: severity >= 6 entries spanning 5+ cycle days within a cycle
  const cyclesWithExtendedPain = cycles.filter(c => {
    const severeDays = c.entries
      .filter(e => e.severity >= 6 && e.cycleDay != null)
      .map(e => e.cycleDay)
      .sort((a, b) => a - b);
    return severeDays.length >= 2 && (severeDays[severeDays.length - 1] - severeDays[0]) >= 4;
  });

  const hasDysmenorrhea = cyclesWithSevereDysmenorrhea.length >= 2;
  const hasMidCyclePain = cyclesWithMidCyclePain.length >= 2;
  const hasFunctionalImpact = cyclesWithFunctionalImpact.length >= 2;
  const hasExtendedPain = cyclesWithExtendedPain.length >= 2;

  if (hasDysmenorrhea && hasMidCyclePain && hasFunctionalImpact) {
    return {
      type: 'constellation',
      label: 'Pattern flagged',
      message: `Severe pain on days 1–3, mid-cycle pelvic pain, and functional disruption across ${cycles.length} cycles. This combination is clinically significant and worth discussing with a doctor.`,
      cyclesAffected: cycles.length,
    };
  }

  if (hasDysmenorrhea && hasMidCyclePain) {
    return {
      type: 'dysmenorrhea_midcycle',
      label: 'Pattern flagged',
      message: `Severe period pain and mid-cycle pelvic pain detected across ${cycles.length} cycles. This pattern is worth mentioning to your doctor.`,
      cyclesAffected: cycles.length,
    };
  }

  if (hasDysmenorrhea) {
    return {
      type: 'dysmenorrhea',
      label: 'Pattern flagged',
      message: `Severe period pain (7+/10) on days 1–3 detected across ${cyclesWithSevereDysmenorrhea.length} cycles. This pattern is worth discussing with a doctor.`,
      cyclesAffected: cyclesWithSevereDysmenorrhea.length,
    };
  }

  if (hasMidCyclePain) {
    return {
      type: 'mid_cycle',
      label: 'Pattern flagged',
      message: `Mid-cycle pelvic pain has appeared in ${cyclesWithMidCyclePain.length} cycles. Recurring intermenstrual pain is worth mentioning to a doctor.`,
      cyclesAffected: cyclesWithMidCyclePain.length,
    };
  }

  if (hasExtendedPain) {
    return {
      type: 'extended_pain',
      label: 'Pattern flagged',
      message: `Pain lasting 5 or more days has appeared in ${cyclesWithExtendedPain.length} cycles. Prolonged cycle pain can be associated with adenomyosis and is worth discussing with a doctor.`,
      cyclesAffected: cyclesWithExtendedPain.length,
    };
  }

  return null;
}

/**
 * Check if a just-saved entry contributes to a recurring pattern.
 * Used to show a contextual nudge at the end of the journal flow.
 * @param {object} entry - The entry just saved { severity, cycleDay }
 * @param {Array} allEntries - Full local entry index (including the new entry)
 * @param {string[]} periodStarts
 * @returns {string | null} Plain language alert message, or null
 */
export function detectJournalAlert(entry, allEntries, periodStarts) {
  const cycles = groupByCycle(allEntries, periodStarts);
  if (cycles.length < 2 || !entry.cycleDay) return null;

  const isSevereEarlyDay = entry.severity >= 7 && entry.cycleDay <= 3;
  const isMidCycle = entry.cycleDay >= 8 && entry.severity >= 4;

  if (isSevereEarlyDay) {
    // Previous cycles (not current) with same pattern
    const previousCycles = cycles.slice(1);
    const matching = previousCycles.filter(c =>
      c.entries.some(e => e.severity >= 7 && e.cycleDay <= 3)
    );

    if (matching.length >= 1) {
      const total = matching.length + 1;
      const ordinal = total === 2 ? '2nd' : total === 3 ? '3rd' : `${total}th`;
      return `This is the ${ordinal} cycle in a row with severe pain on day ${entry.cycleDay}. This pattern is worth mentioning to a doctor.`;
    }
  }

  if (isMidCycle) {
    const previousCycles = cycles.slice(1);
    const matching = previousCycles.filter(c =>
      c.entries.some(e => e.cycleDay != null && e.cycleDay >= 8 && e.severity >= 4)
    );

    if (matching.length >= 1) {
      return `Mid-cycle pain has now appeared in ${matching.length + 1} cycles. This recurring pattern is worth discussing with a doctor.`;
    }
  }

  // Extended pain: current cycle spans 5+ days of moderate-severe pain
  if (entry.severity >= 6) {
    const currentCycle = cycles[0];
    const severeDays = currentCycle.entries
      .filter(e => e.severity >= 6 && e.cycleDay != null)
      .map(e => e.cycleDay)
      .sort((a, b) => a - b);
    if (severeDays.length >= 2 && (severeDays[severeDays.length - 1] - severeDays[0]) >= 4) {
      const previousCycles = cycles.slice(1);
      const matching = previousCycles.filter(c => {
        const days = c.entries.filter(e => e.severity >= 6 && e.cycleDay != null).map(e => e.cycleDay).sort((a, b) => a - b);
        return days.length >= 2 && (days[days.length - 1] - days[0]) >= 4;
      });
      if (matching.length >= 1) {
        return `Pain has now spanned 5+ days in ${matching.length + 1} cycles. This pattern of prolonged pain is worth discussing with a doctor.`;
      }
    }
  }

  // Fallback: any severe pain (7+) across 2+ cycles, regardless of cycle day
  if (entry.severity >= 7) {
    const previousCycles = cycles.slice(1);
    const matching = previousCycles.filter(c =>
      c.entries.some(e => e.severity >= 7)
    );

    if (matching.length >= 1) {
      const total = matching.length + 1;
      return `Severe pain has now been logged in ${total} cycles. This recurring pattern is worth discussing with a doctor.`;
    }
  }

  return null;
}
