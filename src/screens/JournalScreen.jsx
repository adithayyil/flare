import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Mic } from 'lucide-react-native';
import InfoTip from '../components/InfoTip';
import { useNavigation } from '@react-navigation/native';
import { useJournalFlow } from '../hooks/useJournalFlow';
import BubbleQuestion from '../components/BubbleQuestion';
import BubbleReply from '../components/BubbleReply';
import BottomSheet from '../components/BottomSheet';
import { MANKOSKI_SCALE } from '../lib/severity';
import { transcribeAudio } from '../lib/whisper';

function severityColor(n) {
  if (n <= 3) return '#FBC4AB';
  if (n <= 6) return '#F4978E';
  if (n <= 9) return '#F08080';
  return '#D45D5D';
}

export default function JournalScreen() {
  const navigation = useNavigation();
  const {
    state,
    symptomText,
    severity,
    followUpQuestion,
    followUpOptions,
    followUpAnswer,
    savedEntry,
    journalAlert,
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

  const [micState, setMicState] = useState('idle'); // idle | recording | transcribing
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceFramesRef = useRef(0);
  const stopRef = useRef(null);

  const SILENCE_THRESHOLD = 3; // RMS level below which = silence
  const SILENCE_DURATION = 2000; // ms of silence before auto-stop
  const CHECK_INTERVAL = 100; // ms between silence checks

  // Pulsing animation for recording indicator
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    if (micState === 'recording') {
      pulseOpacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    } else {
      pulseOpacity.value = 1;
    }
  }, [micState]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  function startSilenceDetection(stream) {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = { audioCtx, analyser };

    const data = new Uint8Array(analyser.fftSize);
    silenceFramesRef.current = 0;
    const framesNeeded = SILENCE_DURATION / CHECK_INTERVAL;

    silenceTimerRef.current = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] - 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);

      console.log('rms:', rms.toFixed(1));
      if (rms < SILENCE_THRESHOLD) {
        silenceFramesRef.current++;
        if (silenceFramesRef.current >= framesNeeded) {
          stopRef.current?.();
        }
      } else {
        silenceFramesRef.current = 0;
      }
    }, CHECK_INTERVAL);
  }

  function cleanupSilenceDetection() {
    clearInterval(silenceTimerRef.current);
    analyserRef.current?.audioCtx.close();
    analyserRef.current = null;
    silenceFramesRef.current = 0;
  }

  async function startRecording() {
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.start();
        mediaRecorderRef.current = recorder;
        startSilenceDetection(stream);
      } else {
        const { Audio } = require('expo-av');
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        mediaRecorderRef.current = recording;
      }
      setMicState('recording');
    } catch (err) {
      console.warn('Mic access denied:', err);
    }
  }

  async function stopAndTranscribe() {
    cleanupSilenceDetection();
    setMicState('transcribing');
    try {
      let blob;
      if (Platform.OS === 'web') {
        const recorder = mediaRecorderRef.current;
        await new Promise((resolve) => { recorder.onstop = resolve; recorder.stop(); });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      } else {
        const recording = mediaRecorderRef.current;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        const response = await fetch(uri);
        blob = await response.blob();
      }

      const text = await transcribeAudio(blob);
      if (text) {
        setSymptomText((prev) => (prev ? prev + ' ' + text : text));
      }
    } catch (err) {
      console.warn('Transcription error:', err);
    } finally {
      mediaRecorderRef.current = null;
      setMicState('idle');
    }
  }

  // Keep stopRef in sync so silence detection can call it
  stopRef.current = stopAndTranscribe;

  function toggleMic() {
    if (micState === 'idle') startRecording();
    else if (micState === 'recording') stopAndTranscribe();
  }

  const showConversation = severity !== null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8F6' }}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt */}
        {!isSaved && <BubbleQuestion>what's going on?</BubbleQuestion>}

        {/* Text input */}
        {!isSaved && <View style={{
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
              paddingRight: 40,
            }}
          />

          {/* Mic button */}
          {!showConversation && !isSaved && (
            <TouchableOpacity
              onPress={toggleMic}
              disabled={micState === 'transcribing'}
              activeOpacity={0.7}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: micState === 'recording' ? '#F08080' : 'transparent',
              }}
            >
              {micState === 'recording' ? (
                <Animated.View style={pulseStyle}>
                  <Mic size={18} color="#FFFFFF" />
                </Animated.View>
              ) : micState === 'transcribing' ? (
                <Text style={{ color: '#A8969F', fontSize: 11 }}>...</Text>
              ) : (
                <Mic size={18} color="#A8969F" />
              )}
            </TouchableOpacity>
          )}

          {/* Recording label */}
          {micState === 'recording' && (
            <Animated.View entering={FadeIn.duration(200)} style={{
              position: 'absolute',
              bottom: 14,
              right: 52,
            }}>
              <Text style={{ color: '#F08080', fontSize: 12 }}>listening...</Text>
            </Animated.View>
          )}
        </View>}

        {/* Severity scale */}
        {symptomText.trim().length > 5 && severity === null && (
          <Animated.View entering={FadeIn.duration(200)}>
            <BubbleQuestion>how severe? tap a number.</BubbleQuestion>

            {/* Compact horizontal number row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
              {MANKOSKI_SCALE.filter(l => l.value > 0).map((level) => (
                <TouchableOpacity
                  key={level.value}
                  onPress={() => setSeverity(level.value)}
                  activeOpacity={0.6}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2, marginBottom: 24 }}>
              <Text style={{ color: '#A8969F', fontSize: 11 }}>mild</Text>
              <InfoTip title="severity scale (Mankoski)">
                <View style={{ gap: 6 }}>
                  {MANKOSKI_SCALE.filter(l => l.value > 0).map(l => (
                    <View key={l.value} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: severityColor(l.value),
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ color: '#2D1520', fontSize: 11, fontWeight: '600' }}>{l.value}</Text>
                      </View>
                      <Text style={{ color: '#2D1520', fontSize: 13 }}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </InfoTip>
              <Text style={{ color: '#A8969F', fontSize: 11 }}>severe</Text>
            </View>
          </Animated.View>
        )}

        {/* After severity is picked, show the conversation */}
        {showConversation && !isSaved && (
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

                {followUpOptions && followUpOptions.length > 0 && (
                  <View style={{ gap: 8, marginBottom: 12 }}>
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
                          backgroundColor: followUpAnswer === option ? '#F0E0E0' : '#FFFFFF',
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: '#F0E0E0',
                        }}
                      >
                        <Text style={{ color: '#2D1520', fontSize: 14 }}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TextInput
                  value={followUpAnswer}
                  onChangeText={setFollowUpAnswer}
                  placeholder={followUpOptions?.length > 0 ? 'or add your own...' : 'your answer...'}
                  placeholderTextColor="#A8969F"
                  multiline
                  style={{
                    color: '#2D1520',
                    fontSize: 15,
                    lineHeight: 22,
                    textAlignVertical: 'top',
                    minHeight: 44,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: '#F0E0E0',
                    paddingBottom: 12,
                    marginBottom: 12,
                  }}
                />

                <TouchableOpacity onPress={skipFollowUp} style={{ paddingVertical: 12 }}>
                  <Text style={{ color: '#A8969F', fontSize: 14, textDecorationLine: 'underline' }}>skip this question</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* Saved — full done screen */}
        {isSaved && savedEntry && (
          <Animated.View entering={FadeIn.duration(300)}>
            {/* Confirmation header */}
            <View style={{ paddingTop: 12, paddingBottom: 24 }}>
              <Text style={{ color: '#2D1520', fontSize: 20, fontWeight: '600', marginBottom: 4 }}>
                logged.
              </Text>
              <Text style={{ color: '#A8969F', fontSize: 13 }}>
                {new Date(savedEntry.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {savedEntry.cycleDay ? ` · cycle day ${savedEntry.cycleDay}` : ''}
              </Text>
            </View>

            {/* Entry summary card */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: '#F0E0E0',
              padding: 16,
              marginBottom: 12,
            }}>
              <Text style={{ color: '#2D1520', fontSize: 14, lineHeight: 21, marginBottom: 12 }}>
                {savedEntry.text}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: severityColor(savedEntry.severity),
                  marginRight: 8,
                }} />
                <Text style={{ color: '#7A6872', fontSize: 13 }}>
                  {savedEntry.severity}/10 — {MANKOSKI_SCALE.find(l => l.value === savedEntry.severity)?.label}
                </Text>
              </View>
              {savedEntry.followUp?.answer && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0E0E0' }}>
                  <Text style={{ color: '#A8969F', fontSize: 12, marginBottom: 4 }}>{savedEntry.followUp.question}</Text>
                  <Text style={{ color: '#2D1520', fontSize: 13 }}>{savedEntry.followUp.answer}</Text>
                </View>
              )}
            </View>

            {/* Pattern alert */}
            {journalAlert && (
              <Animated.View entering={FadeIn.duration(400)} style={{
                backgroundColor: '#FFF5F5',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#F0D0D0',
                padding: 16,
                marginBottom: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{
                    backgroundColor: '#F08080',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginRight: 8,
                  }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600', letterSpacing: 0.4 }}>
                      PATTERN FLAGGED
                    </Text>
                  </View>
                </View>
                <Text style={{ color: '#2D1520', fontSize: 14, lineHeight: 21 }}>
                  {journalAlert}
                </Text>
                <TouchableOpacity
                  onPress={() => { reset(); navigation.navigate('Prep'); }}
                  activeOpacity={0.7}
                  style={{ marginTop: 12 }}
                >
                  <Text style={{ color: '#A8969F', fontSize: 13 }}>
                    seeing your doctor soon?{' '}
                    <Text style={{ color: '#2D1520', fontWeight: '500' }}>prepare what to say</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Done button */}
            <TouchableOpacity
              onPress={reset}
              activeOpacity={0.8}
              style={{
                marginTop: 8,
                paddingVertical: 16,
                alignItems: 'center',
                backgroundColor: '#2D1520',
                borderRadius: 14,
              }}
            >
              <Text style={{ color: '#FFF8F6', fontSize: 15, fontWeight: '600' }}>done</Text>
            </TouchableOpacity>
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
    </SafeAreaView>
  );
}
