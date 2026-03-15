import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useEffect, useState } from "react";
import Constants from "expo-constants";
import TabNavigator from "./src/navigation/TabNavigator";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { initMoorcheh } from "./src/lib/moorcheh";
import { getMoorchehKey, getOnboardingDone } from "./src/lib/storage";

export default function App() {
  const [onboarded, setOnboarded] = useState(null); // null = loading

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
        setOnboarded(false);
      }
    }
    init();
  }, []);

  if (onboarded === null) {
    return <View style={{ flex: 1, backgroundColor: "#FFF8F6" }} />;
  }

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF8F6" }}>
        <StatusBar style="dark" backgroundColor="#FFF8F6" />
        <OnboardingScreen onDone={() => setOnboarded(true)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8F6" }}>
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor="#FFF8F6" />
        <TabNavigator />
      </NavigationContainer>
    </View>
  );
}
