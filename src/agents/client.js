/**
 * Shared LLM client for all agents.
 * Routes requests through the Cloudflare Worker proxy → HuggingFace endpoint.
 */

import Constants from 'expo-constants';

function getWorkerUrl() {
  const url =
    Constants.expoConfig?.extra?.workerUrl || process.env.WORKER_URL;
  if (!url) throw new Error('WORKER_URL not configured');
  return url.replace(/\/$/, '');
}

/**
 * Call the LLM via the Cloudflare Worker proxy.
 * @param {string} systemPrompt - System message
 * @param {string} userMessage - User message
 * @param {object} [opts]
 * @param {number} [opts.maxTokens=1024]
 * @param {number} [opts.temperature=0.7]
 * @returns {Promise<object>} Parsed JSON from the LLM response
 */
export async function callAgent(systemPrompt, userMessage, opts = {}) {
  const { maxTokens = 1024, temperature = 0.7 } = opts;
  const url = `${getWorkerUrl()}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`LLM proxy ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;

  if (!raw) throw new Error('Empty LLM response');

  // Try to parse as JSON, retry once with nudge if it fails
  try {
    return JSON.parse(raw);
  } catch {
    // Retry with explicit JSON instruction
    const retryRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
          {
            role: 'user',
            content:
              'Your previous response was not valid JSON. You must return valid JSON only, no markdown or preamble.',
          },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!retryRes.ok) throw new Error('LLM retry failed');
    const retryData = await retryRes.json();
    const retryRaw = retryData.choices?.[0]?.message?.content;
    return JSON.parse(retryRaw);
  }
}
