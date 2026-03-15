// Moorcheh API wrapper.
// All Moorcheh calls go through this module — the rest of the app never touches the API directly.
//
// In production this key MUST move to a backend proxy — never expose client-side.
// This is where the Moorcheh boilerplate workshop code plugs in.
// The boilerplate provides the namespace setup and API key configuration.

const MOORCHEH_BASE = "https://api.moorcheh.ai/v1";
const PATIENT_NAMESPACE = "flare-health-entries";
const GUIDELINES_NAMESPACE = "flare-health-guidelines";

// Legacy alias — keep for any code still referencing NAMESPACE
const NAMESPACE = PATIENT_NAMESPACE;

function getApiKey() {
  // For hackathon: read from a module-level variable set at app startup.
  // In production: this call would go through a backend proxy instead.
  return _apiKey;
}

let _apiKey = null;

export function initMoorcheh(apiKey) {
  _apiKey = apiKey;
}

async function moorchehFetch(path, body) {
  const key = getApiKey();
  if (!key) throw new Error("Moorcheh API key not configured");

  const res = await fetch(`${MOORCHEH_BASE}${path}`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Moorcheh ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Upload a symptom entry to Moorcheh for semantic retrieval.
 * @param {string} text - Human-readable entry text (user's words with date/severity context)
 * @param {object} metadata - Flat key-value metadata: { timestamp, severity, cycleDay }
 * @returns {{ uploadId: string }}
 *
 * Note: Processing is async (1-5s). Entry is available for search after processing completes.
 */
export async function uploadEntry(text, metadata) {
  const id = `e_${Date.now()}`;
  const result = await moorchehFetch(
    `/namespaces/${NAMESPACE}/documents`,
    {
      documents: [{ id, text, ...metadata }],
    }
  );
  return { uploadId: result.upload_id, id };
}

/**
 * Semantic search over symptom entries.
 * @param {string} naturalLanguageQuery - e.g. "severe pain that caused missed work"
 * @param {number} topK - Max results to return (default 20)
 * @returns {Array<{ id, score, text, metadata }>}
 */
export async function queryEntries(naturalLanguageQuery, topK = 20) {
  const result = await moorchehFetch("/search", {
    query: naturalLanguageQuery,
    namespaces: [NAMESPACE],
    top_k: topK,
  });
  return result.results || [];
}

/**
 * Ask Moorcheh to answer a question using RAG over all entries.
 * Moorcheh retrieves relevant entries, assembles context, and generates an answer.
 * @param {string} question - The question to answer
 * @param {string} [headerPrompt] - Custom system instruction for the RAG model
 * @returns {string} The generated answer
 */
export async function answerFromEntries(question, headerPrompt) {
  const result = await moorchehFetch("/answer", {
    query: question,
    namespace: NAMESPACE,
    top_k: 30,
    temperature: 0.3,
    headerPrompt:
      headerPrompt ||
      "You are summarizing a patient's symptom log. Be factual and clinical. Do not diagnose.",
    footerPrompt:
      "Include dates, severity scores, and functional impact details.",
  });
  return result.answer;
}

/**
 * Broad query to retrieve all entries. For exhaustive reads (e.g. export).
 * For UI rendering (dot matrix, cycle stats), use the local index in AsyncStorage instead.
 */
export async function getAllEntries(topK = 100) {
  return queryEntries("pelvic pain symptom entry log", topK);
}

/**
 * RAG answer querying BOTH patient entries and clinical guidelines namespaces.
 * Used by Agent 3 (via prepAnalysis) to ground the GP brief in patient data + evidence.
 * @param {string} question
 * @returns {string} Generated answer with clinical grounding
 */
/**
 * Retrieve context from both patient entries and clinical guidelines namespaces.
 * /answer only supports one namespace, but /search supports multiple.
 * We retrieve chunks from both and return a combined context string for the LLM.
 */
export async function answerWithClinicalContext(question) {
  const result = await moorchehFetch("/search", {
    query: question,
    namespaces: [PATIENT_NAMESPACE, GUIDELINES_NAMESPACE],
    top_k: 30,
  });

  const chunks = (result.results || []).map((r) => r.text).join('\n\n');
  return chunks;
}

/**
 * Delete specific documents from the patient entries namespace by ID.
 * @param {string[]} ids - Document IDs to delete (max 1000)
 */
export async function deleteEntries(ids) {
  if (!ids.length) return;
  return moorchehFetch(`/namespaces/${NAMESPACE}/documents/delete`, { ids });
}

/**
 * Clear all patient entries from Moorcheh.
 * Fetches all entry IDs via search, then deletes them in batches.
 */
export async function clearPatientEntries() {
  const key = getApiKey();
  if (!key) return; // no-op if Moorcheh not configured

  const results = await queryEntries("symptom entry", 1000);
  if (!results.length) return;

  const ids = results.map((r) => r.id);
  await deleteEntries(ids);
}

/**
 * One-time upload of clinical guideline documents to the guidelines namespace.
 * Run once at setup — not called during normal app usage.
 */
export async function uploadGuideline(id, text) {
  return moorchehFetch(`/namespaces/${GUIDELINES_NAMESPACE}/documents`, {
    documents: [{ id, text }],
  });
}
