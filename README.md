# flare

Pelvic pain tracking and medical appointment preparation app. Flare helps people experiencing chronic pelvic pain document symptom patterns, detect clinically significant trends, and prepare for doctor appointments with evidence-based advocacy tools.

The app addresses the 4-11 year diagnostic delay common in conditions like endometriosis by empowering patients to present organized, guideline-backed evidence to their healthcare providers.

## Features

**Symptom Journal**
- Log symptoms with text or voice input (Whisper speech-to-text)
- Rate severity on the Mankoski Pain Scale (1-10)
- AI-generated follow-up questions to capture functional impact
- Pattern alerts when clinically significant trends are detected

**Cycle Dashboard**
- Track period start/end dates with estimated cycle day
- Per-cycle dot matrix visualization (color-coded by severity)
- Stats: severe days, missed activities, mid-cycle pain indicators
- Pattern flag badge for recurring clinical patterns

**Appointment Prep**
- AI-generated GP brief with symptom pattern summary and clinical context
- Self-advocacy scripts for 6 common medical dismissals (e.g. "Period pain is normal", "Your tests came back fine")
- Custom dismissal response generator
- Shareable/printable clinical summary grounded in SOGC and ACOG guidelines

## Tech Stack

- **Framework:** React Native 0.83 + Expo SDK 55
- **Navigation:** React Navigation (bottom tabs + native stack)
- **Styling:** NativeWind (Tailwind for React Native)
- **Storage:** AsyncStorage (local index) + Moorcheh (semantic search / RAG)
- **LLM:** Cloudflare Worker proxy to HuggingFace inference API
- **Voice:** Whisper transcription server
- **Icons:** Lucide React Native

## Project Structure

```
src/
  screens/
    OnboardingScreen.jsx    # First-run period date entry
    HomeScreen.jsx          # Cycle dashboard with stats and patterns
    JournalScreen.jsx       # Symptom logging flow
    PrepScreen.jsx          # Appointment prep brief and scripts
    SettingsScreen.jsx      # Dev tools, data seeding
  navigation/
    TabNavigator.jsx        # Bottom tab navigation (Home, Log, Prep)
  components/
    BottomSheet.jsx         # Confirmation sheet
    BubbleQuestion.jsx      # Chat-style question UI
    BubbleReply.jsx         # Chat-style reply UI
    DotMatrix.jsx           # Cycle severity visualization
    GPBrief.jsx             # Printable GP brief component
    AdvocateScript.jsx      # Dismissal response scripts
    InsightCard.jsx         # Pattern insight card
    InfoTip.jsx             # Contextual help tooltips
  agents/
    client.js               # Shared LLM API client
    followUp.js             # Follow-up question generator
    prepAnalysis.js         # Two-turn pattern + brief generator
  hooks/
    useJournalFlow.js       # Journal entry state machine
    useAppointmentPrep.js   # Prep screen orchestration
  lib/
    storage.js              # AsyncStorage + SecureStore helpers
    cycles.js               # Cycle grouping and day estimation
    moorcheh.js             # Moorcheh RAG API wrapper
    patternAlert.js         # Local heuristic pattern detection
    severity.js             # Mankoski scale mapping
    whisper.js              # Voice transcription API
    seedData.js             # Development seed data
worker/                     # Cloudflare Worker (LLM proxy)
whisper-server/             # Local Whisper transcription server
```

## Setup

### Prerequisites

- Node.js (or [Nix](https://nixos.org/) with `nix-shell -p nodejs`)
- Expo CLI

### Environment Variables

Create a `.env` file in the project root:

```
MOORCHEH_API_KEY=your-moorcheh-api-key
WORKER_URL=https://your-worker.workers.dev
```

### Install and Run

```bash
npm install

npx expo start
```

## Architecture

### Journal Flow State Machine

```
idle -> severity -> loading-followup -> followup -> confirm -> saved
```

The user enters symptoms, rates severity, optionally answers a follow-up question about functional impact, then confirms. Entries are saved to both local storage (AsyncStorage index) and Moorcheh (for semantic search and RAG).

### Pattern Detection

Runs locally using heuristics (no LLM). Detects constellation patterns across cycles:

- Severe dysmenorrhea (7+/10 on cycle days 1-3)
- Mid-cycle pain (4+/10 on day 8+)
- Functional disruption (7+/10 severity with missed activities)
- Pattern must appear across 2+ cycles to flag

### LLM Integration

All LLM calls route through a Cloudflare Worker proxy to HuggingFace. The backend has a small context window, so prompts are kept very short (~200 chars system, ~150-200 chars user) and entry history is truncated aggressively.

### Data Flow

```
User Input -> JournalScreen -> useJournalFlow
                                    |
                        +-----------+-----------+
                        |                       |
                  AsyncStorage             Moorcheh
                  (entry index)        (semantic search)
                        |                       |
                        +-----------+-----------+
                                    |
                              HomeScreen
                           (cycle grouping)
                                    |
                              PrepScreen
                        (pattern analysis + RAG)
                                    |
                         GP Brief + Scripts
```

## Clinical Grounding

Appointment prep content is grounded in:

- **SOGC** (Society of Obstetricians and Gynaecologists of Canada) guidelines
- **ACOG Clinical Practice Guideline No. 11** (March 2026) - supports clinical diagnosis from symptoms alone, without requiring laparoscopy

The app does not diagnose. It helps patients document patterns and advocate for appropriate investigation.
