import { useTheme } from "@/hooks/use-theme";
import { useRouter, Slot, useSegments } from "expo-router";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

export default function ProtectedLayout() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const isTabActive = (path: string) => {
    const currentPath = `/${segments.join("/")}`;
    return currentPath === path;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    navbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 60,
      borderBottomWidth: 1,
      paddingHorizontal: 16,
    },
    logo: {
      width: 80,
      height: 80,
    },
    navItems: {
      flexDirection: "row",
      gap: 8, 
    },
    navItem: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    activeNavItem: {
      backgroundColor: colors.primary,
      borderRadius: 30
    },
    navText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text, 
    },
    activeNavText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.navbar,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Image
          source={
            theme === "dark"
              ? require("@/assets/logo/savoria-dark.png")
              : require("@/assets/logo/savoria-light.png")
          }
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.navItems}>
          <TouchableOpacity
            style={[
              styles.navItem,
              isTabActive("/(app)/(protected)") && styles.activeNavItem,
            ]}
            onPress={() => router.push("/(app)/(protected)")}
          >
            <Text
              style={
                isTabActive("/(app)/(protected)")
                  ? styles.activeNavText
                  : styles.navText
              }
            >
              Beranda
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navItem,
              isTabActive("/(app)/(protected)/settings") && styles.activeNavItem,
            ]}
            onPress={() => router.push("/(app)/(protected)/settings")}
          >
            <Text
              style={
                isTabActive("/(app)/(protected)/settings")
                  ? styles.activeNavText
                  : styles.navText
              }
            >
              Pengaturan
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}