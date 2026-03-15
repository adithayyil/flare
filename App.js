import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useState, useEffect } from "react";
import Constants from "expo-constants";
import TabNavigator from "./src/navigation/TabNavigator";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { initMoorcheh } from "./src/lib/moorcheh";
import { getMoorchehKey, getOnboardingDone } from "./src/lib/storage";

export default function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const done = await getOnboardingDone();
        setOnboarded(done);

        let apiKey = await getMoorchehKey();
        if (!apiKey) {
          apiKey = Constants.expoConfig?.extra?.moorchehApiKey || process.env.MOORCHEH_API_KEY;
        }
        if (apiKey && apiKey !== 'your-moorcheh-api-key-here') {
          initMoorcheh(apiKey);
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setReady(true);
      }
    }
    init();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: "#FFF8F6" }} />;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8F6" }}>
      {onboarded ? (
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor="#FFF8F6" />
          <TabNavigator />
        </NavigationContainer>
      ) : (
        <OnboardingScreen onDone={() => setOnboarded(true)} />
      )}
    </View>
  );
}
