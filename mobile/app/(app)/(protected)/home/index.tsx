import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import MainCardMenu from "./_component/menu-card";
import TypeCard from "./_component/type-card";
import InvoiceCart from "./_component/invoice-card";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MenuSort } from "@/utils/types";

const homeState = {
  selectedCategory: null as number | null,
  menuSort: "newest" as MenuSort,
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get("window").width;
  const isTablet = screenWidth > 600;
  const [selectedCategory, setSelectedCategory] = useState<number | null>(homeState.selectedCategory);
  const [menuSort, setMenuSortState] = useState<MenuSort>(homeState.menuSort);
  const [cart, setCart] = useState<{ [id: string]: number }>({});

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: isTablet ? 20 : -20,
    },
    layout: {
      flex: 1,
      flexDirection: isTablet ? "row" : "column",
    },
    leftSidebar: {
      width: isTablet ? wp("10.8%") : wp("100%"),
      paddingLeft: isTablet ? 20 : 10,
      paddingRight: isTablet ? 0 : 10,
      height: isTablet ? "98%" : "auto",
      marginBottom: isTablet ? 0 : 10,
    },
    cardTypeContainer: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 15,
      elevation: 2,
      height: isTablet ? "100%" : "auto",
    },
    contentArea: {
      flex: isTablet ? 1 : 0,
      paddingHorizontal: isTablet ? 0 : 10,
      marginBottom: isTablet ? 0 : 10,
    },
    rightSidebar: {
      width: isTablet ? wp("30%") : wp("100%"),
      paddingRight: isTablet ? 20 : 10,
      paddingLeft: isTablet ? 20 : 10,
      height: isTablet ? "97%" : "auto", // Ensure full height for tablet
      marginBottom: isTablet ? 0 : 10,
    },
    cardInvoiceContainer: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 20,
      elevation: 2,
      height: isTablet ? "100%" : "auto", // Full height for tablet
      flex: isTablet ? 1 : 0, // Ensure it takes available space
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
    const nextCategory = selectedCategory === categoryId ? null : categoryId;
    homeState.selectedCategory = nextCategory;
    setSelectedCategory(nextCategory);
  };

  const setMenuSort = (sort: MenuSort) => {
    homeState.menuSort = sort;
    setMenuSortState(sort);
  };

  return (
    <SafeAreaView style={styles.container}>
      {isTablet ? (
        // Layout untuk tablet (horizontal)
        <View style={styles.layout}>
          {/* TypeCard */}
          <View style={styles.leftSidebar}>
            <View style={styles.cardTypeContainer}>
              <TypeCard
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
              />
            </View>
          </View>

          {/* Scrollable MainCardMenu */}
          <View style={styles.contentArea}>
            <MainCardMenu
              selectedCategory={selectedCategory}
              menuSort={menuSort}
              setMenuSort={setMenuSort}
              cart={cart}
              setCart={setCart}
            />
          </View>

          {/* InvoiceCart */}
          <View style={styles.rightSidebar}>
            <View style={styles.cardInvoiceContainer}>
              <InvoiceCart cart={cart} setCart={setCart} />
            </View>
          </View>
        </View>
      ) : (
        // Layout untuk ponsel (vertikal)
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* TypeCard */}
          <View style={styles.leftSidebar}>
            <View style={styles.cardTypeContainer}>
              <TypeCard
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
              />
            </View>
          </View>

          {/* InvoiceCart */}
          <View style={styles.rightSidebar}>
            <View style={styles.cardInvoiceContainer}>
              <InvoiceCart cart={cart} setCart={setCart} />
            </View>
          </View>

          {/* MainCardMenu */}
          <View style={styles.contentArea}>
            <View style={styles.cardMenuContainer}>
              <MainCardMenu
                selectedCategory={selectedCategory}
                menuSort={menuSort}
                setMenuSort={setMenuSort}
                cart={cart}
                setCart={setCart}
                usePlainGrid
              />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
