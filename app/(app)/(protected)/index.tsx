import React from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import MainCardMenu from "@/components/home/type-card";

export default function HomeScreen() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 20,
      backgroundColor: colors.background,
    },
    mainContainer: {
      flex: 1,
      justifyContent: "space-between",
      flexDirection: "row",
    },
    cardTypeContainer: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 20,
      marginBottom: 20,
      left: 20,
      elevation:2,
    },
    cardMenuContainer:{
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 20,
      marginBottom: 20,
      elevation:2,
    },
    cardInvoiceContainer: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 20,
      right: 20,
      marginBottom: 20,
      elevation:2,
    },
    text: {
      fontSize: 24,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 15,
      marginBottom: 10,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
    },
    contentContainer: {
      paddingBottom: 30,
    },
  });
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.mainContainer}>
        <View style={styles.cardTypeContainer}>
          
        </View>
        <MainCardMenu/>
        <View style={styles.cardInvoiceContainer}>
          
        </View>
      </View>
    </ScrollView>
  );
}
