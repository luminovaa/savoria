import { useTheme } from "@/hooks/use-theme";
import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function TypeCard() {
  const { theme, colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "center",
      padding: 15,
      borderRadius: 20,
    },
    item: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 15,
      paddingHorizontal: 7,
      marginVertical: 8,
      width: 80, 
    },
    iconContainer: {
      marginBottom: 8, 
    },
    text: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: "500",
      textAlign: "center",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="coffee" size={24} color={colors.primary} />
        </View>
        <Text style={styles.text}>Panas</Text>
      </View>
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="snowflake" size={24} color={colors.primary} />
        </View>
        <Text style={styles.text}>Es</Text>
      </View>
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="food" size={24} color={colors.primary} />
        </View>
        <Text style={styles.text}>Makanan</Text>
      </View>
      <View style={styles.item}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="food-croissant" size={24} color={colors.primary} />
        </View>
        <Text style={styles.text}>Cemilan</Text>
      </View>
    </View>
  );
}