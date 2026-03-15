import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const KEYS = {
  ENTRY_INDEX: "flare:entry_index",
  PERIOD_STARTS: "flare:period_starts",
  PERIOD_ENDS: "flare:period_ends",
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

export async function getPeriodEnds() {
  const raw = await AsyncStorage.getItem(KEYS.PERIOD_ENDS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addPeriodEnd(dateStr) {
  const ends = await getPeriodEnds();
  if (!ends.includes(dateStr)) {
    ends.push(dateStr);
    ends.sort();
    await AsyncStorage.setItem(KEYS.PERIOD_ENDS, JSON.stringify(ends));
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

// --- API keys (encrypted via SecureStore on native, AsyncStorage on web) ---

import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

export async function getMoorchehKey() {
  if (isWeb) {
    return AsyncStorage.getItem("flare_moorcheh_key");
  }
  return SecureStore.getItemAsync("flare_moorcheh_key");
}

export async function setMoorchehKey(key) {
  if (isWeb) {
    await AsyncStorage.setItem("flare_moorcheh_key", key);
  } else {
    await SecureStore.setItemAsync("flare_moorcheh_key", key);
  }
}

export async function getWorkerUrl() {
  if (isWeb) {
    return AsyncStorage.getItem("flare_worker_url");
  }
  return SecureStore.getItemAsync("flare_worker_url");
}

export async function setWorkerUrl(url) {
  if (isWeb) {
    await AsyncStorage.setItem("flare_worker_url", url);
  } else {
    await SecureStore.setItemAsync("flare_worker_url", url);
  }
}

// --- Housekeeping ---

export async function clearAllData() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
  if (isWeb) {
    await AsyncStorage.removeItem("flare_moorcheh_key");
    await AsyncStorage.removeItem("flare_worker_url");
  } else {
    await SecureStore.deleteItemAsync("flare_moorcheh_key");
    await SecureStore.deleteItemAsync("flare_worker_url");
  }
}

export async function exportData() {
  const entryIndex = await getEntryIndex();
  const periodStarts = await getPeriodStarts();
  const periodEnds = await getPeriodEnds();
  return JSON.stringify({ entryIndex, periodStarts, periodEnds }, null, 2);
}
