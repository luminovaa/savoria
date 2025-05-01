import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Dimensions, FlatList } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import MainCardMenu from "./_component/menu-card";
import TypeCard from "./_component/type-card";
import InvoiceCart from "./_component/invoice-card";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get("window").width;
  const isTablet = screenWidth > 600;
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<{ [id: string]: number }>({});

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 20,
    },
    layout: {
      flex: 1,
      flexDirection: isTablet ? "row" : "column", 
    },
    leftSidebar: {
      width: isTablet ? wp("10.8%") : wp("100%"),
      paddingLeft: isTablet ? 20 : 10,
      paddingRight: isTablet ? 0 : 10,
      height: isTablet ? "90%" : "auto",
      marginBottom: isTablet ? 0 : 10, 
    },
    cardTypeContainer: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 15,
      elevation: 2,
      height: isTablet ? "111%" : "auto",
    },
    contentArea: {
      flex: isTablet ? 1 : 0,
      paddingHorizontal: isTablet ? 20 : 10,
      marginBottom: isTablet ? 0 : 10,
    },
    rightSidebar: {
      width: isTablet ? wp("30%") : wp("100%"), 
      paddingRight: isTablet ? 20 : 10,
      paddingLeft: isTablet ? 20 : 10,
      height: isTablet ? "80%" : "auto",
    },
    cardInvoiceContainer: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 20,
      elevation: 2,
      minHeight: isTablet ? "80%" : "auto",
    },
    cardMenuContainer: {
      borderRadius: 10,
      width: "100%",
    },
    contentContainer: {
      paddingBottom: 30,
    },
  });

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };
  const data = [
    { key: "layout", type: "layout" },
  ];

  const renderItem = () => (
    <SafeAreaView style={styles.layout}>
      {/* TypeCard */}
      <View style={styles.leftSidebar}>
        <View style={styles.cardTypeContainer}>
          <TypeCard
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
          />
        </View>
      </View>

      {/* MainCardMenu */}
      <View style={styles.contentArea}>
        <View style={styles.cardMenuContainer}>
          <MainCardMenu
            selectedCategory={selectedCategory}
            cart={cart}
            setCart={setCart}
          />
        </View>
      </View>

      {/* InvoiceCart */}
      <View style={styles.rightSidebar}>
        <View style={styles.cardInvoiceContainer}>
          <InvoiceCart cart={cart} setCart={setCart} />
        </View>
      </View>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}