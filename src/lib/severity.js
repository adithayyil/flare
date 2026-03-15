/**
 * Severity → color/label mapping.
 * Coral spectrum: warm peach (low) → coral (high)
 */

const LEVELS = [
  { min: 1, max: 3, label: "mild", color: "#FBC4AB" },
  { min: 4, max: 6, label: "moderate", color: "#F4978E" },
  { min: 7, max: 9, label: "severe", color: "#F08080" },
  { min: 10, max: 10, label: "emergency", color: "#D45D5D" },
];

const NONE = { label: "none", color: "#F0E0E0" };

function getLevel(n) {
  if (n == null || n === 0) return NONE;
  return LEVELS.find((l) => n >= l.min && n <= l.max) || NONE;
}

export function severityColor(n) {
  return getLevel(n).color;
}

export function severityLabel(n) {
  return getLevel(n).label;
}

/**
 * Mankoski Pain Scale (0-10)
 */
export const MANKOSKI_SCALE = [
  { value: 0, label: "Pain free" },
  { value: 1, label: "Very minor annoyance" },
  { value: 2, label: "Minor annoyance, occasional twinges" },
  { value: 3, label: "Annoying, distracting" },
  { value: 4, label: "Can be ignored if focused" },
  { value: 5, label: "Can't ignore for more than 30 min" },
  { value: 6, label: "Can't ignore, but can work" },
  { value: 7, label: "Hard to concentrate, affects sleep" },
  { value: 8, label: "Physical activity severely limited" },
  { value: 9, label: "Unable to speak, crying out" },
  { value: 10, label: "Unconscious" },
];

export const SEVERITY_OPTIONS = MANKOSKI_SCALE;
