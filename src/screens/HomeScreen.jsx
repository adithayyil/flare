import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  RefreshControl,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Settings, ChevronRight } from 'lucide-react-native';
import { getEntryIndex, getPeriodStarts, getPeriodEnds, addPeriodStart, addPeriodEnd } from '../lib/storage';
import { groupByCycle, estimateCycleDay, getCurrentPeriodStatus } from '../lib/cycles';
import { detectPattern } from '../lib/patternAlert';

const PX = 20;

function severityColor(n) {
  if (n <= 3) return '#FBC4AB';
  if (n <= 6) return '#F4978E';
  if (n <= 9) return '#F08080';
  return '#D45D5D';
}

const MISSED_KEYWORDS = ['missed', 'cancel', 'stayed home', 'stayed in bed', "couldn't", 'called in sick', 'couldn\'t make'];

function computeCycleStats(cycle, isCurrentCycle) {
  const { entries, startDate } = cycle;
  const month = new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long' });
  const severeDays = entries.filter(e => e.severity >= 7).length;
  const missedDays = entries.filter(e => {
    const answer = (e.followUp?.answer || '').toLowerCase();
    return MISSED_KEYWORDS.some(kw => answer.includes(kw));
  }).length;
  const hasMidCyclePain = entries.some(e => e.cycleDay != null && e.cycleDay >= 8 && e.severity >= 4);

  return { month, severeDays, missedDays, hasMidCyclePain, entryCount: entries.length, startDate, isCurrentCycle };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'good morning';
  if (h < 17) return 'good afternoon';
  return 'good evening';
}

function CycleCard({ stats }) {
  const { month, severeDays, missedDays, hasMidCyclePain, isCurrentCycle } = stats;
  const accent = isCurrentCycle ? '#F08080' : '#2D1520';

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 14,
      marginRight: 12,
      width: 180,
      borderWidth: isCurrentCycle ? 1 : 0.5,
      borderColor: isCurrentCycle ? '#F0D0D0' : '#F0E0E0',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ color: '#2D1520', fontSize: 13, fontWeight: '600' }}>{month}</Text>
        {isCurrentCycle && (
          <View style={{ marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#FFF1ED', borderRadius: 4 }}>
            <Text style={{ color: '#F08080', fontSize: 10, fontWeight: '600' }}>Current</Text>
          </View>
        )}
      </View>

      {/* Dot matrix */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: 12 }}>
        {stats.dots.map((dot, i) => (
          <View key={i} style={{
            width: 7, height: 7, borderRadius: 3.5,
            backgroundColor: dot.color,
          }} />
        ))}
      </View>

      {/* Stats */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#A8969F', fontSize: 11 }}>Severe days</Text>
          <Text style={{ color: accent, fontSize: 11, fontWeight: '600' }}>
            {severeDays}{isCurrentCycle ? ' so far' : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#A8969F', fontSize: 11 }}>Missed activity</Text>
          <Text style={{ color: accent, fontSize: 11, fontWeight: '600' }}>
            {missedDays > 0 ? `${missedDays} day${missedDays > 1 ? 's' : ''}` : (isCurrentCycle ? 'None yet' : 'None')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#A8969F', fontSize: 11 }}>Mid-cycle pain</Text>
          <Text style={{ color: accent, fontSize: 11, fontWeight: '600' }}>
            {hasMidCyclePain ? 'Yes' : (isCurrentCycle ? 'Not yet logged' : 'No')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function buildDots(entries) {
  // One dot per entry, colored by severity. Gray dots for gaps.
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const dots = [];
  let lastDay = 0;
  for (const entry of sorted) {
    const day = entry.cycleDay || 0;
    // Fill gray dots for gap days
    for (let d = lastDay + 1; d < day; d++) {
      dots.push({ color: '#E8E0E4' });
    }
    dots.push({ color: severityColor(entry.severity) });
    lastDay = day;
  }
  return dots;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [cycleDay, setCycleDay] = useState(null);
  const [periodStatus, setPeriodStatus] = useState({ active: false, startDate: null });
  const [entries, setEntries] = useState([]);
  const [periodStarts, setPeriodStarts] = useState([]);
  const [pattern, setPattern] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allEntries, starts, periodEnds] = await Promise.all([
        getEntryIndex(),
        getPeriodStarts(),
        getPeriodEnds(),
      ]);
      setCycleDay(estimateCycleDay(starts));
      setPeriodStatus(getCurrentPeriodStatus(starts, periodEnds));
      setPeriodStarts(starts);
      setEntries(allEntries);
      setPattern(detectPattern(allEntries, starts));
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const cycleGroups = useMemo(() => {
    const groups = groupByCycle(entries, periodStarts);
    return groups.map((cycle, i) => {
      const stats = computeCycleStats(cycle, i === 0);
      stats.dots = buildDots(cycle.entries);
      return stats;
    });
  }, [entries, periodStarts]);

  const dateRange = useMemo(() => {
    if (cycleGroups.length === 0) return '';
    const months = cycleGroups.map(c => c.month);
    const first = months[months.length - 1];
    const last = months[0];
    return first === last ? first : `${first} \u2013 ${last}`;
  }, [cycleGroups]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F6' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#2D1520" />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: PX, paddingTop: 16, paddingBottom: 4 }}>
          <View>
            <Text style={{ color: '#2D1520', fontSize: 22, fontWeight: '600' }}>❉ flare</Text>
            {cycleDay && (
              <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 2 }}>
                cycle day {cycleDay}
                {periodStatus.active && periodStatus.startDate
                  ? (() => {
                      const days = Math.floor((new Date(new Date().toLocaleDateString('en-CA')) - new Date(periodStatus.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                      return Number.isFinite(days) && days > 0 ? ` · period day ${days}` : '';
                    })()
                  : ''}
              </Text>
            )}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={async () => {
                if (periodStatus.active) {
                  const confirmed = Platform.OS === 'web'
                    ? window.confirm('mark today as period ended?')
                    : await new Promise((resolve) =>
                        Alert.alert(
                          'period ended?',
                          'mark today as the last day of this period?',
                          [
                            { text: 'cancel', onPress: () => resolve(false), style: 'cancel' },
                            { text: 'yes', onPress: () => resolve(true) },
                          ],
                        ),
                      );
                  if (confirmed) {
                    const todayISO = new Date().toLocaleDateString('en-CA');
                    await addPeriodEnd(todayISO);
                    loadData();
                  }
                } else {
                  const confirmed = Platform.OS === 'web'
                    ? window.confirm('mark today as a new period start?')
                    : await new Promise((resolve) =>
                        Alert.alert(
                          'period started?',
                          'mark today as a new period start?',
                          [
                            { text: 'cancel', onPress: () => resolve(false), style: 'cancel' },
                            { text: 'yes', onPress: () => resolve(true) },
                          ],
                        ),
                      );
                  if (confirmed) {
                    const todayISO = new Date().toLocaleDateString('en-CA');
                    await addPeriodStart(todayISO);
                    loadData();
                  }
                }
              }}
              style={{
                marginTop: 6,
                alignSelf: 'flex-start',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: periodStatus.active ? '#F08080' : '#DCC8C8',
                backgroundColor: periodStatus.active ? '#FFF1ED' : 'transparent',
              }}
            >
              <Text style={{ color: periodStatus.active ? '#F08080' : '#A8969F', fontSize: 12, fontWeight: '500' }}>
                {periodStatus.active ? 'period ended?' : 'period started?'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ padding: 8 }}
            activeOpacity={0.6}
          >
            <Settings size={20} color="#A8969F" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Log prompt */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Journal')}
          style={{
            marginHorizontal: PX,
            marginTop: 20,
            paddingVertical: 22,
            paddingHorizontal: 20,
            backgroundColor: '#FFF1ED',
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#2D1520', fontSize: 16 }}>
              {getGreeting()} {'\u2013'} how are you doing?
            </Text>
            <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 5 }}>
              take a moment to check in
            </Text>
          </View>
          <ChevronRight size={16} color="#A8969F" strokeWidth={1.5} />
        </TouchableOpacity>

        {/* Cycle dashboard */}
        {cycleGroups.length > 0 ? (
          <View style={{ marginTop: 28 }}>
            {/* Dashboard header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: PX, marginBottom: 14 }}>
              <View>
                <Text style={{ color: '#2D1520', fontSize: 16, fontWeight: '600' }}>
                  {cycleGroups.length} cycle{cycleGroups.length > 1 ? 's' : ''} logged
                </Text>
                <Text style={{ color: '#A8969F', fontSize: 12, marginTop: 2 }}>
                  {dateRange}
                </Text>
              </View>
              {pattern && (
                <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#FFF5F5', borderRadius: 6, borderWidth: 0.5, borderColor: '#F0D0D0' }}>
                  <Text style={{ color: '#F08080', fontSize: 11, fontWeight: '600' }}>
                    {pattern.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Cycle cards - horizontal scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: PX }}
            >
              {cycleGroups.map((stats, i) => (
                <CycleCard key={stats.startDate} stats={stats} />
              ))}
            </ScrollView>

            {/* Pattern detail */}
            {pattern && (
              <View style={{
                marginHorizontal: PX,
                marginTop: 16,
                backgroundColor: '#FFF5F5',
                borderRadius: 12,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: '#F0D0D0',
                padding: 14,
              }}>
                <Text style={{ color: '#2D1520', fontSize: 14, lineHeight: 20 }}>
                  {pattern.message}
                </Text>
              </View>
            )}

            {/* Appointment prep link */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => navigation.navigate('Prep')}
              style={{ paddingHorizontal: PX, marginTop: 20, paddingVertical: 8 }}
            >
              <Text style={{ color: '#A8969F', fontSize: 13 }}>
                seeing your doctor soon?{' '}
                <Text style={{ color: '#2D1520', fontWeight: '500' }}>prepare what to say</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{
            marginHorizontal: PX,
            marginTop: 28,
            backgroundColor: '#FFF1ED',
            borderRadius: 16,
            padding: 24,
            alignItems: 'center',
          }}>
            <Text style={{ color: '#2D1520', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 6 }}>
              welcome to flare
            </Text>
            <Text style={{ color: '#A8969F', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
              start logging symptoms to uncover patterns across your cycles
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Journal')}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#2D1520',
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ color: '#FFF8F6', fontSize: 14, fontWeight: '600' }}>log your first entry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
