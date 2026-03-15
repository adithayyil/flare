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
/**
 * Call the LLM with a full multi-turn message history.
 * Used for two-step conversations where the LLM's first response stays in context.
 * @param {string} systemPrompt - System message
 * @param {Array<{role: string, content: string}>} messages - Full turn history after system
 * @param {object} [opts]
 * @param {number} [opts.maxTokens=1024]
 * @param {number} [opts.temperature=0.7]
 * @returns {Promise<object>} Parsed JSON from the LLM response
 */
export async function callAgentMultiTurn(systemPrompt, messages, opts = {}) {
  const { maxTokens = 1024, temperature = 0.7 } = opts;
  const url = `${getWorkerUrl()}/chat/completions`;

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: fullMessages, max_tokens: maxTokens, temperature }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`LLM proxy ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Empty LLM response');

  try {
    return JSON.parse(raw);
  } catch {
    // Retry: append the bad response + correction turn
    const retryRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          ...fullMessages,
          { role: 'assistant', content: raw },
          { role: 'user', content: 'Your previous response was not valid JSON. Return valid JSON only, no markdown or preamble.' },
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
