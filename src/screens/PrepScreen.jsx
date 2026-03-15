import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useAppointmentPrep } from '../hooks/useAppointmentPrep';

export default function PrepScreen() {
  const { status, patternResult, briefResult, cycleGroups, error, run } =
    useAppointmentPrep();

  useEffect(() => { run(); }, []);

  if (['retrieving', 'analyzing', 'generating'].includes(status)) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator color="#F08080" size="large" />
        <Text style={s.loadingText}>{LOADING_MESSAGES[status]}</Text>
      </SafeAreaView>
    );
  }

  if (status === 'insufficient') {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.emptyTitle}>Not enough data yet</Text>
        <Text style={s.emptyBody}>Log at least 2 symptom entries to generate your appointment prep.</Text>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.emptyTitle}>Something went wrong</Text>
        <Text style={s.emptyBody}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={run}>
          <Text style={s.retryText}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (status !== 'ready') return null;

  const { gpBrief, advocateScripts, patientSummary } = briefResult;

  // Derive stats from available data
  const allEntries = cycleGroups.flatMap(c => c.entries);
  const severeDays = allEntries.filter(e => e.severity >= 7).length;
  const missedStat = patientSummary.keyNumbers?.find(k =>
    k.label.toLowerCase().includes('missed')
  );
  const midCycleFinding = patternResult.findings?.find(f =>
    f.pattern.toLowerCase().includes('non-menstrual') ||
    f.pattern.toLowerCase().includes('mid-cycle')
  );

  const stats = [
    { value: String(cycleGroups.length), label: 'cycles logged' },
    { value: String(severeDays), label: 'severe days total' },
    { value: missedStat?.value ?? '—', label: 'missed commitments' },
    { value: midCycleFinding ? `${midCycleFinding.cyclesPresent}/${cycleGroups.length}` : '—', label: 'cycles w/ mid-cycle pain' },
  ];

  // Date range label
  const sortedCycles = [...cycleGroups].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const firstDate = sortedCycles[0]?.startDate;
  const lastDate = sortedCycles[sortedCycles.length - 1]?.startDate;
  const dateRange = firstDate && lastDate
    ? `${formatMonth(firstDate)}–${formatMonth(lastDate)}`
    : '';

  // Share GP brief
  const handleShare = async () => {
    const text = buildShareText(gpBrief, patternResult);
    if (Platform.OS === 'web') {
      if (navigator.share) {
        try { await navigator.share({ text }); } catch {}
      } else {
        await navigator.clipboard.writeText(text);
        window.alert('Copied to clipboard');
      }
    } else {
      Share.share({ message: text, title: 'GP Brief -- Flare Health' });
    }
  };

  // Print GP brief (web only)
  const handlePrint = () => {
    const html = buildPrintHtml(gpBrief, patternResult, dateRange, cycleGroups.length);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F6' }}>
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── PATIENT SECTION ── */}
      <Text style={s.sectionLabel}>WHAT YOU'VE TRACKED</Text>
      <View style={s.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={s.statCard}>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Advocate scripts */}
      <Text style={[s.sectionLabel, { marginTop: 28 }]}>IF YOUR DOCTOR SAYS...</Text>
      <View style={s.advocateList}>
        {advocateScripts?.map((item, i) => (
          <View key={i} style={[s.advocateCard, i > 0 && s.advocateBorder]}>
            <Text style={s.dismissalLabel}>"{item.dismissalType}"</Text>
            <Text style={s.scriptText}>You can say: "{item.script}"</Text>
          </View>
        ))}
      </View>

      {/* ── GP BRIEF SECTION ── */}
      <View style={s.gpBriefHeader}>
        <Text style={s.gpBriefTitle}>GP brief</Text>
        {Platform.OS === 'web' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.7}>
              <Text style={s.shareBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.shareBtn} onPress={handlePrint} activeOpacity={0.7}>
              <Text style={s.shareBtnText}>Print</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.7}>
            <Text style={s.shareBtnText}>Share</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.gpCard}>
        <Text style={s.gpDocTitle}>Patient-reported symptom summary</Text>
        <Text style={s.gpDocSub}>Logged via Flare Health · {dateRange}</Text>

        {/* Symptom pattern */}
        <View style={s.gpBlock}>
          <Text style={s.gpBlockLabel}>SYMPTOM PATTERN ({cycleGroups.length} CYCLES)</Text>
          {patternResult.findings?.map((f, i) => (
            <Text key={i} style={s.gpBullet}>· {f.description}</Text>
          ))}
        </View>

        {/* Clinical context */}
        <View style={s.gpBlock}>
          <Text style={s.gpBlockLabel}>CLINICAL CONTEXT</Text>
          <Text style={s.gpBodyText}>{gpBrief.overallPattern}</Text>
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerText}>
            This summary is patient-reported and does not constitute a clinical diagnosis. Generated by Flare Health for informational purposes.
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──

const LOADING_MESSAGES = {
  retrieving: 'Retrieving your entries...',
  analyzing: 'Analyzing your patterns...',
  generating: 'Generating your brief...',
};

function formatMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
}

function buildPrintHtml(gpBrief, patternResult, dateRange, cycleCount) {
  const findings = patternResult.findings
    ?.map(f => `<li><strong>${f.pattern}</strong>: ${f.description}</li>`)
    .join('') ?? '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>GP Brief - Flare Health</title>
<style>body{font-family:Georgia,serif;max-width:640px;margin:40px auto;color:#222;line-height:1.6}
h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#666;margin-top:24px;margin-bottom:8px}
p{margin:0 0 8px}ul{margin:0;padding-left:20px}li{margin-bottom:4px}
.meta{color:#888;font-size:13px;margin-bottom:20px}
.disclaimer{margin-top:24px;padding:12px;background:#f5f5f5;border-radius:4px;font-size:12px;color:#888}
</style></head><body>
<h1>${gpBrief.title || 'Patient-reported symptom summary'}</h1>
<p class="meta">Logged via Flare Health · ${dateRange}</p>
<h2>Symptom Pattern (${cycleCount} cycles)</h2>
<ul>${findings}</ul>
<h2>Clinical Context</h2>
<p>${gpBrief.overallPattern || ''}</p>
${gpBrief.patientRequest ? `<h2>Patient Request</h2><p>${gpBrief.patientRequest}</p>` : ''}
<div class="disclaimer">This summary is patient-reported and does not constitute a clinical diagnosis. Generated by Flare Health for informational purposes.</div>
</body></html>`;
}

function buildShareText(gpBrief, patternResult) {
  const lines = [
    gpBrief.title,
    gpBrief.patientNote,
    '',
    'OVERALL PATTERN',
    gpBrief.overallPattern,
    '',
    'PATIENT REQUEST',
    gpBrief.patientRequest,
    '',
    'PATTERNS DETECTED',
    ...(patternResult.findings?.map(f => `• ${f.pattern}: ${f.description}`) ?? []),
  ];
  return lines.join('\n');
}

// ── Styles ──

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FFF8F6' },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FFF8F6' },
  loadingText: { marginTop: 16, color: '#A8969F', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#2D1520', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#A8969F', textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#F08080', borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: '#A8969F', marginBottom: 12 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#F0E0E0' },
  statValue: { fontSize: 28, fontWeight: '700', color: '#2D1520', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#A8969F' },

  // Advocate scripts
  advocateList: { backgroundColor: '#FFF5F5', borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#F0E0E0' },
  advocateCard: { padding: 16 },
  advocateBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0E0E0' },
  dismissalLabel: { fontSize: 14, fontWeight: '600', color: '#2D1520', marginBottom: 6 },
  scriptText: { fontSize: 13, color: '#5C3D4A', lineHeight: 20 },

  // GP brief
  gpBriefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 12 },
  gpBriefTitle: { fontSize: 18, fontWeight: '600', color: '#2D1520' },
  shareBtn: { backgroundColor: '#F0E0E0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  shareBtnText: { fontSize: 13, color: '#A8969F', fontWeight: '500' },

  gpCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: '#F0E0E0' },
  gpDocTitle: { fontSize: 15, fontWeight: '600', color: '#2D1520', marginBottom: 4 },
  gpDocSub: { fontSize: 13, color: '#A8969F', marginBottom: 16 },

  gpBlock: { backgroundColor: '#FFF5F5', borderRadius: 10, padding: 14, marginBottom: 10 },
  gpBlockLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: '#A8969F', marginBottom: 10 },
  gpBullet: { fontSize: 13, color: '#2D1520', lineHeight: 22 },
  gpBodyText: { fontSize: 13, color: '#2D1520', lineHeight: 20 },

  disclaimer: { marginTop: 8, padding: 12, backgroundColor: '#FFF0F0', borderRadius: 8 },
  disclaimerText: { fontSize: 12, color: '#A8969F', lineHeight: 18 },
});
