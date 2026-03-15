import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useEffect } from "react";
import Constants from "expo-constants";
import TabNavigator from "./src/navigation/TabNavigator";
import { initMoorcheh } from "./src/lib/moorcheh";
import { getMoorchehKey } from "./src/lib/storage";
import { seedData } from './src/lib/seedData'; // inside init(), after initMoorcheh(apiKey):

export default function App() {
  useEffect(() => {
    async function init() {
      try {
        let apiKey = await getMoorchehKey();
        if (!apiKey) {
          apiKey = Constants.expoConfig?.extra?.moorchehApiKey || process.env.MOORCHEH_API_KEY;
        }
        if (apiKey && apiKey !== 'your-moorcheh-api-key-here') {
          initMoorcheh(apiKey);
          await seedData(true); // seeds local index + uploads to Moorcheh
        }
      } catch (error) {
        console.error('Failed to initialize Moorcheh:', error);
      }
    
    }
    init();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8F6" }}>
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor="#FFF8F6" />
        <TabNavigator />
      </NavigationContainer>
    </View>
  );
}
