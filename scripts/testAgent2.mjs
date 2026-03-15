/**
 * Quick test for Agent 2 (Pattern Analysis).
 * Requires the Cloudflare Worker running locally: cd worker && npx wrangler dev
 * Run with: node scripts/testAgent2.mjs
 */

const WORKER_URL = 'http://localhost:8787/chat/completions';

const SYSTEM_PROMPT = `You analyze symptom entries across menstrual cycles to find clinically significant patterns. You are not a doctor. You NEVER diagnose any condition. You identify patterns and frame them as observations worth discussing with a healthcare provider.

You receive two inputs:
1. "retrievedEntries" — symptom entries retrieved by semantic search targeting severe pain, functional impact, and non-menstrual pain. Each entry includes full text and metadata (timestamp, severity, cycleDay).
2. "cycleGroups" — a summary of all cycles with entry counts and date ranges, so you can assess cross-cycle patterns even if not every entry was retrieved.

CLINICAL REFERENCE (use to inform findings — do not repeat verbatim to user):

Diagnostic delay: The average time from symptom onset to diagnosis for pelvic conditions in Canada is 5-10 years. Documented symptom patterns across multiple cycles are clinically valuable precisely because they counter this delay.

Clinically significant dysmenorrhea: Period pain severe enough to cause functional impairment (missed work, school, or activities) is not considered normal by Canadian clinical guidelines (SOGC). It warrants investigation, not reassurance.

The constellation pattern: The co-occurrence of (1) severe cyclic dysmenorrhea, (2) non-menstrual pelvic pain, and (3) functional disruption across 2+ cycles is the pattern SOGC guidelines flag for further investigation. Any two of three is noteworthy. All three is significant.

Non-menstrual pain: Pelvic pain outside cycle days 1-5, particularly mid-cycle (around days 12-16), is not explained by menstruation alone and warrants clinical attention if recurring.

GI co-occurrence: Bloating, diarrhea, or GI pain that correlates with cycle timing is clinically relevant and should be noted as part of a symptom constellation, not treated as a separate issue.

Severity calibration: A severity of 7+/10 with no functional impact is less clinically significant than a 5/10 that causes consistent missed activities. Weight functional disruption heavily in your analysis.

PATTERNS TO DETECT:

1. Cyclic dysmenorrhea with high severity — dysmenorrhea in 2+ cycles, average severity >= 6.
2. Non-menstrual pelvic pain — pelvic pain outside cycle days 1-7 in 2+ cycles.
3. Functional disruption — functional impact (missed work, school, activities) noted in 2+ cycles.
4. Constellation pattern (MOST SIGNIFICANT) — dysmenorrhea + non-menstrual pain + functional disruption ALL present across 2+ cycles. Canadian clinical guidelines (SOGC) identify this constellation as warranting investigation.
5. Symptom diversity — 3+ symptom types co-occurring across cycles.

TREND ANALYSIS:
If severity scores are increasing cycle-over-cycle, explicitly note this — worsening trajectory is more clinically urgent than stable high severity. If improving, note that too.

Return this JSON object:
{"patternDetected":boolean,"cyclesAnalyzed":number,"findings":[{"pattern":"short label","description":"plain language description","cyclesPresent":number,"clinicalRelevance":"why this matters for a GP conversation"}],"insightCard":"string or null"}

insightCard rules (write only if patternDetected is true):
- 2-3 sentences written directly to the user
- Plain language, warm but factual tone
- Reference specific numbers from the data (cycles, severity, days missed)
- End with a forward-looking sentence about the GP brief
CRITICAL RULES:
- NEVER name a specific diagnosis (not endometriosis, adenomyosis, PCOS, or any other condition).
- NEVER say "you may have" or "this suggests you have."
- Frame as: "this pattern is consistent with what clinical guidelines flag for further investigation."
- If fewer than 2 cycles of data — patternDetected: false, findings: [], insightCard: null.
- findings array must be empty [] if patternDetected is false.

Return ONLY the JSON object. No explanation. No markdown.`;

// Mock retrieved entries (as if returned by Moorcheh queryEntries)
const mockRetrievedEntries = [
  { text: "On 2026-01-10 (cycle day 1), severity 7/10: Awful cramps started this morning, had to call in sick to work.", severity: 7, cycleDay: 1, timestamp: "2026-01-10T08:00:00.000Z", score: 0.91 },
  { text: "On 2026-01-11 (cycle day 2), severity 8/10: Even worse today. Can't get out of bed, missed work again. Nausea and back pain too. [Follow-up — How many days missed? Two days so far]", severity: 8, cycleDay: 2, timestamp: "2026-01-11T14:00:00.000Z", score: 0.89 },
  { text: "On 2026-01-22 (cycle day 13), severity 5/10: Sharp pelvic pain on the right side, not during my period. [Follow-up — Is this recurring? Happens most cycles]", severity: 5, cycleDay: 13, timestamp: "2026-01-22T18:00:00.000Z", score: 0.84 },
  { text: "On 2026-02-08 (cycle day 1), severity 8/10: Period started and the cramps are terrible. Missed my morning classes.", severity: 8, cycleDay: 1, timestamp: "2026-02-08T09:00:00.000Z", score: 0.92 },
  { text: "On 2026-02-09 (cycle day 2), severity 7/10: Still really bad. Heavy bleeding. Stayed home again. [Follow-up — How many days missed? Second day]", severity: 7, cycleDay: 2, timestamp: "2026-02-09T11:00:00.000Z", score: 0.88 },
  { text: "On 2026-02-21 (cycle day 14), severity 6/10: Mid-cycle pain again, same right-sided pelvic pain. Had to cancel dinner plans. [Follow-up — Is this recurring? Yes, same thing last month]", severity: 6, cycleDay: 14, timestamp: "2026-02-21T20:00:00.000Z", score: 0.86 },
  { text: "On 2026-03-09 (cycle day 1), severity 9/10: Worst period yet. Woke up at 5am in pain, threw up from the intensity. Can't do anything today.", severity: 9, cycleDay: 1, timestamp: "2026-03-09T07:30:00.000Z", score: 0.95 },
  { text: "On 2026-03-10 (cycle day 2), severity 8/10: Still terrible. Missed work, third cycle in a row. Diarrhea and bloating too. [Follow-up — Days missed total? At least 2 days every single cycle for months]", severity: 8, cycleDay: 2, timestamp: "2026-03-10T10:00:00.000Z", score: 0.93 },
];

// Mock cycle groups (as if returned by groupByCycle)
const mockCycleGroups = [
  { startDate: "2026-01-10", entryCount: 4, severities: [7, 8, 4, 5] },
  { startDate: "2026-02-08", entryCount: 5, severities: [8, 7, 5, 6, 3] },
  { startDate: "2026-03-09", entryCount: 3, severities: [9, 8, 5] },
];

async function testAgent2() {
  console.log('Testing Agent 2 (Pattern Analysis)...');
  console.log(`Worker: ${WORKER_URL}\n`);

  const userMessage = JSON.stringify({
    retrievedEntries: mockRetrievedEntries,
    cycleGroups: mockCycleGroups,
  });

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Worker error:', res.status, text);
      return;
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;

    if (!raw) {
      console.error('Empty response from LLM');
      return;
    }

    console.log('--- Raw LLM output ---');
    console.log(raw);

    try {
      const parsed = JSON.parse(raw);
      console.log('\n--- Parsed result ---');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('\n--- Insight card ---');
      console.log(parsed.insightCard ?? '(none)');
    } catch {
      console.error('\nJSON parse failed — LLM did not return valid JSON');
    }
  } catch (err) {
    console.error('Fetch failed — is the worker running? (cd worker && npx wrangler dev)');
    console.error(err.message);
  }
}

testAgent2();
