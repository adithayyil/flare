/**
 * Seed data for development/demo.
 * Four variants covering different clinical presentations:
 *   'none'     — no significant pattern (mild, occasional pain)
 *   'mild'     — borderline dysmenorrhea, no functional impact
 *   'moderate' — dysmenorrhea pattern across 2 cycles, no constellation
 *   'severe'   — full constellation: dysmenorrhea + mid-cycle + functional impact (default)
 */
import { appendEntryIndex, addPeriodStart, addPeriodEnd, getEntryIndex, clearAllData } from "./storage";
import { uploadEntry } from "./moorcheh";

// ─── VARIANT: none ───────────────────────────────────────────────────────────
// 2 cycles, severity 1–4, no functional disruption, no flags expected

const NONE_PERIOD_STARTS = ["2026-01-12", "2026-02-10"];
const NONE_PERIOD_ENDS   = ["2026-01-15", "2026-02-13"];

const NONE_ENTRIES = [
  {
    id: "e_none_01",
    timestamp: "2026-01-12T09:00:00.000Z",
    severity: 3, cycleDay: 1, isPeriodDay: true,
    text: "mild cramps this morning, manageable. took ibuprofen and felt fine by noon",
    followUp: null,
  },
  {
    id: "e_none_02",
    timestamp: "2026-01-13T14:00:00.000Z",
    severity: 2, cycleDay: 2, isPeriodDay: true,
    text: "light cramping, nothing unusual. went to work no problem",
    followUp: null,
  },
  {
    id: "e_none_03",
    timestamp: "2026-01-20T18:00:00.000Z",
    severity: 1, cycleDay: 9, isPeriodDay: false,
    text: "slight bloating today but no real pain. probably just diet",
    followUp: null,
  },
  {
    id: "e_none_04",
    timestamp: "2026-02-10T08:30:00.000Z",
    severity: 3, cycleDay: 1, isPeriodDay: true,
    text: "period started, mild cramps like usual. heating pad helped, carried on with my day",
    followUp: null,
  },
  {
    id: "e_none_05",
    timestamp: "2026-02-11T11:00:00.000Z",
    severity: 2, cycleDay: 2, isPeriodDay: true,
    text: "still a little crampy but not bad. went to the gym in the evening",
    followUp: null,
  },
  {
    id: "e_none_06",
    timestamp: "2026-02-18T20:00:00.000Z",
    severity: 2, cycleDay: 9, isPeriodDay: false,
    text: "mild pelvic ache mid-afternoon, went away on its own within an hour",
    followUp: null,
  },
];

// ─── VARIANT: mild ───────────────────────────────────────────────────────────
// 2 cycles, severity 4–6, some period pain but below the 7+ dysmenorrhea threshold
// No pattern flags expected — borderline case

const MILD_PERIOD_STARTS = ["2026-01-10", "2026-02-08"];
const MILD_PERIOD_ENDS   = ["2026-01-14", "2026-02-12"];

const MILD_ENTRIES = [
  {
    id: "e_mild_01",
    timestamp: "2026-01-10T08:00:00.000Z",
    severity: 5, cycleDay: 1, isPeriodDay: true,
    text: "cramps today, more than usual. took ibuprofen, helped a bit. still went to class",
    followUp: { question: "did this affect your day?", answer: "managed fine, just uncomfortable" },
  },
  {
    id: "e_mild_02",
    timestamp: "2026-01-11T13:00:00.000Z",
    severity: 6, cycleDay: 2, isPeriodDay: true,
    text: "heavier cramps than day 1, needed a second dose of ibuprofen. stayed home in the afternoon",
    followUp: { question: "did you have to change any plans?", answer: "skipped the gym but nothing major" },
  },
  {
    id: "e_mild_03",
    timestamp: "2026-01-13T10:00:00.000Z",
    severity: 3, cycleDay: 4, isPeriodDay: true,
    text: "much better today. just some lower back stiffness",
    followUp: null,
  },
  {
    id: "e_mild_04",
    timestamp: "2026-01-21T17:00:00.000Z",
    severity: 4, cycleDay: 12, isPeriodDay: false,
    text: "some pelvic pressure mid-afternoon. not painful exactly, more of a dull ache",
    followUp: null,
  },
  {
    id: "e_mild_05",
    timestamp: "2026-02-08T09:00:00.000Z",
    severity: 5, cycleDay: 1, isPeriodDay: true,
    text: "period cramps again, similar to last month. manageable with medication",
    followUp: { question: "did this affect your day?", answer: "went to work, just a bit sluggish" },
  },
  {
    id: "e_mild_06",
    timestamp: "2026-02-09T12:00:00.000Z",
    severity: 6, cycleDay: 2, isPeriodDay: true,
    text: "cramps peaking like last cycle. uncomfortable but functional",
    followUp: null,
  },
  {
    id: "e_mild_07",
    timestamp: "2026-02-11T15:00:00.000Z",
    severity: 3, cycleDay: 4, isPeriodDay: true,
    text: "settling down. mild back ache, nothing concerning",
    followUp: null,
  },
  {
    id: "e_mild_08",
    timestamp: "2026-02-20T19:00:00.000Z",
    severity: 4, cycleDay: 13, isPeriodDay: false,
    text: "slight twinge in lower left pelvis. gone within a couple of hours",
    followUp: null,
  },
];

// ─── VARIANT: moderate ───────────────────────────────────────────────────────
// 3 cycles, severity 5–8 on days 1–2, functional impact but no mid-cycle pain
// Expect: dysmenorrhea pattern flagged, no constellation

const MODERATE_PERIOD_STARTS = ["2026-01-10", "2026-02-08", "2026-03-09"];
const MODERATE_PERIOD_ENDS   = ["2026-01-14", "2026-02-12"];

const MODERATE_ENTRIES = [
  {
    id: "e_mod_01",
    timestamp: "2026-01-10T08:00:00.000Z",
    severity: 7, cycleDay: 1, isPeriodDay: true,
    text: "really bad cramps this morning. had to cancel my run and rest most of the day",
    followUp: { question: "did you have to miss anything?", answer: "cancelled plans but worked from home" },
  },
  {
    id: "e_mod_02",
    timestamp: "2026-01-11T11:00:00.000Z",
    severity: 6, cycleDay: 2, isPeriodDay: true,
    text: "still cramping but better than yesterday. made it to work, left a bit early",
    followUp: null,
  },
  {
    id: "e_mod_03",
    timestamp: "2026-01-13T14:00:00.000Z",
    severity: 3, cycleDay: 4, isPeriodDay: true,
    text: "much better. some residual fatigue but pain is gone",
    followUp: null,
  },
  {
    id: "e_mod_04",
    timestamp: "2026-01-22T17:00:00.000Z",
    severity: 3, cycleDay: 13, isPeriodDay: false,
    text: "slight pressure in lower abdomen. went away after an hour",
    followUp: null,
  },
  {
    id: "e_mod_05",
    timestamp: "2026-02-08T09:00:00.000Z",
    severity: 8, cycleDay: 1, isPeriodDay: true,
    text: "worst cramps in a while. doubled over this morning, couldn't drive",
    followUp: { question: "what did you have to miss?", answer: "called in sick, stayed home all day" },
  },
  {
    id: "e_mod_06",
    timestamp: "2026-02-09T12:00:00.000Z",
    severity: 6, cycleDay: 2, isPeriodDay: true,
    text: "still uncomfortable but managing with ibuprofen. worked from home",
    followUp: null,
  },
  {
    id: "e_mod_07",
    timestamp: "2026-02-11T15:00:00.000Z",
    severity: 4, cycleDay: 4, isPeriodDay: true,
    text: "mostly fine now. tired but back to normal activity",
    followUp: null,
  },
  {
    id: "e_mod_08",
    timestamp: "2026-02-22T19:00:00.000Z",
    severity: 3, cycleDay: 15, isPeriodDay: false,
    text: "mild bloating and some pelvic pressure. not painful",
    followUp: null,
  },
  {
    id: "e_mod_09",
    timestamp: "2026-03-09T08:00:00.000Z",
    severity: 7, cycleDay: 1, isPeriodDay: true,
    text: "third cycle with bad day-one cramps. same pattern — bad first day, then eases off",
    followUp: { question: "how did you manage today?", answer: "took the morning off, felt better by afternoon" },
  },
  {
    id: "e_mod_10",
    timestamp: "2026-03-10T12:00:00.000Z",
    severity: 5, cycleDay: 2, isPeriodDay: true,
    text: "better than yesterday. manageable with medication",
    followUp: null,
  },
  {
    id: "e_mod_11",
    timestamp: "2026-03-12T14:00:00.000Z",
    severity: 2, cycleDay: 4, isPeriodDay: true,
    text: "almost no pain today. just some light spotting",
    followUp: null,
  },
];

// ─── VARIANT: severe (original) ──────────────────────────────────────────────
// 3 cycles, severity 7–9, dysmenorrhea + mid-cycle + functional disruption
// Expect: full constellation pattern flagged

const SEVERE_PERIOD_STARTS = ["2026-01-10", "2026-02-08", "2026-03-09"];
const SEVERE_PERIOD_ENDS   = ["2026-01-15", "2026-02-13"];

const SEVERE_ENTRIES = [
  {
    id: "e_sev_01",
    timestamp: "2026-01-10T08:00:00.000Z",
    severity: 7, cycleDay: 1, isPeriodDay: true,
    text: "awful cramps started this morning, had to call in sick. heating pad barely helping",
    followUp: { question: "how did this affect your plans for today?", answer: "called in sick to work" },
  },
  {
    id: "e_sev_02",
    timestamp: "2026-01-11T14:00:00.000Z",
    severity: 8, cycleDay: 2, isPeriodDay: true,
    text: "worse than yesterday. can't get out of bed, nausea and back pain on top of cramps",
    followUp: { question: "what did you have to miss or cancel?", answer: "missed work again, second day in a row" },
  },
  {
    id: "e_sev_03",
    timestamp: "2026-01-13T10:00:00.000Z",
    severity: 4, cycleDay: 4, isPeriodDay: true,
    text: "pain easing up, manageable with ibuprofen. still some lower back ache but i can function",
    followUp: null,
  },
  {
    id: "e_sev_04",
    timestamp: "2026-01-22T18:00:00.000Z",
    severity: 5, cycleDay: 13, isPeriodDay: false,
    text: "sharp pelvic pain on the right side, not during my period. feels different from cramps",
    followUp: { question: "is this type of mid-cycle pain new for you?", answer: "happens most cycles actually" },
  },
  {
    id: "e_sev_05",
    timestamp: "2026-02-08T09:00:00.000Z",
    severity: 8, cycleDay: 1, isPeriodDay: true,
    text: "period started and the cramps are terrible. doubled over, couldn't make it to class",
    followUp: { question: "what did you have to miss or cancel?", answer: "missed morning classes" },
  },
  {
    id: "e_sev_06",
    timestamp: "2026-02-09T11:00:00.000Z",
    severity: 7, cycleDay: 2, isPeriodDay: true,
    text: "still really bad. heavy bleeding, soaked through in an hour. staying home again",
    followUp: { question: "how many days have you missed so far this cycle?", answer: "second day i've missed class" },
  },
  {
    id: "e_sev_07",
    timestamp: "2026-02-10T16:00:00.000Z",
    severity: 5, cycleDay: 3, isPeriodDay: true,
    text: "getting better but exhausted. went to afternoon class but left early",
    followUp: { question: "were you able to get through your plans today?", answer: "left class early, couldn't focus" },
  },
  {
    id: "e_sev_08",
    timestamp: "2026-02-21T20:00:00.000Z",
    severity: 6, cycleDay: 14, isPeriodDay: false,
    text: "that mid-cycle pain again, same right-sided pelvic pain as last month",
    followUp: { question: "did this disrupt anything you had planned?", answer: "had to cancel dinner plans" },
  },
  {
    id: "e_sev_09",
    timestamp: "2026-02-25T12:00:00.000Z",
    severity: 3, cycleDay: 18, isPeriodDay: false,
    text: "pain during sex last night, a dull deep ache. it's happened a few times now",
    followUp: { question: "has this been affecting your comfort or intimacy?", answer: "yeah it's starting to make me avoid it" },
  },
  {
    id: "e_sev_10",
    timestamp: "2026-03-09T07:30:00.000Z",
    severity: 9, cycleDay: 1, isPeriodDay: true,
    text: "worst period yet. woke up at 5am in pain, threw up from the intensity",
    followUp: { question: "what were you unable to do today?", answer: "couldn't do anything, stayed in bed all day" },
  },
  {
    id: "e_sev_11",
    timestamp: "2026-03-10T10:00:00.000Z",
    severity: 8, cycleDay: 2, isPeriodDay: true,
    text: "still terrible. diarrhea and bloating on top of cramps. third cycle in a row losing days to this",
    followUp: { question: "how many days have you missed across recent cycles?", answer: "at least 2 days every single cycle for months" },
  },
  {
    id: "e_sev_12",
    timestamp: "2026-03-12T15:00:00.000Z",
    severity: 5, cycleDay: 4, isPeriodDay: true,
    text: "easing off finally. back at work but struggling to concentrate, totally wiped out",
    followUp: { question: "were you able to get through your day?", answer: "got through it but barely, fatigue is brutal" },
  },
];

// ─── Variant registry ─────────────────────────────────────────────────────────

const VARIANTS = {
  none:     { periodStarts: NONE_PERIOD_STARTS,     periodEnds: NONE_PERIOD_ENDS,     entries: NONE_ENTRIES },
  mild:     { periodStarts: MILD_PERIOD_STARTS,     periodEnds: MILD_PERIOD_ENDS,     entries: MILD_ENTRIES },
  moderate: { periodStarts: MODERATE_PERIOD_STARTS, periodEnds: MODERATE_PERIOD_ENDS, entries: MODERATE_ENTRIES },
  severe:   { periodStarts: SEVERE_PERIOD_STARTS,   periodEnds: SEVERE_PERIOD_ENDS,   entries: SEVERE_ENTRIES },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMoorchehText(entry) {
  const date = new Date(entry.timestamp).toLocaleDateString("en-CA");
  const periodTag = entry.isPeriodDay ? ", period day" : "";
  const cycleDayStr = entry.cycleDay ? ` (cycle day ${entry.cycleDay}${periodTag})` : "";
  let text = `On ${date}${cycleDayStr}, severity ${entry.severity}/10: ${entry.text}`;
  if (entry.followUp?.question && entry.followUp?.answer) {
    text += ` [Follow-up: ${entry.followUp.question} ${entry.followUp.answer}]`;
  }
  return text;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Seed local storage with a named variant.
 * Clears existing data first so switching variants works cleanly.
 * @param {'none'|'mild'|'moderate'|'severe'} variant
 * @param {boolean} uploadToMoorcheh
 */
export async function seedData(variant = 'severe', uploadToMoorcheh = false) {
  const v = VARIANTS[variant];
  if (!v) throw new Error(`Unknown seed variant: ${variant}. Use none, mild, moderate, or severe.`);

  const existing = await getEntryIndex();
  if (existing.length > 0) {
    console.log(`Seed data skipped — entries already exist. Clear data first to reseed.`);
    return;
  }

  for (const date of v.periodStarts) await addPeriodStart(date);
  for (const date of v.periodEnds)   await addPeriodEnd(date);

  for (const entry of v.entries) {
    await appendEntryIndex({
      id: entry.id,
      timestamp: entry.timestamp,
      severity: entry.severity,
      cycleDay: entry.cycleDay,
      isPeriodDay: entry.isPeriodDay,
      text: entry.text,
      followUp: entry.followUp,
    });

    if (uploadToMoorcheh) {
      try {
        await uploadEntry(buildMoorchehText(entry), {
          entryId: entry.id,
          timestamp: entry.timestamp,
          severity: entry.severity,
          cycleDay: entry.cycleDay || 0,
        });
      } catch (err) {
        console.warn(`Moorcheh upload failed for ${entry.id}:`, err.message);
      }
    }
  }

  console.log(`Seeded '${variant}' variant: ${v.entries.length} entries across ${v.periodStarts.length} cycles`);
}

/**
 * Clear all data and reseed with a new variant. Useful for demo switching.
 * @param {'none'|'mild'|'moderate'|'severe'} variant
 * @param {boolean} uploadToMoorcheh
 */
export async function reseedData(variant = 'severe', uploadToMoorcheh = false) {
  await clearAllData();
  await seedData(variant, uploadToMoorcheh);
}
