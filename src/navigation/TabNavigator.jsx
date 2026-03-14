import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home, PenLine, ClipboardList, Settings } from "lucide-react-native";

import HomeScreen from "../screens/HomeScreen";
import JournalScreen from "../screens/JournalScreen";
import PrepScreen from "../screens/PrepScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: "Settings" }}
      />
    </HomeStack.Navigator>
  );
}

const TAB_ICONS = {
  Home: Home,
  Journal: PenLine,
  Prep: ClipboardList,
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const Icon = TAB_ICONS[route.name];
          return <Icon size={size} color={color} />;
        },
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{ tabBarLabel: "Log" }}
      />
      <Tab.Screen
        name="Prep"
        component={PrepScreen}
        options={{ tabBarLabel: "Appointment" }}
      />
    </Tab.Navigator>
  );
}
