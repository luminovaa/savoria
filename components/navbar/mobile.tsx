import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRouter, useSegments } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const MobileNavbar = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const isTabActive = (path: any) => {
    const currentPath = `/${segments.join("/")}`;
    return currentPath === path;
  };

  const navigateTo = (path:any ) => {
    router.push(path);
  };

  const styles = StyleSheet.create({
    bottomTabs: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      height: 60,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 12,
    },
    tabItem: {
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      flex: 1,
    },
    activeTabItem: {
      borderTopWidth: 2,
      borderTopColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      marginTop: 6,
      color: colors.text,
    },
    activeTabText: {
      color: colors.primary,
      fontWeight: "600",
    },
  });

  return (
    <SafeAreaView edges={['bottom']} >
    <View style={styles.bottomTabs}>
      <TouchableOpacity
        style={[
          styles.tabItem,
          isTabActive("/(app)/(protected)/home") && styles.activeTabItem,
        ]}
        onPress={() => navigateTo("/(app)/(protected)/home")}
      >
        <Feather
          name="home"
          size={18}
          color={isTabActive("/(app)/(protected)/home") ? colors.primary : colors.text}
        />
        <Text
          style={[
            styles.tabText,
            isTabActive("/(app)/(protected)/home") && styles.activeTabText,
          ]}
        >
          Beranda
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabItem,
          isTabActive("/(app)/(protected)/order") && styles.activeTabItem,
        ]}
        onPress={() => navigateTo("/(app)/(protected)/order")}
      >
        <Feather
          name="shopping-bag"
          size={18}
          color={isTabActive("/(app)/(protected)/order") ? colors.primary : colors.text}
        />
        <Text
          style={[
            styles.tabText,
            isTabActive("/(app)/(protected)/order") && styles.activeTabText,
          ]}
        >
          Pesanan
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabItem,
          isTabActive("/(app)/(protected)/cashier") && styles.activeTabItem,
        ]}
        onPress={() => navigateTo("/(app)/(protected)/cashier")}
      >
        <Feather
          name="dollar-sign"
          size={18}
          color={isTabActive("/(app)/(protected)/cashier") ? colors.primary : colors.text}
        />
        <Text
          style={[
            styles.tabText,
            isTabActive("/(app)/(protected)/cashier") && styles.activeTabText,
          ]}
        >
          Kasir
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabItem,
          isTabActive("/(app)/(protected)/settings") && styles.activeTabItem,
        ]}
        onPress={() => navigateTo("/(app)/(protected)/settings")}
      >
        <Feather
          name="settings"
          size={18}
          color={isTabActive("/(app)/(protected)/settings") ? colors.primary : colors.text}
        />
        <Text
          style={[
            styles.tabText,
            isTabActive("/(app)/(protected)/settings") && styles.activeTabText,
          ]}
        >
          Pengaturan
        </Text>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
};

export default MobileNavbar;
