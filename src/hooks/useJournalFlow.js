/**
 * useJournalFlow Hook
 *
 * State machine managing the journal entry UI flow:
 * idle → severity → loading-followup → (followup | confirm) → confirm → saved → idle
 */

import { useState, useCallback } from 'react';
import { appendEntryIndex, getPeriodStarts } from '../lib/storage';
import { uploadEntry, initMoorcheh } from '../lib/moorcheh';
import { estimateCycleDay } from '../lib/cycles';
import { generateFollowUp } from '../agents/followUp';
import * as Haptics from 'expo-haptics';

const STATES = {
  IDLE: 'idle',
  SEVERITY: 'severity',
  LOADING_FOLLOWUP: 'loading-followup',
  FOLLOWUP: 'followup',
  CONFIRM: 'confirm',
  SAVED: 'saved',
};

export function useJournalFlow() {
  const [state, setState] = useState(STATES.IDLE);
  const [symptomText, setSymptomText] = useState('');
  const [severity, setSeverityValue] = useState(null);
  const [followUpQuestion, setFollowUpQuestion] = useState(null);
  const [followUpOptions, setFollowUpOptions] = useState(null);
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [savedEntry, setSavedEntry] = useState(null);

  // Set severity and trigger follow-up generation
  const setSeverity = useCallback(
    async (severityLevel) => {
      if (!symptomText.trim()) {
        return;
      }

      setSeverityValue(severityLevel);
      setState(STATES.LOADING_FOLLOWUP);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Generate follow-up question (non-critical)
      console.log('[JournalFlow] Generating follow-up for:', symptomText);
      const result = await generateFollowUp(symptomText, severityLevel);
      console.log('[JournalFlow] Follow-up result:', result);

      if (result.success && result.question) {
        console.log('[JournalFlow] Showing follow-up question:', result.question);
        setFollowUpQuestion(result.question);
        setFollowUpOptions(result.options || null);
        setState(STATES.FOLLOWUP);
      } else {
        console.log('[JournalFlow] Skipping to confirm, reason:', result.error || 'no question');
        // Skip to confirm if no question or error
        setFollowUpQuestion(null);
        setFollowUpOptions(null);
        setState(STATES.CONFIRM);
      }
    },
    [symptomText]
  );

  // Skip follow-up and go to confirm
  const skipFollowUp = useCallback(() => {
    setFollowUpQuestion(null);
    setFollowUpOptions(null);
    setFollowUpAnswer('');
    setState(STATES.CONFIRM);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Answer follow-up and go to confirm
  const answerFollowUp = useCallback(() => {
    setState(STATES.CONFIRM);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Build Moorcheh text format
  const buildMoorchehText = useCallback((entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD
    const cycleDayStr = entry.cycleDay ? ` (cycle day ${entry.cycleDay})` : '';
    let text = `On ${date}${cycleDayStr}, severity ${entry.severity}/10: ${entry.text}`;

    if (entry.followUp?.question && entry.followUp?.answer) {
      text += ` [Follow-up — ${entry.followUp.question} ${entry.followUp.answer}]`;
    }

    return text;
  }, []);

  // Confirm and save entry
  const confirmEntry = useCallback(async () => {
    if (!symptomText.trim() || severity === null) {
      return;
    }

    const timestamp = new Date().toISOString();
    const periodStarts = await getPeriodStarts();
    const cycleDay = estimateCycleDay(periodStarts);

    const entry = {
      id: `e_${Date.now()}`,
      timestamp,
      severity,
      cycleDay,
      text: symptomText.trim(),
      followUp:
        followUpQuestion && followUpAnswer.trim()
          ? {
              question: followUpQuestion,
              answer: followUpAnswer.trim(),
            }
          : null,
    };

    // Save to both storage systems in parallel (non-blocking)
    try {
      const moorchehText = buildMoorchehText(entry);
      const metadata = {
        entry_id: entry.id,
        timestamp: entry.timestamp,
        severity: entry.severity,
        cycle_day: entry.cycleDay || 0,
      };

      await Promise.all([
        appendEntryIndex(entry),
        uploadEntry(moorchehText, metadata).catch((error) => {
          console.error('Moorcheh upload failed (non-critical):', error);
        }),
      ]);

      setSavedEntry(entry);
      setState(STATES.SAVED);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto-reset to idle after 2 seconds
      setTimeout(() => {
        reset();
      }, 2000);
    } catch (error) {
      console.error('Entry save error:', error);
      // Even if storage fails, reset to allow retry
      reset();
    }
  }, [symptomText, severity, followUpQuestion, followUpAnswer, buildMoorchehText]);

  // Reset to idle state
  const reset = useCallback(() => {
    setState(STATES.IDLE);
    setSymptomText('');
    setSeverityValue(null);
    setFollowUpQuestion(null);
    setFollowUpOptions(null);
    setFollowUpAnswer('');
    setSavedEntry(null);
  }, []);

  // Edit from confirm state
  const editEntry = useCallback(() => {
    setState(STATES.IDLE);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return {
    state,
    symptomText,
    severity,
    followUpQuestion,
    followUpOptions,
    followUpAnswer,
    savedEntry,

    // Actions
    setSymptomText,
    setSeverity,
    setFollowUpAnswer,
    skipFollowUp,
    answerFollowUp,
    confirmEntry,
    editEntry,
    reset,

    // State checks
    isIdle: state === STATES.IDLE,
    isSeverity: state === STATES.SEVERITY,
    isLoadingFollowUp: state === STATES.LOADING_FOLLOWUP,
    isFollowUp: state === STATES.FOLLOWUP,
    isConfirm: state === STATES.CONFIRM,
    isSaved: state === STATES.SAVED,
  };
}
