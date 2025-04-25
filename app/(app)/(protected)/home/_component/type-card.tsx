import { useTheme } from "@/hooks/use-theme";
import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import { capitalizeText } from "@/utils/format";

type Category = {
  id: number;
  name_category: string;
  created_at: string;
  updated_at: string;
};

type TypeCardProps = {
  onCategorySelect: (categoryId: number | null) => void;
  selectedCategory: number | null;
};

export default function TypeCard({ onCategorySelect, selectedCategory }: TypeCardProps) {
  const { theme, colors } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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
    selectedItem: {
      backgroundColor: colors.secondary,
    },
    iconContainer: {
      marginBottom: 8, 
    },
    text: {
      color: colors.textSecondary,
      fontSize: 14, 
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

  return (
    <View style={styles.container}>
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
            size={24} 
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
    </View>
  );
}