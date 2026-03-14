import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';

/**
 * Expandable dismissal response script
 */
export default function AdvocateScript({ scenario, script }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: '#F0E0E0',
        backgroundColor: '#FFFFFF',
        padding: 16,
      }}
    >
      <Text style={{ color: '#2D1520', fontSize: 14, fontWeight: '500' }}>
        {scenario}
      </Text>
      {expanded && (
        <Text style={{ color: '#2D1520', fontSize: 14, lineHeight: 22, marginTop: 10 }}>
          {script}
        </Text>
      )}
      <Text style={{ color: '#A8969F', fontSize: 12, marginTop: 8 }}>
        {expanded ? 'Tap to collapse' : 'Tap to read'}
      </Text>
    </TouchableOpacity>
  );
}
