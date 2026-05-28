import { Stack } from "expo-router";

import React from "react";
import { useTheme } from "@/hooks/use-theme";

export const unstable_settings = {
  initialRouteName: "(root)",
};

export default function AppLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(protected)" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}
