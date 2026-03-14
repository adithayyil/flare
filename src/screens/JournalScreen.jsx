import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useJournalFlow } from '../hooks/useJournalFlow';
import BubbleQuestion from '../components/BubbleQuestion';
import BubbleReply from '../components/BubbleReply';
import BottomSheet from '../components/BottomSheet';
import { MANKOSKI_SCALE } from '../lib/severity';

function severityColor(n) {
  if (n <= 3) return '#FBC4AB';
  if (n <= 6) return '#F4978E';
  if (n <= 9) return '#F08080';
  return '#D45D5D';
}

export default function JournalScreen() {
  const {
    state,
    symptomText,
    severity,
    followUpQuestion,
    followUpOptions,
    followUpAnswer,
    setSymptomText,
    setSeverity,
    setFollowUpAnswer,
    skipFollowUp,
    answerFollowUp,
    confirmEntry,
    editEntry,
    reset,
    isIdle,
    isLoadingFollowUp,
    isFollowUp,
    isConfirm,
    isSaved,
  } = useJournalFlow();

  const showSeverity = symptomText.trim().length > 5 && severity === null;
  const showConversation = severity !== null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg"
      keyboardVerticalOffset={90}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt */}
        <BubbleQuestion>what's going on?</BubbleQuestion>

        {/* Text input */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: showConversation ? '#F0E0E0' : '#DCC8C8',
          paddingHorizontal: 16,
          paddingVertical: 14,
          marginBottom: 24,
        }}>
          <TextInput
            value={symptomText}
            onChangeText={setSymptomText}
            placeholder="describe what you're feeling..."
            placeholderTextColor="#C4B0B8"
            multiline
            autoFocus
            editable={!showConversation && !isSaved}
            style={{
              color: '#2D1520',
              fontSize: 15,
              lineHeight: 24,
              textAlignVertical: 'top',
              minHeight: 100,
            }}
          />
        </View>

        {/* Severity scale */}
        {showSeverity && (
          <Animated.View entering={FadeIn.duration(200)}>
            <BubbleQuestion>how severe? tap a number.</BubbleQuestion>

            {/* Compact horizontal number row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              {MANKOSKI_SCALE.filter(l => l.value > 0).map((level) => (
                <TouchableOpacity
                  key={level.value}
                  onPress={() => setSeverity(level.value)}
                  activeOpacity={0.6}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: severityColor(level.value),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#2D1520', fontSize: 13, fontWeight: '600' }}>
                    {level.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scale labels */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 24 }}>
              <Text style={{ color: '#A8969F', fontSize: 11 }}>mild</Text>
              <Text style={{ color: '#A8969F', fontSize: 11 }}>severe</Text>
            </View>
          </Animated.View>
        )}

        {/* After severity is picked, show the conversation */}
        {showConversation && (
          <Animated.View entering={FadeIn.duration(200)}>
            {/* Severity confirmation */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: severityColor(severity),
                  marginRight: 8,
                }}
              />
              <Text style={{ color: '#2D1520', fontSize: 14 }}>
                {severity}/10 — {MANKOSKI_SCALE.find((l) => l.value === severity)?.label}
              </Text>
            </View>

            {/* Loading */}
            {isLoadingFollowUp && (
              <Text style={{ color: '#C4B0B8', fontSize: 13, marginBottom: 20 }}>...</Text>
            )}

            {/* Follow-up question */}
            {isFollowUp && (
              <Animated.View entering={FadeIn.duration(200)}>
                <BubbleQuestion>{followUpQuestion}</BubbleQuestion>

                {followUpOptions && followUpOptions.length > 0 ? (
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    {followUpOptions.map((option, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => {
                          setFollowUpAnswer(option);
                          answerFollowUp();
                        }}
                        activeOpacity={0.7}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          backgroundColor: '#FFFFFF',
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: '#F0E0E0',
                        }}
                      >
                        <Text style={{ color: '#2D1520', fontSize: 14 }}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TextInput
                    value={followUpAnswer}
                    onChangeText={setFollowUpAnswer}
                    placeholder="your answer..."
                    placeholderTextColor="#A8969F"
                    multiline
                    autoFocus
                    style={{
                      color: '#2D1520',
                      fontSize: 15,
                      lineHeight: 22,
                      textAlignVertical: 'top',
                      minHeight: 50,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: '#F0E0E0',
                      paddingBottom: 12,
                      marginBottom: 12,
                    }}
                  />
                )}

                <TouchableOpacity onPress={skipFollowUp} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: '#A8969F', fontSize: 13 }}>skip</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* Saved confirmation */}
        {isSaved && (
          <Animated.View entering={FadeIn.duration(200)} style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={{ color: '#2D1520', fontSize: 15 }}>saved.</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom sheet confirmation */}
      <BottomSheet visible={isConfirm} onDismiss={editEntry} title="save this entry?">
        {/* Summary */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: '#2D1520', fontSize: 15, lineHeight: 22, marginBottom: 12 }}>
            {symptomText}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: severityColor(severity),
                marginRight: 8,
              }}
            />
            <Text style={{ color: '#7A6872', fontSize: 13 }}>
              {severity}/10 — {MANKOSKI_SCALE.find((l) => l.value === severity)?.label}
            </Text>
          </View>

          {followUpQuestion && followUpAnswer && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#F0E0E0' }}>
              <Text style={{ color: '#A8969F', fontSize: 12, marginBottom: 4 }}>
                {followUpQuestion}
              </Text>
              <Text style={{ color: '#2D1520', fontSize: 14 }}>{followUpAnswer}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={editEntry}
            activeOpacity={0.7}
            style={{ flex: 1, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#A8969F', fontSize: 14 }}>edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={confirmEntry}
            activeOpacity={0.8}
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: '#2D1520',
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#FFF8F6', fontSize: 14, fontWeight: '600' }}>save</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}
