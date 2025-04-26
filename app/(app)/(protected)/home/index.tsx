import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView, Dimensions } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import MainCardMenu from "./_component/menu-card";
import TypeCard from "./_component/type-card";
import InvoiceCart from "./_component/invoice-card";

export default function HomeScreen() {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;
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
      flexDirection: 'row',
    },
    leftSidebar: {
      width: screenWidth * 0.09,
      paddingLeft: 20,
      height: '98%',
    },
    cardTypeContainer: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 15,
      elevation: 2,
      height: '95%',
    },
    contentArea: {
      flex: 1,
    },
    rightSidebar: {
      width: screenWidth * 0.26,
      paddingRight: 20,
      height: '98%',
    },
    cardInvoiceContainer: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 20,
      elevation: 2,
      height: '95%',
    },
    cardMenuContainer: {
      borderRadius: 10,
      width: '100%',
    },
    contentContainer: {
      paddingBottom: 30,
    },
  });

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.layout}>
        <View style={styles.leftSidebar}>
          <View style={styles.cardTypeContainer}>
            <TypeCard 
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
            />
          </View>
        </View>
        
        <View style={styles.contentArea}>
          <ScrollView contentContainerStyle={styles.contentContainer}>
            <View style={styles.cardMenuContainer}>
              <MainCardMenu 
                selectedCategory={selectedCategory} 
                cart={cart}
                setCart={setCart}
              />
            </View>
          </ScrollView>
        </View>
        
        <View style={styles.rightSidebar}>
          <View style={styles.cardInvoiceContainer}>
            <InvoiceCart cart={cart} setCart={setCart} />
          </View>
        </View>
      </View>
    </View>
  );
}