import { useTheme } from "@/hooks/use-theme";
import React, { useEffect, useState } from "react";
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  Dimensions 
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/utils/api";
import { capitalizeText } from "@/utils/format";
import { Category } from "@/utils/types"; 

type TypeCardProps = {
  onCategorySelect: (categoryId: number | null) => void;
  selectedCategory: number | null;
};

export default function TypeCard({ onCategorySelect, selectedCategory }: TypeCardProps) {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const screenWidth = Dimensions.get("window").width;
  const isTablet = screenWidth > 600;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await api
        .from('category')
        .select('*')
        .order('name_category', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'minuman panas':
        return 'coffee';
      case 'minuman dingin':
        return 'snowflake';
      case 'makanan':
        return 'food';
      case 'cemilan':
        return 'food-croissant';
      default:
        return 'food';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: isTablet ? "column" : "row",
      justifyContent: "flex-start",
      alignItems: isTablet ? "center" : "flex-start",
      padding: 10,
      marginTop: isTablet ? -20 : 0,
      borderRadius: 20,
    },
    scrollContainer: {
      flexDirection: "row",
    },
    item: {
      flexDirection: isTablet ? "column" : "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: isTablet ? 13 : 10,
      paddingHorizontal: isTablet ? 7 : 15,
      marginVertical: isTablet ? 7 : 0,
      marginRight: isTablet ? 0 : 8,
      width: isTablet ? 80 : "auto",
      height: isTablet ? undefined : 40,
    },
    selectedItem: {
      backgroundColor: colors.secondary,
    },
    iconContainer: {
      marginBottom: isTablet ? 8 : 0,
      marginRight: isTablet ? 0 : 8,
      display: isTablet ? "flex" : "none",
    },
    text: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
      textAlign: "center",
    },
    selectedText: {
      color: colors.primary,
      fontWeight: "600",
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const renderContent = () => (
    <>
      <TouchableOpacity 
        onPress={() => onCategorySelect(null)}
        style={[
          styles.item,
          selectedCategory === null && styles.selectedItem
        ]}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons 
            name="all-inclusive" 
            size={20} 
            color={selectedCategory === null ? colors.primary : colors.primary} 
          />
        </View>
        <Text style={[
          styles.text,
          selectedCategory === null && styles.selectedText
        ]}>
          Semua
        </Text>
      </TouchableOpacity>

      {categories.map((category) => (
        <TouchableOpacity 
          key={category.id}
          onPress={() => onCategorySelect(category.id)}
          style={[
            styles.item,
            selectedCategory === category.id && styles.selectedItem
          ]}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name={getCategoryIcon(category.name_category) as any} 
              size={24} 
              color={selectedCategory === category.id ? colors.primary : colors.primary} 
            />
          </View>
          <Text style={[
            styles.text,
            selectedCategory === category.id && styles.selectedText
          ]}>
            {capitalizeText(category.name_category)}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );

  return (
    <View style={styles.container}>
      {isTablet ? (
        renderContent()
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {renderContent()}
        </ScrollView>
      )}
    </View>
  );
}
