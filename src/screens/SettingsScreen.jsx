import { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Alert, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { reseedData } from '../lib/seedData';
import { clearAllData } from '../lib/storage';
import { clearPatientEntries } from '../lib/moorcheh';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleSeedData = async (variant) => {
    setLoading(true);
    try {
      await reseedData(variant, true);
      const labels = { none: 'No pattern', mild: 'Mild', moderate: 'Moderate', severe: 'Severe (constellation)' };
      Alert.alert('Done', `Loaded: ${labels[variant]}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Clear all data? This cannot be undone.')
      : await new Promise((resolve) =>
          Alert.alert(
            'Clear all data?',
            'This cannot be undone.',
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Clear', onPress: () => resolve(true), style: 'destructive' },
            ],
          ),
        );
    if (confirmed) {
      setLoading(true);
      try {
        await Promise.all([
          clearAllData(),
          clearPatientEntries().catch((err) =>
            console.warn('Moorcheh clear failed (non-critical):', err.message)
          ),
        ]);
        if (Platform.OS === 'web') window.alert('All data deleted');
        else Alert.alert('Cleared', 'All data deleted');
      } catch (error) {
        if (Platform.OS === 'web') window.alert(error.message);
        else Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F6' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header with back */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 4 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }} activeOpacity={0.6}>
            <ChevronLeft size={22} color="#2D1520" strokeWidth={1.5} />
          </TouchableOpacity>
          <Text style={{ color: '#2D1520', fontSize: 17, fontWeight: '600', marginLeft: 4 }}>settings</Text>
        </View>

        {/* Dev section */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ color: '#A8969F', fontSize: 11, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
            development
          </Text>
          <Text style={{ color: '#A8969F', fontSize: 12, marginBottom: 16 }}>
            loading a dataset clears existing data first
          </Text>

          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: '#F0E0E0',
            overflow: 'hidden',
          }}>
            {[
              { variant: 'none',     label: 'no pattern',   sub: '2 cycles · severity 1–4' },
              { variant: 'mild',     label: 'mild',         sub: '2 cycles · borderline pain' },
              { variant: 'moderate', label: 'moderate',     sub: '3 cycles · dysmenorrhea flagged' },
              { variant: 'severe',   label: 'severe',       sub: '3 cycles · full constellation' },
            ].map(({ variant, label, sub }, i, arr) => (
              <View key={variant}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSeedData(variant)}
                  disabled={loading}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  <View>
                    <Text style={{ color: '#2D1520', fontSize: 15 }}>load {label} data</Text>
                    <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 2 }}>{sub}</Text>
                  </View>
                  {loading && <ActivityIndicator size="small" color="#A8969F" />}
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#F0E0E0', marginHorizontal: 16 }} />}
              </View>
            ))}

            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#F0E0E0', marginHorizontal: 16 }} />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClearData}
              disabled={loading}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <View>
                <Text style={{ color: '#F08080', fontSize: 15 }}>clear all data</Text>
                <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 2 }}>delete everything</Text>
              </View>
              {loading && <ActivityIndicator size="small" color="#A8969F" />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ color: '#A8969F', fontSize: 11 }}>flare v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
