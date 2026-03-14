import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import TabNavigator from "./src/navigation/TabNavigator";

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <TabNavigator />
    </NavigationContainer>
  );
}
