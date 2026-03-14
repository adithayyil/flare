import { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { seedData } from '../lib/seedData';
import { clearAllData } from '../lib/storage';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleSeedData = async () => {
    setLoading(true);
    try {
      await seedData(false);
      Alert.alert('Done', 'Seeded 12 entries across 3 cycles');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear all data?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await clearAllData();
              Alert.alert('Cleared', 'All data deleted');
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F6' }}>
      <ScrollView>
        {/* Header with back */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }} activeOpacity={0.6}>
            <ChevronLeft size={22} color="#2D1520" strokeWidth={1.5} />
          </TouchableOpacity>
          <Text style={{ color: '#2D1520', fontSize: 17, fontWeight: '600', marginLeft: 4 }}>settings</Text>
        </View>

        {/* Dev section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ color: '#A8969F', fontSize: 11, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
            development
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSeedData}
            disabled={loading}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: '#F0E0E0',
              marginBottom: 8,
            }}
          >
            <Text style={{ color: '#2D1520', fontSize: 15 }}>seed test data</Text>
            <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 2 }}>12 sample entries</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClearData}
            disabled={loading}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: '#F0E0E0',
            }}
          >
            <Text style={{ color: '#F08080', fontSize: 15 }}>clear all data</Text>
            <Text style={{ color: '#A8969F', fontSize: 13, marginTop: 2 }}>delete everything</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ color: '#A8969F', fontSize: 11 }}>flare v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
