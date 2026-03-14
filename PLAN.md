# Flare Health — Implementation Plan

## Context

Flare Health is a mobile app that helps Canadian women track pelvic pain symptoms over multiple menstrual cycles, identify clinically significant patterns, and walk into a GP appointment prepared to advocate for themselves. It never diagnoses — every insight is framed as "this pattern is worth discussing with a doctor."

Two user flows:
1. **Journal flow** — user is in pain now, logs conversationally. Max 3 turns.
2. **Appointment prep flow** — user has a GP visit coming. App generates pattern analysis, clinical brief, and advocate scripts.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Mobile framework | **Expo SDK 52 + React Native** | Managed workflow, no Xcode/Android Studio needed. Run on physical phone via Expo Go. |
| Navigation | **React Navigation 7** (bottom tabs + stack) | Standard for Expo. Bottom tab navigator for 3 main screens + stack for settings. |
| Styling | **NativeWind v4** (Tailwind for RN) | `className` prop on RN components. Same Tailwind mental model as web. |
| Storage (local) | **AsyncStorage** for lightweight entry index + cycle data, **expo-secure-store** for API keys | AsyncStorage holds the local index (timestamp + severity per entry) needed for the dot matrix and cycle stats. SecureStore encrypts keys on device. |
| Storage (memory) | **Moorcheh** (text namespace, semantic retrieval) | Full entry text uploaded as documents. Agents 3 and 4 retrieve via semantic query instead of loading all entries. Moorcheh handles embeddings automatically. |
| LLM | **gpt-oss-120b** via HuggingFace Inference Endpoint | OpenAI-compatible chat completions API at `https://vjioo4r1vyvcozuj.us-east-2.aws.endpoints.huggingface.cloud/v1` |
| API proxy | **Cloudflare Worker** | Holds the HF auth token, proxies requests from the app. Free tier, <50ms latency. |
| Animations | **React Native Reanimated 3** | Smooth card transitions in journal flow. Ships with Expo. |
| Haptics | **expo-haptics** | Subtle feedback on entry confirmation and severity selection. |

---

## File Structure

```
flare-health/
├── app.json                          # Expo config (name, icons, splash)
├── package.json
├── babel.config.js                   # Expo + NativeWind presets
├── tailwind.config.js                # NativeWind theme (severity colors)
├── metro.config.js                   # NativeWind metro integration
├── nativewind-env.d.ts               # NativeWind TS types (if using TS)
├── global.css                        # Tailwind directives
├── App.jsx                           # Entry: wraps NavigationContainer
│
├── assets/
│   ├── icon.png                      # 1024x1024 app icon
│   ├── splash.png                    # Splash screen
│   └── adaptive-icon.png             # Android adaptive icon
│
├── src/
│   ├── navigation/
│   │   └── TabNavigator.jsx          # Bottom tab: Home, Journal, Prep
│   │
│   ├── screens/
│   │   ├── HomeScreen.jsx            # Cycle day, log prompt, dot matrix
│   │   ├── JournalScreen.jsx         # Conversational entry (state machine)
│   │   ├── PrepScreen.jsx            # Pattern analysis, GP brief, scripts
│   │   ├── SettingsScreen.jsx        # Period tracking, data, about
│   │   └── OnboardingScreen.jsx      # First launch: last period date
│   │
│   ├── components/
│   │   ├── CycleDayBadge.jsx         # "Cycle Day 14" pill
│   │   ├── CycleDotMatrix.jsx        # Colored dot grid per cycle
│   │   ├── LogPromptCard.jsx         # "How are you feeling?" tappable card
│   │   ├── SeverityPicker.jsx        # 4-button severity tap: mild / moderate / severe / emergency
│   │   ├── AgentBubble.jsx           # Single message bubble from agent
│   │   ├── QuickPickChips.jsx        # Tappable pill buttons for fast input
│   │   ├── ChatInput.jsx             # TextInput + send button, keyboard-aware
│   │   ├── ConfirmationCard.jsx      # Entry summary with confirm/edit
│   │   ├── LoadingPulse.jsx          # Animated dots/pulse indicator
│   │   ├── CycleSummaryStats.jsx     # Per-cycle stats table
│   │   ├── PatternInsightCard.jsx    # "This pattern is worth discussing..."
│   │   ├── GPBriefCard.jsx           # Formatted clinical summary + share
│   │   ├── AdvocateScriptItem.jsx    # Expandable dismissal + script
│   │   └── Disclaimer.jsx            # Medical disclaimer banner
│   │
│   ├── agents/
│   │   ├── client.js                 # fetch wrapper → Cloudflare Worker
│   │   ├── prompts.js                # All 3 agent system prompts as constants
│   │   ├── followUp.js              # Agent 1: raw text → follow-up Q or null
│   │   ├── patternAnalysis.js        # Agent 2: retrieved entries → patterns
│   │   └── gpBrief.js               # Agent 3: RAG summary + patterns → brief + scripts
│   │
│   ├── lib/
│   │   ├── storage.js                # AsyncStorage: local entry index, period starts, onboarding
│   │   ├── moorcheh.js               # Moorcheh API wrapper: uploadEntry, queryEntries, answerFromEntries, getAllEntries
│   │   ├── cycles.js                 # Cycle grouping, day estimation
│   │   └── severity.js               # Severity → color/label mapping
│   │
│   └── hooks/
│       ├── useJournalFlow.js         # State machine for journal entry
│       └── useAppointmentPrep.js     # Orchestrates Moorcheh retrieval → Agent 2 → Agent 3
│
└── worker/
    ├── wrangler.toml                 # CF Worker config (name, routes, secrets)
    ├── package.json
    └── src/
        └── index.js                  # Proxy: app → HF endpoint
```

---

## Cloudflare Worker (API Proxy)

The worker is a thin proxy that:
1. Receives a `{ messages, max_tokens }` body from the app
2. Adds the HF auth token and model name
3. Forwards to the HF endpoint
4. Returns the response

```
worker/src/index.js:

POST /chat
  - Reads JSON body: { messages: [...], max_tokens: number }
  - Forwards to HF endpoint:
      POST https://vjioo4r1vyvcozuj.us-east-2.aws.endpoints.huggingface.cloud/v1/chat/completions
      Headers: Authorization: Bearer ${env.HF_API_KEY}, Content-Type: application/json
      Body: { model: "openai/gpt-oss-120b", messages, max_tokens }
  - Returns the HF response JSON to the app
  - On error: returns { error: message } with appropriate status code

GET /health
  - Returns 200 OK (for connectivity checks)

CORS headers on all responses (for dev/testing from web if needed).
HF_API_KEY stored as a Cloudflare secret (wrangler secret put HF_API_KEY).
```

**wrangler.toml:**
```
name = "flare-health-proxy"
main = "src/index.js"
compatibility_date = "2026-03-14"
```

---

## Data Model & Storage

Storage is split into two layers: **AsyncStorage** for lightweight local data (fast reads for UI rendering) and **Moorcheh** for full entry text (semantic retrieval for agents).

### Moorcheh — Entry Memory

Namespace: `flare-health-entries`

Each symptom entry is uploaded as a Moorcheh document. The `text` field is the user's raw description with date/severity context prepended. Moorcheh embeds this text for semantic search — no structured extraction needed. Queries like "missed work" or "pain during sex" find the right entries by meaning.

**Document shape (uploaded to Moorcheh):**
```json
{
  "id": "e_1710000000000",
  "text": "On 2026-03-14 (cycle day 3), severity 8/10: Really bad cramps today, couldn't go to work. [Follow-up — How many days missed this cycle? This is the second day.]",
  "timestamp": "2026-03-14T09:30:00.000Z",
  "severity": 8,
  "cycleDay": 3
}
```

The `text` field is built as: `"On ${date} (cycle day ${cycleDay}), severity ${n}/10: ${rawText}${followUp ? ` [Follow-up — ${followUp.question} ${followUp.response}]` : ''}"`. The user's own words are the core — context is prepended so the embedding captures timing and intensity. Metadata fields (`severity`, `cycleDay`) are flat document fields for potential filtered queries.

### AsyncStorage — Local Index + App State

AsyncStorage holds only what the UI needs to render without API calls:

**Key: `flare:entry_index`** — lightweight array for dot matrix and cycle stats
```json
[
  {
    "id": "e_1710000000000",
    "timestamp": "2026-03-14T09:30:00.000Z",
    "severity": 8,
    "cycleDay": 3
  }
]
```

**Key: `flare:period_starts`**
```json
["2026-01-10", "2026-02-08", "2026-03-09"]
```

**Key: `flare:onboarding_done`**
```json
true
```

API keys stored via `expo-secure-store` (encrypted), not AsyncStorage.

### Moorcheh Utility Module (`lib/moorcheh.js`)

```
// Moorcheh API key from env: VITE_MOORCHEH_API_KEY
// COMMENT: In production this key MUST move to a backend proxy — never expose client-side.
// COMMENT: This is where the Moorcheh boilerplate workshop code plugs in.
//          The boilerplate provides the namespace setup and API key configuration.
//          This module wraps the raw API so the rest of the app never touches Moorcheh directly.

MOORCHEH_BASE = "https://api.moorcheh.ai/v1"
NAMESPACE = "flare-health-entries"

uploadEntry(text: string, metadata: object) → Promise<{ uploadId: string }>
  POST ${MOORCHEH_BASE}/namespaces/${NAMESPACE}/documents
  Headers: { "x-api-key": VITE_MOORCHEH_API_KEY, "Content-Type": "application/json" }
  Body: { documents: [{ id: `e_${Date.now()}`, text, ...metadata }] }
  Returns: { uploadId } from the 202 response.
  Note: Processing is async (1-5s). Entry is available for search after processing completes.

queryEntries(naturalLanguageQuery: string, topK = 20) → Promise<SearchResult[]>
  POST ${MOORCHEH_BASE}/search
  Headers: { "x-api-key": VITE_MOORCHEH_API_KEY, "Content-Type": "application/json" }
  Body: { query: naturalLanguageQuery, namespaces: [NAMESPACE], top_k: topK }
  Returns: results[] — each { id, score, text, metadata }

answerFromEntries(question: string, headerPrompt?: string) → Promise<string>
  POST ${MOORCHEH_BASE}/answer
  Headers: { "x-api-key": VITE_MOORCHEH_API_KEY, "Content-Type": "application/json" }
  Body: {
    query: question,
    namespace: NAMESPACE,
    top_k: 30,
    temperature: 0.3,
    headerPrompt: headerPrompt || "You are summarizing a patient's symptom log. Be factual and clinical. Do not diagnose.",
    footerPrompt: "Include dates, severity scores, and functional impact details."
  }
  Returns: answer string (Moorcheh does the RAG — retrieves relevant entries, assembles context, generates answer)

getAllEntries(topK = 100) → Promise<SearchResult[]>
  // Broad semantic query to retrieve all entries. For exhaustive reads (e.g. export).
  // For UI rendering (dot matrix, cycle stats), use the local index in AsyncStorage instead.
  Calls queryEntries("pelvic pain symptom entry log", topK)
```

### Local Storage Helpers (`lib/storage.js`)

```
// Local entry index (for UI rendering — dot matrix, cycle stats)
getEntryIndex() → Promise<IndexEntry[]>
appendEntryIndex(record: IndexEntry) → Promise<void>    // append + write

// Period tracking
getPeriodStarts() → Promise<string[]>
addPeriodStart(dateStr: string) → Promise<void>          // append, sort, dedup

// App state
getOnboardingDone() → Promise<boolean>
setOnboardingDone() → Promise<void>

// API keys (via expo-secure-store)
getMoorchehKey() → Promise<string | null>
setMoorchehKey(key: string) → Promise<void>
getWorkerUrl() → Promise<string | null>
setWorkerUrl(url: string) → Promise<void>

// Housekeeping
clearAllData() → Promise<void>
exportData() → Promise<string>
```

### Cycle Logic (`lib/cycles.js`)

```
groupByCycle(entries, periodStarts) → Cycle[]
  Cycle = { startDate: string, entries: Entry[] }

  1. Sort periodStarts chronologically.
  2. For each entry, find most recent periodStart ≤ entry.timestamp.
  3. If found → assign to that cycle.
  4. If no periodStart exists → fallback: 35-day window clustering.
  5. Return cycles sorted newest-first.

estimateCycleDay(periodStarts) → number | null
  Days since most recent periodStart + 1. Null if no starts recorded.

getAverageCycleLength(periodStarts) → number | null
  Mean gap between consecutive starts. Null if < 2 starts.
```

### Severity Mapping (`lib/severity.js`)

```
severityColor(n):  1-3 → '#22c55e' (green)  4-6 → '#f59e0b' (amber)  7-9 → '#ef4444' (red)  10 → '#dc2626'  0/null → '#d1d5db' (gray)

severityLabel(n):  1-3 → 'mild'  4-6 → 'moderate'  7-9 → 'severe'  10 → 'emergency'

buildMoorchehText(rawText, severity, cycleDay, followUp) → string
  Template: "On ${date} (cycle day ${cycleDay}), severity ${severity}/10: ${rawText}${followUp ? ` [Follow-up — ${followUp.question} ${followUp.response}]` : ''}"
```

---

## Component Tree with Props

```
App
└── NavigationContainer
    └── TabNavigator
        ├── HomeScreen
        │   ├── CycleDayBadge({ cycleDay: number | null })
        │   ├── LogPromptCard({ onPress: () => navigate('Journal') })
        │   ├── CycleDotMatrix({ cycles: Cycle[], maxCycles: 3 })
        │   └── TouchableOpacity → navigate('Prep')  ["Prepare for appointment"]
        │
        ├── JournalScreen
        │   │  (uses useJournalFlow hook — renders by step)
        │   ├── step='input':
        │   │   ├── AgentBubble({ text: "How are you feeling today?" })
        │   │   ├── QuickPickChips({
        │   │   │     chips: ["Period cramps","Pelvic pain","Pain during sex",
        │   │   │             "GI issues","Exhausted","Heavy bleeding"],
        │   │   │     onSelect: (text) => void })
        │   │   └── ChatInput({ onSubmit: (text) => void, placeholder: "Describe..." })
        │   ├── step='severity':
        │   │   └── SeverityPicker({
        │   │         onSelect: (severity: number) => void,
        │   │         options: [
        │   │           { label: "Mild", value: 3, color: "green-500" },
        │   │           { label: "Moderate", value: 5, color: "amber-500" },
        │   │           { label: "Severe", value: 8, color: "red-500" },
        │   │           { label: "Emergency", value: 10, color: "red-700" }
        │   │         ]
        │   │       })
        │   ├── step='loading-followup':
        │   │   └── LoadingPulse({ message: "One more moment..." })
        │   ├── step='followup':
        │   │   ├── AgentBubble({ text: followUpQuestion })
        │   │   ├── QuickPickChips({ chips: quickResponses, onSelect })
        │   │   └── ChatInput({ onSubmit, placeholder: "Your answer..." })
        │   └── step='confirm':
        │       └── ConfirmationCard({
        │             rawText: string, severity: number,
        │             followUp: { question, response } | null,
        │             onConfirm: () => void, onDiscard: () => void })
        │
        ├── PrepScreen
        │   │  (uses useAppointmentPrep hook)
        │   ├── Disclaimer({ text: "This is not a diagnosis..." })
        │   ├── status='loading':
        │   │   └── LoadingPulse({ message: "Analyzing..." | "Generating brief..." })
        │   ├── status='ready':
        │   │   ├── CycleSummaryStats({ cycles: CycleWithStats[] })
        │   │   ├── PatternInsightCard({ insight: string | null })
        │   │   ├── GPBriefCard({ brief: object, onShare: () => void })
        │   │   └── AdvocateScriptItem({ title, scenario, script, expanded, onToggle })
        │   │       (rendered 2-3 times)
        │   └── status='error':
        │       └── Retry button + raw cycle stats fallback
        │
        └── SettingsScreen (stack-pushed from Home gear icon)
            ├── "Mark period start" — date picker
            ├── Period start history (editable list)
            ├── Export data → Share sheet
            └── Clear data (with confirmation alert)

OnboardingScreen (shown once before TabNavigator if !onboarding_done)
    ├── "When did your last period start?" — DateTimePicker
    └── "Continue" → saves period start, sets onboarding_done
```

---

## Agent System Prompts

There are 3 LLM calls (down from 4 — structured extraction was removed in favor of embeddings):
- **Agent 1 (follow-up)**: Reads the user's raw text to decide a follow-up question. Only LLM call in the journal flow.
- **Agent 2 (pattern analysis)**: Reads semantically retrieved entries from Moorcheh to detect cross-cycle patterns.
- **Agent 3 (GP brief + scripts)**: Reads a Moorcheh RAG summary + pattern analysis to generate clinical output.

### Agent 1 — Follow-Up

```
You decide whether to ask ONE follow-up question about a pelvic pain symptom entry. You receive the user's raw symptom description and the severity level they selected (mild, moderate, severe, or emergency).

Return a JSON object in one of two formats:

If a follow-up is useful:
{"question":"Your question here","quickResponses":["Option 1","Option 2","Option 3"]}

If no follow-up is needed:
{"question":null}

ASK A FOLLOW-UP ONLY IF one of these applies (check in order, ask only the FIRST match):

1. The user mentions missing work, school, or activities but doesn't say how often → ask frequency.
   Example: "You mentioned missing class — roughly how many days has pain kept you from activities this cycle?"
   quickResponses: ["Just today","2-3 days","Most of the week","I've lost count"]

2. Severity is severe or emergency but the user didn't mention any impact on daily life → ask about it.
   Example: "That sounds like significant pain. Has it affected your ability to work, study, or do daily activities?"
   quickResponses: ["Yes, I missed work/school","I'm pushing through","No, I'm managing","I cancelled plans"]

3. The user describes pain that doesn't seem to be during their period (mid-cycle, ovulation, random timing) → ask if it's recurring.
   Example: "Is this mid-cycle pain something you've noticed before, or is it new?"
   quickResponses: ["Happens most cycles","Started recently","First time","Not sure"]

4. The user describes 3+ different symptoms (e.g. cramps + nausea + exhaustion) → ask which is worst.
   Example: "You're dealing with a lot today. Which symptom is bothering you most?"
   quickResponses: [2-3 options drawn from what the user actually mentioned, in plain language]

If NONE of these match → return {"question":null}.

Tone: warm, brief, one sentence max. You are not a doctor — you are a thoughtful intake assistant.

Return ONLY the JSON object. No explanation. No markdown.
```

### Agent 2 — Pattern Analysis

```
You analyze symptom entries across menstrual cycles to find clinically significant patterns. You are not a doctor. You NEVER diagnose any condition. You identify patterns and frame them as observations worth discussing with a healthcare provider.

You receive two inputs:
1. "retrievedEntries" — symptom entries retrieved by semantic search targeting severe pain, functional impact, and non-menstrual pain. Each entry includes full text and metadata (timestamp, severity, cycleDay, symptoms, functionalImpact).
2. "cycleGroups" — a summary of all cycles with entry counts and date ranges, so you can assess cross-cycle patterns even if not every entry was retrieved.

Analyze them and return:

{"patternDetected":boolean,"cyclesAnalyzed":number,"findings":[{"pattern":"short label","description":"plain language","cyclesPresent":number,"clinicalRelevance":"why this matters"}],"insightCard":"string or null"}

PATTERNS TO DETECT:

1. Cyclic dysmenorrhea with high severity — dysmenorrhea in 2+ cycles, average severity ≥ 6.
2. Non-menstrual pelvic pain — pelvic pain outside cycle days 1-7 in 2+ cycles.
3. Functional disruption — functional impact noted in 2+ cycles.
4. Constellation pattern (MOST SIGNIFICANT) — dysmenorrhea + non-menstrual pain + functional disruption ALL present across 2+ cycles. Canadian clinical guidelines (SOGC) identify this constellation as warranting investigation.
5. Symptom diversity — 3+ symptom types co-occurring across cycles.

insightCard (if patternDetected is true):
Write 2-3 sentences for the user. Example tone: "Your symptom logs show a recurring pattern of severe period pain combined with mid-cycle pelvic pain across [X] cycles, with [Y] days of missed activities. Canadian clinical guidelines flag this combination of symptoms as worth investigating with your doctor. The GP brief below can help you share this information at your appointment."

CRITICAL RULES:
- NEVER name a specific diagnosis (not endometriosis, adenomyosis, PCOS, or any other condition).
- NEVER say "you may have" or "this suggests you have."
- Frame as: "this pattern is consistent with what clinical guidelines flag for further investigation."
- If fewer than 2 cycles of data → patternDetected: false, insightCard: null.
- Note cycle-over-cycle trends if detectable (worsening, stable, improving).

Return ONLY the JSON object. No explanation. No markdown.
```

### Agent 3 — GP Brief + Advocate Scripts

```
You generate two things for a patient preparing for a GP appointment about pelvic pain: (1) a structured clinical brief and (2) advocate scripts for common dismissal responses. You are not a doctor. You help patients present their own data clearly.

You receive two inputs:
1. "moorchehSummary" — a pre-assembled summary of all logged symptoms across cycles, generated by a retrieval-augmented system. It includes dates, severity scores, symptom types, and functional impact grouped by cycle.
2. "patternAnalysis" — structured pattern analysis output identifying cross-cycle patterns and clinical relevance.

Use these to generate:

{"gpBrief":{"title":"Patient-Reported Pelvic Pain Symptom Log","patientNote":"This log was generated from [X] entries tracked over [Y] menstrual cycles using a structured symptom journal. All data is patient-reported.","cycleSummaries":[{"cycleLabel":"Cycle starting [date]","entries":[{"date":"YYYY-MM-DD","cycleDay":"number or unknown","severity":"N/10","symptoms":"comma-separated","functionalImpact":"description or none reported"}],"cycleSummary":"One sentence summarizing this cycle"}],"overallPattern":"2-3 sentences on cross-cycle patterns. Clinical language appropriate for a GP. Do not diagnose.","patientRequest":"Based on these patterns, I would like to discuss whether further investigation is appropriate, including [relevant next steps based on symptoms]. I understand diagnosis requires clinical assessment and I am sharing this log to support that process."},"advocateScripts":[{"dismissalType":"short label","scenario":"one sentence on when GP might say this","script":"2-4 sentence response referencing specific data. Firm but respectful. Partnership framing."}]}

ADVOCATE SCRIPTS — generate 2-3 from this list, choosing the most relevant to this patient's data:

1. "Period pain is normal" → for high-severity dysmenorrhea + functional impact. Script references specific severity scores and days missed.
2. "Try painkillers / birth control first" → for multi-cycle patterns. Script: willing to discuss treatment while requesting investigation into the cause.
3. "You're too young" → common dismissal. Script references diagnostic delays for pelvic conditions, notes documented tracking.
4. "It's probably stress" → for consistent cyclical patterns. Script points to cycle-day correlation (not stress correlation).
5. "Let's wait and see" → for 2+ cycles documented. Script notes patient HAS been tracking, provides duration and entry count.

GP BRIEF RULES:
- Clinical language: "patient reports", "severity rated X/10", "functional impairment noted."
- Keep to one page worth of content.
- Concise cycle summaries, not verbose.

Return ONLY the JSON object. No explanation. No markdown.
```

---

## Agent Call Integration

### `agents/client.js` — API Client

```
WORKER_URL = "https://flare-health-proxy.<your-subdomain>.workers.dev/chat"

callAgent(systemPrompt, userMessage, maxTokens = 1024) → Promise<object>
  1. POST to WORKER_URL with:
     { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }], max_tokens: maxTokens }
  2. Parse response.choices[0].message.content as JSON
  3. If JSON parse fails → retry once with appended instruction: "You must return valid JSON only."
  4. On network error → throw NetworkError
  5. On parse error after retry → throw ParseError
```

Each agent file (`followUp.js`, `patternAnalysis.js`, `gpBrief.js`) exports a single async function that calls `callAgent` with the appropriate prompt from `prompts.js`.

### Journal Flow State Machine (`hooks/useJournalFlow.js`)

The journal flow has exactly ONE optional LLM call (follow-up). Text and severity are captured
by the UI — no extraction agent needed. Data is always saved even if the LLM call fails.

```
States: idle → severity → loading-followup → followup | confirm → confirm → saved

Step 1 — Text input (no API call):
  User types free text or taps a quick-pick chip.
  Store rawText.
  State → 'severity'

Step 2 — Severity tap (no API call):
  User taps one of 4 buttons: Mild (3) / Moderate (5) / Severe (8) / Emergency (10)
  Store severity.
  State → 'loading-followup'

Step 3 — Follow-up (single LLM call):
  Call Agent 1 (followUp) with:
    user message: "Severity: ${severityLabel}. Description: ${rawText}"
  - Returns { question, quickResponses } → state 'followup'
  - Returns { question: null } → state 'confirm'
  - Failure → silently skip to 'confirm' (non-critical — data is already captured)

Step 4 — Follow-up response (if applicable):
  User answers the follow-up question (text or quick-pick chip).
  Store followUp: { question, response }.
  State → 'confirm'

Step 5 — Confirm:
  Show ConfirmationCard with: severity badge, raw text, follow-up Q&A if present.
  User taps "Save":
    1. Build entry ID: `e_${Date.now()}`, get timestamp + cycleDay from estimateCycleDay()
    2. Build Moorcheh text:
       "On ${date} (cycle day ${cycleDay}), severity ${severity}/10: ${rawText}${followUp ? ` [Follow-up — ${followUp.question} ${followUp.response}]` : ''}"
    3. Fire both writes in parallel:
       - moorcheh.uploadEntry(text, { timestamp, severity, cycleDay })  ← embedded for semantic retrieval
       - storage.appendEntryIndex({ id, timestamp, severity, cycleDay })  ← local index for dot matrix
    4. Haptic feedback (expo-haptics: notificationAsync success)
    5. State → 'saved'
    6. After 800ms → navigate to Home
  User taps "Discard":
    State → 'idle'

  Note: Moorcheh upload is async (1-5s processing). Entry may not be immediately searchable.
        The local index ensures the dot matrix updates instantly.
```

### Appointment Prep (`hooks/useAppointmentPrep.js`)

```
States: idle → retrieving → analyzing → generating → ready | error | insufficient

On invocation:
  1. Load entryIndex + periodStarts from AsyncStorage (local, instant)
  2. Group index by cycle using cycles.js
  3. If < 2 entries → state 'insufficient', show "Log more entries" message

  4. State → 'retrieving'
     Fetch Moorcheh context for agents (2 queries in parallel):
     a. moorcheh.queryEntries("severe pain that caused missed work or school", 20)
     b. moorcheh.queryEntries("pain outside of menstrual days or mid-cycle pain", 20)
     → Deduplicate results by ID, merge into a single retrievedEntries array.
     These are the semantically relevant entries — not a full scan.

  5. State → 'analyzing'
     Call Agent 2 (pattern analysis) with:
       - User message: JSON of { retrievedEntries (text + metadata from Moorcheh), cycleGroups (from local index) }
       - Agent 2 analyzes the Moorcheh results (rich text) cross-referenced with the local cycle groupings
     - Success → store patternResult
     - Failure → state 'error' with retry. CycleSummaryStats still renders from local index.

  6. State → 'generating'
     Two parallel operations:
     a. moorcheh.answerFromEntries(
          "Summarize all logged symptoms across cycles. Include dates, severity scores, symptom types, and functional impact for each entry. Group by menstrual cycle.",
          "You are summarizing a patient's pelvic pain symptom log for a GP appointment. Be factual, use clinical language, include all dates and severity scores. Do not diagnose."
        )
        → Returns a pre-assembled RAG summary string.
     b. (waits for Agent 2 to finish if not already done)

     Then call Agent 3 (GP brief) with:
       - User message: JSON of { moorchehSummary (the RAG answer), patternAnalysis (Agent 2 output) }
       - Agent 3 formats the brief and generates advocate scripts from pre-assembled context
     - Success → store brief + scripts
     - Failure → state 'error' with retry, still show pattern card if available.

  7. State → 'ready'
```

### Loading & Error States

| Scenario | UI |
|----------|-----|
| Agent 1 (follow-up) running | LoadingPulse: "One more moment..." |
| Agent 1 (follow-up) failed | Skip silently to confirmation. Data is already captured — this is non-critical. |
| Moorcheh upload failed | Toast: "Entry saved locally, sync pending." Local index still updated. Retry on next app open. |
| Moorcheh retrieval running | LoadingPulse: "Retrieving your entries..." |
| Agent 2 (patterns) running | LoadingPulse: "Analyzing your patterns..." |
| Agent 2 (patterns) failed | "Analysis unavailable" card + retry. Raw cycle stats still shown from local index. |
| Moorcheh RAG running | LoadingPulse: "Preparing your summary..." |
| Agent 3 (GP brief) running | LoadingPulse: "Generating your GP brief..." |
| Agent 3 (GP brief) failed | "Brief unavailable" card + retry. Pattern card still shown if available. |

---

## Build Order

### Phase 1: Scaffold + Storage (build first — everything depends on it)

1. `npx create-expo-app@latest flare-health` + NativeWind setup
2. `lib/storage.js` — AsyncStorage helpers (entry index, period starts, onboarding, keys)
3. `lib/moorcheh.js` — Moorcheh API wrapper (uploadEntry, queryEntries, answerFromEntries, getAllEntries)
4. `lib/cycles.js` — cycle grouping + day estimation
5. `lib/severity.js` — color/label mapping
6. `App.jsx` + `TabNavigator.jsx` — bottom tab shell (3 tabs)
7. Empty screen placeholders for Home, Journal, Prep, Settings
8. Create the `flare-health-entries` namespace in Moorcheh (one-time setup via dashboard or API)
9. Seed test data: helper to upload 2-3 cycles of entries to Moorcheh + populate local index
10. `.env` with `VITE_MOORCHEH_API_KEY` — add `.env` to `.gitignore`

### Phase 2: Cloudflare Worker (build second — agents need it)

11. `worker/` scaffold: `npm init`, `wrangler.toml`
12. `worker/src/index.js` — proxy implementation
13. `wrangler secret put HF_API_KEY` — set the token
14. `wrangler dev` — test locally
15. `wrangler deploy` — deploy, note the URL

### Phase 3: Journal Flow (build third — primary user action, produces data for everything else)

16. `agents/client.js` — fetch wrapper pointing to deployed worker
17. `agents/prompts.js` — all 3 system prompts
18. `agents/followUp.js` — Agent 1 (only LLM call in journal flow)
19. `hooks/useJournalFlow.js` — state machine (text → severity tap → follow-up → confirm → Moorcheh + local index)
20. `JournalScreen.jsx` — wire up the flow
21. `SeverityPicker.jsx` — 4-button severity tap (mild/moderate/severe/emergency)
22. `AgentBubble.jsx`, `QuickPickChips.jsx`, `ChatInput.jsx`
23. `ConfirmationCard.jsx`
24. `LoadingPulse.jsx`
25. Test: type symptom → tap severity → follow-up → confirm → verify entry in both Moorcheh (via queryEntries) and local index

### Phase 4: Home Screen (build fourth — needs entries to be meaningful)

26. `HomeScreen.jsx`
27. `CycleDayBadge.jsx`
28. `LogPromptCard.jsx`
29. `CycleDotMatrix.jsx` — reads from local entry index (no Moorcheh call needed)
30. Prep button (navigates to Prep tab)
31. Settings gear (navigates to Settings)
32. Test: verify dot matrix with seeded data

### Phase 5: Appointment Prep (build fifth — needs multi-cycle data)

33. `agents/patternAnalysis.js` — calls moorcheh.queryEntries for targeted retrieval, then Agent 2
34. `agents/gpBrief.js` — calls moorcheh.answerFromEntries for RAG summary, then Agent 3
35. `hooks/useAppointmentPrep.js` — orchestrates retrieval → Agent 2 → RAG → Agent 3
36. `PrepScreen.jsx`
37. `Disclaimer.jsx`
38. `CycleSummaryStats.jsx` — reads from local entry index
39. `PatternInsightCard.jsx`
40. `GPBriefCard.jsx` + share via `Share.share()` (React Native Share API)
41. `AdvocateScriptItem.jsx` — expandable/collapsible
42. Test: with seeded multi-cycle data, verify Moorcheh semantic retrieval → pattern detection → RAG summary → brief generation

### Phase 6: Onboarding + Settings + Polish

43. `OnboardingScreen.jsx` — last period date picker
44. `SettingsScreen.jsx` — period tracking, export, clear
45. Conditional rendering: show onboarding if `!onboarding_done`
46. Animations: card enter/exit in journal flow (Reanimated FadeIn/SlideIn)
47. Haptic feedback on confirm + severity selection
48. Empty states: no entries yet, not enough cycles for prep
49. Color/typography pass — ensure severity palette, neutral grays, calm feel

---

## Color System

Severity palette (the only non-gray colors in the app):

| Range | Color | Tailwind class | Hex |
|-------|-------|---------------|-----|
| 1-3 (mild) | Green | `bg-green-500` | #22c55e |
| 4-6 (moderate) | Amber | `bg-amber-500` | #f59e0b |
| 7-9 (severe) | Red | `bg-red-500` | #ef4444 |
| 10 (emergency) | Deep red | `bg-red-700` | #b91c1c |
| No entry | Gray | `bg-gray-300` | #d1d5db |

UI chrome: `gray-50` through `gray-900`. App should feel calm, serious, clinical — not a wellness brand.

---

## Production Considerations

For production: the Moorcheh API key must move behind a backend proxy — the current setup exposes it client-side via the env variable, which is not production-safe. The same applies to the Cloudflare Worker's HF key (already proxied, but the Worker itself would need rate limiting per device ID and request validation). User authentication (Clerk or Supabase Auth) would scope Moorcheh namespaces per user (one namespace per account) and prevent proxy abuse. The local AsyncStorage index would be backed by a synced database so data survives app reinstalls. For Moorcheh specifically: the data processing agreement needs review since symptom text uploaded to their API constitutes health data — confirm data residency, retention policies, and encryption at rest. For Canadian health data broadly, PIPEDA compliance requires explicit informed consent with plain-language explanation of data use, data residency in Canada (`ca-central-1` for any cloud services), encryption at rest, a data deletion mechanism (including Moorcheh namespace purge), and assessment of whether symptom data constitutes "health information" under provincial legislation (PHIPA in Ontario, HIA in Alberta) which may impose stricter requirements than PIPEDA. The LLM endpoint's data retention policies also matter — patient symptom text sent to gpt-oss-120b is health data. Medical disclaimers would need legal review. App Store submission would require review of Apple's health-app guidelines.
