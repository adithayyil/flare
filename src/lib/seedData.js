/**
 * Seed data for development/demo.
 * Populates AsyncStorage local index and optionally uploads to Moorcheh.
 * 3 cycles with realistic endo-pattern entries and structured follow-ups.
 */
import { appendEntryIndex, addPeriodStart, addPeriodEnd, getEntryIndex } from "./storage";
import { uploadEntry } from "./moorcheh";

const SEED_PERIOD_STARTS = ["2026-01-10", "2026-02-08", "2026-03-09"];
const SEED_PERIOD_ENDS = ["2026-01-15", "2026-02-13"];

const SEED_ENTRIES = [
  // ── Cycle 1 (Jan 10 - Jan 15) ──
  {
    id: "e_seed_01",
    timestamp: "2026-01-10T08:00:00.000Z",
    severity: 7,
    cycleDay: 1,
    isPeriodDay: true,
    text: "awful cramps started this morning, had to call in sick. heating pad barely helping",
    followUp: {
      question: "how did this affect your plans for today?",
      answer: "called in sick to work",
    },
  },
  {
    id: "e_seed_02",
    timestamp: "2026-01-11T14:00:00.000Z",
    severity: 8,
    cycleDay: 2,
    isPeriodDay: true,
    text: "worse than yesterday. can't get out of bed, nausea and back pain on top of cramps",
    followUp: {
      question: "what did you have to miss or cancel?",
      answer: "missed work again, second day in a row",
    },
  },
  {
    id: "e_seed_03",
    timestamp: "2026-01-13T10:00:00.000Z",
    severity: 4,
    cycleDay: 4,
    isPeriodDay: true,
    text: "pain easing up, manageable with ibuprofen. still some lower back ache but i can function",
    followUp: null,
  },
  {
    id: "e_seed_04",
    timestamp: "2026-01-22T18:00:00.000Z",
    severity: 5,
    cycleDay: 13,
    isPeriodDay: false,
    text: "sharp pelvic pain on the right side, not during my period. feels different from cramps",
    followUp: {
      question: "is this type of mid-cycle pain new for you?",
      answer: "happens most cycles actually",
    },
  },

  // ── Cycle 2 (Feb 8 - Feb 13) ──
  {
    id: "e_seed_05",
    timestamp: "2026-02-08T09:00:00.000Z",
    severity: 8,
    cycleDay: 1,
    isPeriodDay: true,
    text: "period started and the cramps are terrible. doubled over, couldn't make it to class",
    followUp: {
      question: "what did you have to miss or cancel?",
      answer: "missed morning classes",
    },
  },
  {
    id: "e_seed_06",
    timestamp: "2026-02-09T11:00:00.000Z",
    severity: 7,
    cycleDay: 2,
    isPeriodDay: true,
    text: "still really bad. heavy bleeding, soaked through in an hour. staying home again",
    followUp: {
      question: "how many days have you missed so far this cycle?",
      answer: "second day i've missed class",
    },
  },
  {
    id: "e_seed_07",
    timestamp: "2026-02-10T16:00:00.000Z",
    severity: 5,
    cycleDay: 3,
    isPeriodDay: true,
    text: "getting better but exhausted. went to afternoon class but left early",
    followUp: {
      question: "were you able to get through your plans today?",
      answer: "left class early, couldn't focus",
    },
  },
  {
    id: "e_seed_08",
    timestamp: "2026-02-21T20:00:00.000Z",
    severity: 6,
    cycleDay: 14,
    isPeriodDay: false,
    text: "that mid-cycle pain again, same right-sided pelvic pain as last month",
    followUp: {
      question: "did this disrupt anything you had planned?",
      answer: "had to cancel dinner plans",
    },
  },
  {
    id: "e_seed_09",
    timestamp: "2026-02-25T12:00:00.000Z",
    severity: 3,
    cycleDay: 18,
    isPeriodDay: false,
    text: "pain during sex last night, a dull deep ache. it's happened a few times now",
    followUp: {
      question: "has this been affecting your comfort or intimacy?",
      answer: "yeah it's starting to make me avoid it",
    },
  },

  // ── Cycle 3 (Mar 9 - ongoing) ──
  {
    id: "e_seed_10",
    timestamp: "2026-03-09T07:30:00.000Z",
    severity: 9,
    cycleDay: 1,
    isPeriodDay: true,
    text: "worst period yet. woke up at 5am in pain, threw up from the intensity",
    followUp: {
      question: "what were you unable to do today?",
      answer: "couldn't do anything, stayed in bed all day",
    },
  },
  {
    id: "e_seed_11",
    timestamp: "2026-03-10T10:00:00.000Z",
    severity: 8,
    cycleDay: 2,
    isPeriodDay: true,
    text: "still terrible. diarrhea and bloating on top of cramps. third cycle in a row losing days to this",
    followUp: {
      question: "how many days have you missed across recent cycles?",
      answer: "at least 2 days every single cycle for months",
    },
  },
  {
    id: "e_seed_12",
    timestamp: "2026-03-12T15:00:00.000Z",
    severity: 5,
    cycleDay: 4,
    isPeriodDay: true,
    text: "easing off finally. back at work but struggling to concentrate, totally wiped out",
    followUp: {
      question: "were you able to get through your day?",
      answer: "got through it but barely, fatigue is brutal",
    },
  },
];

/**
 * Build Moorcheh-formatted text from an entry (mirrors useJournalFlow logic).
 */
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

/**
 * Seed local index + period starts. Call once on dev/demo setup.
 * @param {boolean} uploadToMoorcheh - Also upload to Moorcheh namespace (requires API key)
 */
export async function seedData(uploadToMoorcheh = false) {
  const existing = await getEntryIndex();
  if (existing.length > 0) {
    console.log("Seed data skipped, entries already exist");
    return;
  }

  // Seed period starts and ends
  for (const date of SEED_PERIOD_STARTS) {
    await addPeriodStart(date);
  }
  for (const date of SEED_PERIOD_ENDS) {
    await addPeriodEnd(date);
  }

  // Seed entries
  for (const entry of SEED_ENTRIES) {
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
        const moorchehText = buildMoorchehText(entry);
        await uploadEntry(moorchehText, {
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

  console.log(
    `Seeded ${SEED_ENTRIES.length} entries across ${SEED_PERIOD_STARTS.length} cycles`
  );
}
