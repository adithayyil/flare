import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home, PenLine, ClipboardList } from "lucide-react-native";

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
        options={{ headerShown: false }}
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
          return <Icon size={20} color={color} strokeWidth={1.5} />;
        },
        tabBarActiveTintColor: "#2D1520",
        tabBarInactiveTintColor: "#A8969F",
        tabBarStyle: {
          backgroundColor: "#FFF8F6",
          borderTopColor: "#F0E0E0",
          borderTopWidth: 0.5,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 6,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          letterSpacing: 0.3,
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
        options={{ tabBarLabel: "Prep" }}
      />
    </Tab.Navigator>
  );
}
