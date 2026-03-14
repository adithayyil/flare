import { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  RefreshControl,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Settings } from 'lucide-react-native';
import { getEntryIndex, getPeriodStarts } from '../lib/storage';
import { groupByCycle, estimateCycleDay } from '../lib/cycles';

function severityColor(n) {
  if (n <= 3) return '#FBC4AB';
  if (n <= 6) return '#F4978E';
  if (n <= 9) return '#F08080';
  return '#D45D5D';
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [cycleDay, setCycleDay] = useState(null);
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [allEntries, periodStarts] = await Promise.all([
        getEntryIndex(),
        getPeriodStarts(),
      ]);
      setCycleDay(estimateCycleDay(periodStarts));
      // Sort newest first
      setEntries([...allEntries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F6' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#2D1520" />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View>
            <Text style={{ color: '#2D1520', fontSize: 22, fontWeight: '600' }}>flare</Text>
            {cycleDay && (
              <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 2 }}>
                Cycle day {cycleDay}
              </Text>
            )}
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
            marginHorizontal: 20,
            marginTop: 16,
            marginBottom: 24,
            paddingVertical: 20,
            paddingHorizontal: 20,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: '#F0E0E0',
          }}
        >
          <Text style={{ color: '#2D1520', fontSize: 15 }}>how are you feeling?</Text>
          <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 4 }}>tap to log</Text>
        </TouchableOpacity>

        {/* Entries */}
        {entries.length > 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: '#A8969F', fontSize: 11, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
              recent
            </Text>
            {entries.slice(0, 10).map((entry) => (
              <View
                key={entry.id}
                style={{
                  paddingVertical: 14,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: '#F0E0E0',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                }}
              >
                {/* Severity dot */}
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: severityColor(entry.severity),
                    marginTop: 6,
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#2D1520', fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
                    {entry.text}
                  </Text>
                  <Text style={{ color: '#A8969F', fontSize: 12, marginTop: 4 }}>
                    {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}
                    {entry.severity}/10
                    {entry.followUp?.answer ? ` · ${entry.followUp.answer}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: '#A8969F', fontSize: 14, textAlign: 'center' }}>
              no entries yet
            </Text>
            <Text style={{ color: '#A8969F', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              start tracking to see patterns
            </Text>
          </View>
        )}

        {/* Appointment prep */}
        {entries.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Prep')}
            style={{
              marginHorizontal: 20,
              marginTop: 8,
              paddingVertical: 16,
              paddingHorizontal: 20,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: '#F0E0E0',
            }}
          >
            <Text style={{ color: '#2D1520', fontSize: 15 }}>prepare for appointment</Text>
            <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 4 }}>generate clinical summary</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
