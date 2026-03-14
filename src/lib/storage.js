import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const KEYS = {
  ENTRY_INDEX: "flare:entry_index",
  PERIOD_STARTS: "flare:period_starts",
  ONBOARDING_DONE: "flare:onboarding_done",
};

// --- Entry index (lightweight records for dot matrix + cycle stats) ---

export async function getEntryIndex() {
  const raw = await AsyncStorage.getItem(KEYS.ENTRY_INDEX);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function appendEntryIndex(record) {
  const entries = await getEntryIndex();
  entries.push(record);
  await AsyncStorage.setItem(KEYS.ENTRY_INDEX, JSON.stringify(entries));
}

// --- Period tracking ---

export async function getPeriodStarts() {
  const raw = await AsyncStorage.getItem(KEYS.PERIOD_STARTS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addPeriodStart(dateStr) {
  const starts = await getPeriodStarts();
  if (!starts.includes(dateStr)) {
    starts.push(dateStr);
    starts.sort();
    await AsyncStorage.setItem(KEYS.PERIOD_STARTS, JSON.stringify(starts));
  }
}

// --- Onboarding ---

export async function getOnboardingDone() {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
  return val === "true";
}

export async function setOnboardingDone() {
  await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, "true");
}

// --- API keys (encrypted via SecureStore) ---

export async function getMoorchehKey() {
  return SecureStore.getItemAsync("flare_moorcheh_key");
}

export async function setMoorchehKey(key) {
  await SecureStore.setItemAsync("flare_moorcheh_key", key);
}

export async function getWorkerUrl() {
  return SecureStore.getItemAsync("flare_worker_url");
}

export async function setWorkerUrl(url) {
  await SecureStore.setItemAsync("flare_worker_url", url);
}

// --- Housekeeping ---

export async function clearAllData() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
  await SecureStore.deleteItemAsync("flare_moorcheh_key");
  await SecureStore.deleteItemAsync("flare_worker_url");
}

export async function exportData() {
  const entryIndex = await getEntryIndex();
  const periodStarts = await getPeriodStarts();
  return JSON.stringify({ entryIndex, periodStarts }, null, 2);
}
