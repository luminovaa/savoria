import { StyleSheet } from "react-native";
import { EdgeInsets } from "react-native-safe-area-context";
import React from "react";

export type Colors = {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  border: string;
  error: string;
};

// Define Theme as a string literal type to match what's coming from useTheme hook
export type Theme = "light" | "dark";

const createStyles = (colors: Colors, theme: Theme, insets: EdgeInsets) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingBottom: 30 + insets.bottom,
    },
    // header: {
    //   paddingHorizontal: 20,
    //   paddingTop: insets.top + 10,
    //   paddingBottom: 15,
    //   backgroundColor: colors.card,
    //   marginBottom: 16,
    //   flexDirection: "row",
    //   alignItems: "center",
    //   justifyContent: "space-between",
    // },
    // headerTitle: {
    //   fontSize: 28,
    //   fontWeight: "bold",
    //   color: colors.text,
    // },
    profileContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 16,
      marginTop: 20,
      borderRadius: 16,
      padding: 16,
      shadowColor: theme === "dark" ? "#000" : colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.secondary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.primary,
    },
    profileInfo: {
      marginLeft: 16,
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    profileButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.primary + "20",
      borderRadius: 8,
      marginTop: 8,
    },
    profileButtonText: {
      color: colors.primary,
      fontWeight: "500",
      fontSize: 12,
    },
    section: {
      marginBottom: 16,
      borderRadius: 16,
      overflow: "hidden",
      marginHorizontal: 16,
      backgroundColor: colors.card,
      shadowColor: theme === "dark" ? "#000" : colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 3,
    },
    sectionTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    sectionTitleIcon: {
      marginRight: 8,
      backgroundColor: colors.primary + "15",
      width: 28,
      height: 28,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingIconTitle: {
      flexDirection: "row",
      alignItems: "center",
    },
    settingIcon: {
      marginRight: 12,
      backgroundColor: colors.primary + "10",
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
    settingDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    themeIndicator: {
      width: 50,
      height: 30,
      borderRadius: 15,
      padding: 4,
      backgroundColor: theme === "dark" ? colors.border : colors.border + "80",
    },
    themeIndicatorKnob: {
      position: "absolute",
      top: 4,
      left: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
    },
    footer: {
      alignItems: "center",
      marginTop: 20,
      paddingHorizontal: 20,
    },
    footerLogo: {
      width: 40,
      height: 40,
      marginBottom: 10,
    },
    footerText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    versionBadge: {
      marginTop: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: colors.secondary + "30",
      borderRadius: 12,
    },
    versionText: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: "500",
    },
    logoutButton: {
      backgroundColor: theme === "dark" ? "#331f1f" : "#ffebeb",
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 8,
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    logoutText: {
      color: colors.error,
    },
  });
};

export default createStyles;