import { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  RefreshControl,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Settings } from 'lucide-react-native';
import { getEntryIndex, getPeriodStarts, addPeriodStart } from '../lib/storage';
import { groupByCycle, estimateCycleDay } from '../lib/cycles';
import { detectPattern } from '../lib/patternAlert';

const PX = 20; // consistent horizontal padding

function severityColor(n) {
  if (n <= 3) return '#FBC4AB';
  if (n <= 6) return '#F4978E';
  if (n <= 9) return '#F08080';
  return '#D45D5D';
}

/** Group entries by calendar date (YYYY-MM-DD), newest date first. */
function groupByDate(entries) {
  const sorted = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const groups = [];
  let current = null;

  for (const entry of sorted) {
    const dateKey = new Date(entry.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (!current || current.dateKey !== dateKey) {
      current = { dateKey, entries: [] };
      groups.push(current);
    }
    current.entries.push(entry);
  }
  return groups;
}

function formatDateLabel(dateKey) {
  const d = new Date(dateKey + 'T12:00:00');
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  const yesterday = new Date(now - 86400000).toLocaleDateString('en-CA');

  if (dateKey === today) return 'today';
  if (dateKey === yesterday) return 'yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'good morning';
  if (h < 17) return 'good afternoon';
  return 'good evening';
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [cycleDay, setCycleDay] = useState(null);
  const [periodStatus, setPeriodStatus] = useState({ active: false, startDate: null });
  const [entries, setEntries] = useState([]);
  const [pattern, setPattern] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [allEntries, periodStarts, periodEnds] = await Promise.all([
        getEntryIndex(),
        getPeriodStarts(),
        getPeriodEnds(),
      ]);
      setCycleDay(estimateCycleDay(periodStarts));
      setPeriodStatus(getCurrentPeriodStatus(periodStarts, periodEnds));
      setEntries(allEntries);
      setPattern(detectPattern(allEntries, periodStarts));
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  const dateGroups = groupByDate(entries).slice(0, 5); // last 5 days max

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
                  ? ` · period day ${Math.floor((new Date(new Date().toLocaleDateString('en-CA')) - new Date(periodStatus.startDate)) / (1000 * 60 * 60 * 24)) + 1}`
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
              style={{ marginTop: 4 }}
            >
              <Text style={{ color: '#A8969F', fontSize: 12 }}>
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
          }}
        >
          <Text style={{ color: '#2D1520', fontSize: 16 }}>
            {getGreeting()} — how are you doing?
          </Text>
          <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 5 }}>
            take a moment to check in
          </Text>
        </TouchableOpacity>

        {/* Pattern alert card */}
        {pattern && (
          <View style={{
            marginHorizontal: PX,
            marginTop: 12,
            padding: 16,
            backgroundColor: '#FFF5F5',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#F0D0D0',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                backgroundColor: '#F08080',
                borderRadius: 6,
                marginRight: 8,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600', letterSpacing: 0.4 }}>
                  {pattern.label.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={{ color: '#2D1520', fontSize: 14, lineHeight: 20 }}>
              {pattern.message}
            </Text>
          </View>
        )}

        {/* Recent entries grouped by date */}
        {dateGroups.length > 0 ? (
          <View style={{ paddingHorizontal: PX, marginTop: 28 }}>
            <Text style={{ color: '#A8969F', fontSize: 11, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>
              recent
            </Text>

            {dateGroups.map((group, gi) => (
              <View key={group.dateKey} style={gi > 0 ? { marginTop: 16 } : undefined}>
                {/* Date label */}
                <Text style={{ color: '#A8969F', fontSize: 12, marginBottom: 6 }}>
                  {formatDateLabel(group.dateKey)}
                </Text>

                {/* Entries for that day — flat rows */}
                {group.entries.map((entry) => (
                  <View
                    key={entry.id}
                    style={{
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: severityColor(entry.severity),
                        marginTop: 5,
                        marginRight: 10,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#2D1520', fontSize: 14, lineHeight: 19 }} numberOfLines={2}>
                        {entry.text}
                      </Text>
                      <Text style={{ color: '#A8969F', fontSize: 12, marginTop: 3 }}>
                        {entry.severity}/10
                        {entry.followUp?.answer ? ` · ${entry.followUp.answer}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {/* Appointment prep — inline link, not a card */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => navigation.navigate('Prep')}
              style={{ marginTop: 24, paddingVertical: 8 }}
            >
              <Text style={{ color: '#A8969F', fontSize: 13 }}>
                seeing your doctor soon?{' '}
                <Text style={{ color: '#2D1520', fontWeight: '500' }}>prepare what to say</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: PX, paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: '#A8969F', fontSize: 14, textAlign: 'center' }}>
              no entries yet
            </Text>
            <Text style={{ color: '#A8969F', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              start tracking to see patterns
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
