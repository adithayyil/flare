/**
 * Seed data for development/demo.
 * Populates AsyncStorage local index and optionally uploads to Moorcheh.
 * Run once to get testable data across 3 cycles.
 */
import { appendEntryIndex, addPeriodStart, getEntryIndex } from "./storage";
import { uploadEntry } from "./moorcheh";

const SEED_PERIOD_STARTS = ["2026-01-10", "2026-02-08", "2026-03-09"];

const SEED_ENTRIES = [
  // Cycle 1 (Jan 10)
  {
    id: "e_seed_01",
    timestamp: "2026-01-10T08:00:00.000Z",
    severity: 7,
    cycleDay: 1,
    text: "On 2026-01-10 (cycle day 1), severity 7/10: Awful cramps started this morning, had to call in sick to work. Heating pad is barely helping.",
  },
  {
    id: "e_seed_02",
    timestamp: "2026-01-11T14:00:00.000Z",
    severity: 8,
    cycleDay: 2,
    text: "On 2026-01-11 (cycle day 2), severity 8/10: Even worse today. Can't get out of bed, missed work again. Nausea and back pain too. [Follow-up — How many days missed this cycle? Two days so far]",
  },
  {
    id: "e_seed_03",
    timestamp: "2026-01-13T10:00:00.000Z",
    severity: 4,
    cycleDay: 4,
    text: "On 2026-01-13 (cycle day 4), severity 4/10: Pain easing up, manageable with ibuprofen. Still some lower back ache.",
  },
  {
    id: "e_seed_04",
    timestamp: "2026-01-22T18:00:00.000Z",
    severity: 5,
    cycleDay: 13,
    text: "On 2026-01-22 (cycle day 13), severity 5/10: Sharp pelvic pain on the right side, not during my period. Feels different from cramps. [Follow-up — Is this mid-cycle pain new? Happens most cycles actually]",
  },

  // Cycle 2 (Feb 8)
  {
    id: "e_seed_05",
    timestamp: "2026-02-08T09:00:00.000Z",
    severity: 8,
    cycleDay: 1,
    text: "On 2026-02-08 (cycle day 1), severity 8/10: Period started and the cramps are terrible. Missed my morning classes. Doubled over in pain.",
  },
  {
    id: "e_seed_06",
    timestamp: "2026-02-09T11:00:00.000Z",
    severity: 7,
    cycleDay: 2,
    text: "On 2026-02-09 (cycle day 2), severity 7/10: Still really bad. Heavy bleeding, soaked through in an hour. Stayed home again. [Follow-up — How many days missed? This is the second day I've missed class]",
  },
  {
    id: "e_seed_07",
    timestamp: "2026-02-10T16:00:00.000Z",
    severity: 5,
    cycleDay: 3,
    text: "On 2026-02-10 (cycle day 3), severity 5/10: Getting better but exhausted. Managed to go to afternoon class but left early.",
  },
  {
    id: "e_seed_08",
    timestamp: "2026-02-21T20:00:00.000Z",
    severity: 6,
    cycleDay: 14,
    text: "On 2026-02-21 (cycle day 14), severity 6/10: That mid-cycle pain again, same right-sided pelvic pain. Had to cancel dinner plans. [Follow-up — Is this recurring? Yes, same thing last month around the same time]",
  },
  {
    id: "e_seed_09",
    timestamp: "2026-02-25T12:00:00.000Z",
    severity: 3,
    cycleDay: 18,
    text: "On 2026-02-25 (cycle day 18), severity 3/10: Pain during sex last night, a dull deep ache. It's happened a few times now.",
  },

  // Cycle 3 (Mar 9)
  {
    id: "e_seed_10",
    timestamp: "2026-03-09T07:30:00.000Z",
    severity: 9,
    cycleDay: 1,
    text: "On 2026-03-09 (cycle day 1), severity 9/10: Worst period yet. Woke up at 5am in pain, threw up from the intensity. Can't do anything today.",
  },
  {
    id: "e_seed_11",
    timestamp: "2026-03-10T10:00:00.000Z",
    severity: 8,
    cycleDay: 2,
    text: "On 2026-03-10 (cycle day 2), severity 8/10: Still terrible. Missed work, third cycle in a row where I've lost days. Diarrhea and bloating too. [Follow-up — How many days missed total? At least 2 days every single cycle for months now]",
  },
  {
    id: "e_seed_12",
    timestamp: "2026-03-12T15:00:00.000Z",
    severity: 5,
    cycleDay: 4,
    text: "On 2026-03-12 (cycle day 4), severity 5/10: Easing off. Back at work but struggling to concentrate. Fatigue is real.",
  },
];

/**
 * Seed local index + period starts. Call once on dev/demo setup.
 * @param {boolean} uploadToMoorcheh - Also upload to Moorcheh namespace (requires API key)
 */
export async function seedData(uploadToMoorcheh = false) {
  const existing = await getEntryIndex();
  if (existing.length > 0) {
    console.log("Seed data skipped — entries already exist");
    return;
  }

  // Seed period starts
  for (const date of SEED_PERIOD_STARTS) {
    await addPeriodStart(date);
  }

  // Seed entries
  for (const entry of SEED_ENTRIES) {
    await appendEntryIndex({
      id: entry.id,
      timestamp: entry.timestamp,
      severity: entry.severity,
      cycleDay: entry.cycleDay,
    });

    if (uploadToMoorcheh) {
      try {
        await uploadEntry(entry.text, {
          timestamp: entry.timestamp,
          severity: entry.severity,
          cycleDay: entry.cycleDay,
        });
      } catch (err) {
        console.warn(`Moorcheh upload failed for ${entry.id}:`, err.message);
      }
    }
  }

  console.log(`Seeded ${SEED_ENTRIES.length} entries across ${SEED_PERIOD_STARTS.length} cycles`);
}
