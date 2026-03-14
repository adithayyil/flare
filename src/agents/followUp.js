/**
 * Agent 1: Follow-up Question Generator
 * Calls the LLM to generate a contextual follow-up question
 * about functional impact based on the user's symptom text and severity.
 */

import { callAgent } from './client';

const SYSTEM_PROMPT = `You are a follow-up question generator for a pelvic pain tracking app used by Canadian women. Given a symptom log entry and its severity (0-10), generate ONE short follow-up question that asks about functional impact — how the pain affected the person's daily life, activities, or ability to function.

Rules:
- The question must be empathetic and conversational, not clinical
- Focus on functional impact: what they couldn't do, how they coped, what was disrupted
- Tailor the question to what they actually described — don't ask generic questions
- For high severity (7+): ask about missed activities, inability to function
- For moderate severity (4-6): ask about coping strategies, partial disruption
- For low severity (1-3): ask about whether it was noticeable or affected mood
- Provide 4 short answer options relevant to the question (each under 8 words)

Return ONLY this JSON (no markdown, no extra text):
{"question": "your question here", "options": ["option1", "option2", "option3", "option4"]}`;

/**
 * Generate a follow-up question about functional impact via LLM.
 * @param {string} symptomText - User's symptom description
 * @param {number} severity - Severity level (0-10)
 * @returns {Promise<{success: boolean, question?: string, options?: string[], error?: string}>}
 */
export async function generateFollowUp(symptomText, severity) {
  try {
    const userMessage = `Severity: ${severity}/10\nEntry: ${symptomText}`;

    const result = await callAgent(SYSTEM_PROMPT, userMessage, {
      maxTokens: 512,
      temperature: 0.7,
    });

    if (result.question && Array.isArray(result.options) && result.options.length > 0) {
      return {
        success: true,
        question: result.question,
        options: result.options.slice(0, 4),
      };
    }

    return { success: false, error: 'Invalid LLM response shape' };
  } catch (error) {
    console.warn('[FollowUp] LLM call failed, skipping:', error.message);
    return { success: false, error: error.message };
  }
}
