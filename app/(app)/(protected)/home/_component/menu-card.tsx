import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MenuItem {
  id: number;
  name_menu: string;
  description: string;
  price: number;
  category_id: number;
  images: string;
  promo: boolean;
  promo_price: number | null;
  promo_start: string | null;
  promo_end: string | null;
  created_at: string;
  updated_at: string;
  isAddButton?: boolean;
}

export default function MainCardMenu() {
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = data || [];
      setMenuItems([
        ...items,
        {
          id: 0,
          name_menu: "Tambah Menu",
          description: "",
          price: 0,
          category_id: 0,
          images: "",
          promo: false,
          promo_price: null,
          promo_start: null,
          promo_end: null,
          created_at: "",
          updated_at: "",
          isAddButton: true
        }
      ]);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prevCart) => {
      const newQuantity = (prevCart[id] || 0) + delta;
      if (newQuantity <= 0) {
        const { [id]: _, ...rest } = prevCart;
        return rest;
      }
      return { ...prevCart, [id]: newQuantity };
    });
  };

  const addToCart = (id: string) => {
    setCart((prevCart) => ({
      ...prevCart,
      [id]: (prevCart[id] || 0) + 1,
    }));
  };

  const handleAddMenu = () => {
    router.push("/(app)/(protected)/home/add-menu");
  };

  const renderItem = ({ item }: { item: MenuItem }) => {
    if (item.id === 0) {
      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleAddMenu}
        >
          <View style={styles.addIconContainer}>
            <Text style={[styles.addIcon, { color: colors.primary }]}>+</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>Tambah Menu</Text>
        </TouchableOpacity>
      );
    }

    const quantity = cart[item.id.toString()] || 0;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Image source={{ uri: item.images }} style={styles.image} />
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {item.name_menu}
        </Text>
        <Text style={[styles.price, { color: colors.textSecondary }]}>
          Rp {item.price.toLocaleString()}
        </Text>
        {item.promo && (
          <Text style={[styles.promoPrice, { color: colors.primary }]}>
            Promo: Rp {item.promo_price?.toLocaleString()}
          </Text>
        )}
        {quantity > 0 ? (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id.toString(), -1)}
              style={[styles.quantityButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.quantityText, { color: colors.text }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.quantity, { color: colors.text }]}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id.toString(), 1)}
              style={[styles.quantityButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.quantityText, { color: colors.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => addToCart(item.id.toString())}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.addButtonText, { color: colors.card }]}>Tambah</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      <FlatList
        data={menuItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={4}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 15,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 15,
  },
  card: {
    borderRadius: 12,
    padding: 10,
    width: "23.8%",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
    height: 250,
    justifyContent: "space-between",
  },
  image: {
    width: 70,
    height: 120,
    borderRadius: 10,
    marginBottom: 6,
  },
  addIconContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  addIcon: {
    fontSize: 60, 
    fontWeight: "bold",
  },
  name: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  price: {
    fontSize: 11,
    marginBottom: 6,
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontWeight: "600",
    fontSize: 12,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 70,
  },
  quantityButton: {
    padding: 4,
    borderRadius: 6,
    width: 24,
    alignItems: "center",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
  },
  quantity: {
    fontSize: 12,
    marginHorizontal: 8,
  },
  promoPrice: {
    fontSize: 10,
    marginBottom: 6,
  },
});