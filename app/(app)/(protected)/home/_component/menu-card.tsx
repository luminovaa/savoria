import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MenuItem {
  id: string;
  name?: string;
  price?: number;
  image?: string;
  isAddButton?: boolean;
}

const menuItems: MenuItem[] = [
  { id: "1", name: "Cheese & Tomato Pizza", price: 40.5, image: "https://placehold.co/400" },
  { id: "2", name: "Smoky Ham & Cheese", price: 10.0, image: "https://placehold.co/400" },
  { id: "3", name: "Poached Egg & Bacon", price: 40.5, image: "https://placehold.co/400" },
  { id: "4", name: "Pesto Pasta Salad", price: 10.0, image: "https://placehold.co/400" },
  { id: "5", name: "Vegan Meatball Wrap", price: 10.0, image: "https://placehold.co/400" },
  { id: "6", name: "Vegan BBQ Chick'n Panini", price: 40.5, image: "https://placehold.co/400" },
  { id: "7", name: "Creamy Mac & Cheese", price: 10.0, image: "https://placehold.co/400" },
  { id: "8", name: "Coronation Toastie", price: 10.0, image: "https://placehold.co/400" },
  { id: "9", name: "Margherita Pizza", price: 35.0, image: "https://placehold.co/400" },
  { id: "10", name: "Turkey & Swiss", price: 12.0, image: "https://placehold.co/400" },
  { id: "11", name: "Avocado Toast", price: 15.0, image: "https://placehold.co/400" },
  { id: "12", name: "Caesar Salad", price: 8.0, image: "https://placehold.co/400" },
  { id: "13", name: "Chicken Wrap", price: 9.5, image: "https://placehold.co/400" },
  { id: "14", name: "BBQ Pulled Pork", price: 45.0, image: "https://placehold.co/400" },
  { id: "15", name: "Macaroni Salad", price: 7.0, image: "https://placehold.co/400" },
  { id: "16", name: "Egg & Cheese Muffin", price: 6.0, image: "https://placehold.co/400" },
  { id: "17", name: "Tambah Menu", isAddButton: true },
];

export default function MainCardMenu() {
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const { colors } = useTheme();
  const router = useRouter();

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
    if (item.isAddButton) {
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

    const quantity = cart[item.id] || 0;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.price, { color: colors.textSecondary }]}>
          ${item.price!.toFixed(2)}
        </Text>
        {quantity > 0 ? (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, -1)}
              style={[styles.quantityButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.quantityText, { color: colors.text }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.quantity, { color: colors.text }]}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, 1)}
              style={[styles.quantityButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.quantityText, { color: colors.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => addToCart(item.id)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.addButtonText, { color: colors.card }]}>Tambah</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container]}>
      <FlatList
        data={menuItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
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
    fontSize: 60, // Perbesar ukuran ikon
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
});