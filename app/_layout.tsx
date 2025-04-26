import { Slot } from "expo-router";
import { Dimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { SupabaseProvider, useSupabase } from "@/context/supabase-provider";
import React, { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/themes/theme-context";
import { useTheme } from "@/hooks/use-theme";

function RootLayoutNav() {
  const { onLayoutRootView } = useSupabase();

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Slot />
    </View>
  );
}

export default function AppLayout() {
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const updateLayout = () => {
      const breakpoint = 768;
      const windowWidth = Dimensions.get("window").width;
      setIsMobile(windowWidth < breakpoint);
    };

    updateLayout();

    const subscription = Dimensions.addEventListener("change", updateLayout);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SupabaseProvider>
      <ThemeProvider>
        <StatusBar style={theme === "dark" ? "light" : "dark"} hidden={isMobile ? false : true} />
        <RootLayoutNav />
      </ThemeProvider>
    </SupabaseProvider>
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
