/**
 * Agent 1: Follow-up Question Generator
 * Asks about functional impact - how pain affected daily life
 */

/**
 * Generate a follow-up question about functional impact
 * @param {string} symptomText - User's symptom description
 * @param {number} severity - Severity level (0-10)
 * @returns {Promise<{success: boolean, question?: string, options?: array, error?: string}>}
 */
export async function generateFollowUp(symptomText, severity) {
  console.log('[FollowUp] Analyzing entry:', symptomText);

  const text = symptomText.toLowerCase();

  // Detect what they mentioned and ask about the impact

  // Mentioned missing work/class
  if (/miss|couldn't|skipped|absent/.test(text) && /class|work|school|job/.test(text)) {
    return {
      success: true,
      question: 'Did missing class affect any plans or commitments?',
      options: [
        'Missed work or class',
        'Cancelled plans with people',
        'Stayed in bed most of the day',
        'Managed okay despite pain',
      ],
    };
  }

  // Mentioned staying home/bed
  if (/stayed|bed|home|rest|lay down/.test(text)) {
    return {
      success: true,
      question: 'How much of your day was affected?',
      options: [
        'Whole day in bed',
        'Most of the day',
        'A few hours',
        'Could still do some things',
      ],
    };
  }

  // Mentioned specific activities
  if (/walk|move|stand|sit/.test(text)) {
    return {
      success: true,
      question: 'What activities were difficult?',
      options: [
        'Walking or standing',
        'Sitting comfortably',
        'Exercise or movement',
        'Daily tasks (cooking, cleaning)',
      ],
    };
  }

  // High severity (7+) but no impact mentioned
  if (severity >= 7) {
    return {
      success: true,
      question: 'Did this interfere with your day?',
      options: [
        'Missed work or class',
        'Cancelled plans',
        'Stayed home',
        'Managed to push through',
      ],
    };
  }

  // Moderate severity (4-6) but no impact mentioned
  if (severity >= 4) {
    return {
      success: true,
      question: 'How did you manage?',
      options: [
        'Took pain medication',
        'Used heat/ice',
        'Rested when possible',
        'Just pushed through it',
      ],
    };
  }

  // Default: ask about general impact
  return {
    success: true,
    question: 'Did this affect what you could do today?',
    options: [
      'Yes, significantly',
      'Somewhat',
      'Not really',
      'Managed fine',
    ],
  };
}
