import { Slot } from "expo-router";
import { Dimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/context/auth-provider";
import React, { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/themes/theme-context";
import { useTheme } from "@/hooks/use-theme";
import { QueryProvider } from "@/providers/query-provider";

function RootLayoutNav() {
  const { onLayoutRootView } = useAuth();
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const updateLayout = () => setIsMobile(Dimensions.get("window").width < 768);
    updateLayout();
    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} hidden={!isMobile} />
      <Slot />
    </View>
  );
}

export default function AppLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

// import { ThemeProvider } from "@/components/themes/theme-context";
// import { useTheme } from "@/hooks/use-theme";
// import { Ionicons } from "@expo/vector-icons";
// import { Tabs } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import React from "react";

// export default function AppLayout() {
//   return (
//     <ThemeProvider>
//       <AppContent />
//     </ThemeProvider>
//   );
// }

// function AppContent() {
//   const { theme } = useTheme();

//   return (
//     <>
//       <StatusBar style={theme === "dark" ? "light" : "dark"} />
//       <TabsWithTheme />
//     </>
//   );
// }

// function TabsWithTheme() {
//   const { colors, theme } = useTheme();

//   return (
//     <Tabs
//       screenOptions={{
//         tabBarActiveTintColor: colors.primary,
//         tabBarInactiveTintColor: colors.textSecondary,
//         headerShown: false,
//         tabBarStyle: {
//           backgroundColor: colors.background,
//           borderTopColor: colors.border,
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: "Home",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="home" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="settings"
//         options={{
//           title: "Settings",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons
//               name={theme === "dark" ? "settings" : "settings-outline"}
//               size={size}
//               color={color}
//             />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }
