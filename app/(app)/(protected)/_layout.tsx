// ProtectedLayout.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { Slot } from "expo-router";
import Navbar from "@/components/navbar";

export default function ProtectedLayout() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      <Navbar />
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}
