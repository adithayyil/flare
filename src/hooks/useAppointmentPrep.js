import { useState, useCallback } from 'react';
import { getEntryIndex, getPeriodStarts } from '../lib/storage';
import { queryEntries, answerWithClinicalContext } from '../lib/moorcheh';
import { groupByCycle } from '../lib/cycles';
import { runPrepAnalysis } from '../agents/prepAnalysis';

/**
 * Orchestrates the full appointment prep flow:
 * 1. Load local index + period starts
 * 2. Parallel: Moorcheh semantic search + RAG summary
 * 3. Two-turn LLM analysis (pattern analysis → GP brief + patient summary)
 */
export function useAppointmentPrep() {
  const [status, setStatus] = useState('idle');
  // 'idle' | 'retrieving' | 'analyzing' | 'generating' | 'ready' | 'error' | 'insufficient'

  const [patternResult, setPatternResult] = useState(null);
  const [briefResult, setBriefResult] = useState(null);
  const [cycleGroups, setCycleGroups] = useState([]);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    setStatus('retrieving');
    setPatternResult(null);
    setBriefResult(null);
    setError(null);

    try {
      // Load local data
      const [entryIndex, periodStarts] = await Promise.all([
        getEntryIndex(),
        getPeriodStarts(),
      ]);

      if (entryIndex.length < 2) {
        setStatus('insufficient');
        return;
      }

      const groups = groupByCycle(entryIndex, periodStarts);
      setCycleGroups(groups);

      // Parallel: two semantic searches + RAG summary
      const [results1, results2, moorchehSummary] = await Promise.all([
        queryEntries('severe pain that caused missed work or school', 20),
        queryEntries('pain outside of menstrual days or mid-cycle pain', 20),
        answerWithClinicalContext(
          'Summarize all logged symptoms across cycles. Include dates, severity scores, symptom types, and functional impact for each entry. Group by menstrual cycle. Where relevant, reference Canadian and North American clinical guidelines.'
        ),
      ]);

      // Deduplicate search results by ID
      const seen = new Set();
      const retrievedEntries = [...results1, ...results2].filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

      setStatus('analyzing');

      // Two-turn analysis — onPatternDone fires between Turn 1 and Turn 2
      const result = await runPrepAnalysis(
        retrievedEntries,
        groups,
        moorchehSummary,
        (pattern) => {
          setPatternResult(pattern);
          setStatus('generating');
        }
      );

      if (!result.success) {
        setError(result.error);
        setStatus('error');
        return;
      }

      setPatternResult(result.patternResult);
      setBriefResult(result.briefResult);
      setStatus('ready');
    } catch (err) {
      console.warn('[useAppointmentPrep] Failed:', err.message);
      setError(err.message);
      setStatus('error');
    }
  }, []);

  return { status, patternResult, briefResult, cycleGroups, error, run };
}
