import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView, Dimensions } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import MainCardMenu from "./_component/menu-card";
import TypeCard from "./_component/type-card";

export default function HomeScreen() {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

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
      // padding: 20,
    },
    rightSidebar: {
      width: screenWidth * 0.22,
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
              <MainCardMenu selectedCategory={selectedCategory} />
            </View>
          </ScrollView>
        </View>
        
        <View style={styles.rightSidebar}>
          <View style={styles.cardInvoiceContainer}>
            <Text style={{color: colors.text}}>Invoice</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
