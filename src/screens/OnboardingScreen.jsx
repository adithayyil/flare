import { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { addPeriodStart, setOnboardingDone } from '../lib/storage';

const isWeb = Platform.OS === 'web';

// Only import native picker on non-web platforms
let DateTimePicker = null;
if (!isWeb) {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function OnboardingScreen({ onDone }) {
  const today = new Date();
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const toDateStr = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD

  const [selectedDate, setSelectedDate] = useState(today);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const handleContinue = async () => {
    const dateStr = toDateStr(selectedDate);
    await addPeriodStart(dateStr);
    await setOnboardingDone();
    onDone();
  };

  const handleSkip = async () => {
    await setOnboardingDone();
    onDone();
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F6' }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ color: '#2D1520', fontSize: 28, fontWeight: '600' }}>
          ❉ flare
        </Text>
        <Text style={{ color: '#A8969F', fontSize: 15, marginTop: 8, lineHeight: 22 }}>
          a quiet space to track how you're feeling; your pain, your patterns, your cycle.
        </Text>

        <Text style={{ color: '#2D1520', fontSize: 16, marginTop: 40, marginBottom: 12 }}>
          when did your last period start?
        </Text>

        {isWeb && (
          <input
            type="date"
            value={toDateStr(selectedDate)}
            max={toDateStr(today)}
            min={toDateStr(sixtyDaysAgo)}
            onChange={(e) => {
              const d = new Date(e.target.value + 'T12:00:00');
              if (!isNaN(d)) setSelectedDate(d);
            }}
            style={{
              backgroundColor: '#FFF1ED',
              border: 'none',
              borderRadius: 12,
              padding: '14px 16px',
              fontSize: 15,
              color: '#2D1520',
              fontFamily: 'inherit',
              alignSelf: 'flex-start',
            }}
          />
        )}

        {Platform.OS === 'android' && (
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{
              backgroundColor: '#FFF1ED',
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: '#2D1520', fontSize: 15 }}>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
        )}

        {!isWeb && showPicker && DateTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={today}
            minimumDate={sixtyDaysAgo}
            onChange={onDateChange}
            textColor="#2D1520"
            style={{ alignSelf: 'flex-start' }}
          />
        )}

        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.7}
          style={{
            backgroundColor: '#2D1520',
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 36,
          }}
        >
          <Text style={{ color: '#FFF8F6', fontSize: 15, fontWeight: '500' }}>
            continue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.6}
          style={{ alignItems: 'center', marginTop: 16, paddingVertical: 8 }}
        >
          <Text style={{ color: '#A8969F', fontSize: 14 }}>
            i'm not sure — skip
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
