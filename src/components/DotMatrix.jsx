import { View, Text, StyleSheet } from 'react-native';
import { severityColor } from '../lib/severity';

/**
 * Cycle dot matrix - minimal dots-only visualization
 */
export default function DotMatrix({ cycles, maxCycles = 3 }) {
  if (!cycles || cycles.length === 0) return null;

  return (
    <View>
      {cycles.slice(0, maxCycles).map((cycle, i) => (
        <View
          key={i}
          style={{
            paddingVertical: 16,
            borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
            borderColor: '#F0E0E0',
          }}
        >
          {/* Cycle header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#2D1520', fontSize: 13, fontWeight: '500' }}>
              {i === 0 ? 'Current cycle' : cycle.startDate}
            </Text>
            <Text style={{ color: '#A8969F', fontSize: 12 }}>
              {cycle.entries.length} {cycle.entries.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>

          {/* Dot grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cycle.entries.map((entry, j) => (
              <View
                key={j}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: severityColor(entry.severity),
                }}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
