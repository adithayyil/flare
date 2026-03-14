/**
 * Severity → color/label mapping.
 * Severity palette: green (mild) / amber (moderate) / red (severe) / deep red (emergency) / gray (none).
 */

const LEVELS = [
  { min: 1, max: 3, label: "mild", color: "#22c55e", tw: "bg-severity-mild" },
  { min: 4, max: 6, label: "moderate", color: "#f59e0b", tw: "bg-severity-moderate" },
  { min: 7, max: 9, label: "severe", color: "#ef4444", tw: "bg-severity-severe" },
  { min: 10, max: 10, label: "emergency", color: "#b91c1c", tw: "bg-severity-emergency" },
];

const NONE = { label: "none", color: "#d1d5db", tw: "bg-severity-none" };

function getLevel(n) {
  if (n == null || n === 0) return NONE;
  return LEVELS.find((l) => n >= l.min && n <= l.max) || NONE;
}

export function severityColor(n) {
  return getLevel(n).color;
}

export function severityTwClass(n) {
  return getLevel(n).tw;
}

export function severityLabel(n) {
  return getLevel(n).label;
}

/**
 * The 4 severity options for the SeverityPicker component.
 * Each maps a user-friendly label to a numeric value.
 */
export const SEVERITY_OPTIONS = [
  { label: "Mild", value: 3, color: "#22c55e", tw: "bg-severity-mild" },
  { label: "Moderate", value: 5, color: "#f59e0b", tw: "bg-severity-moderate" },
  { label: "Severe", value: 8, color: "#ef4444", tw: "bg-severity-severe" },
  { label: "Emergency", value: 10, color: "#b91c1c", tw: "bg-severity-emergency" },
];

/**
 * Build the text blob that gets uploaded to Moorcheh.
 * User's raw words with date/severity/cycleDay context prepended.
 */
export function buildMoorchehText(rawText, severity, cycleDay, followUp) {
  const date = new Date().toISOString().split("T")[0];
  const cyclePart = cycleDay != null ? ` (cycle day ${cycleDay})` : "";
  let text = `On ${date}${cyclePart}, severity ${severity}/10: ${rawText}`;
  if (followUp) {
    text += ` [Follow-up — ${followUp.question} ${followUp.response}]`;
  }
  return text;
}
