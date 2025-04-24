import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";

// Get screen dimensions to calculate card height for 4 rows
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Sample data for the menu items
interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

const menuItems: MenuItem[] = [
  { id: "1", name: "Cheese & Tomato Pizza", price: 40.5, image: "https://via.placeholder.com/150" },
  { id: "2", name: "Smoky Ham & Cheese", price: 10.0, image: "https://via.placeholder.com/150" },
  { id: "3", name: "Poached Egg & Bacon", price: 40.5, image: "https://via.placeholder.com/150" },
  { id: "4", name: "Pesto Pasta Salad", price: 10.0, image: "https://via.placeholder.com/150" },
  { id: "5", name: "Vegan Meatball Wrap", price: 10.0, image: "https://via.placeholder.com/150" },
  { id: "6", name: "Vegan BBQ Chick'n Panini", price: 40.5, image: "https://via.placeholder.com/150" },
  { id: "7", name: "Creamy Mac & Cheese", price: 10.0, image: "https://via.placeholder.com/150" },
  { id: "8", name: "Coronation Toastie", price: 10.0, image: "https://via.placeholder.com/150" },
  { id: "9", name: "Margherita Pizza", price: 35.0, image: "https://via.placeholder.com/150" },
  { id: "10", name: "Turkey & Swiss", price: 12.0, image: "https://via.placeholder.com/150" },
  { id: "11", name: "Avocado Toast", price: 15.0, image: "https://via.placeholder.com/150" },
  { id: "12", name: "Caesar Salad", price: 8.0, image: "https://via.placeholder.com/150" },
  { id: "13", name: "Chicken Wrap", price: 9.5, image: "https://via.placeholder.com/150" },
  { id: "14", name: "BBQ Pulled Pork", price: 45.0, image: "https://via.placeholder.com/150" },
  { id: "15", name: "Macaroni Salad", price: 7.0, image: "https://via.placeholder.com/150" },
  { id: "16", name: "Egg & Cheese Muffin", price: 6.0, image: "https://via.placeholder.com/150" },
];

export default function MainCardMenu() {
  const [cart, setCart] = useState<{ [id: string]: number }>({});

  // Function to handle quantity changes
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

  // Function to add item to cart
  const addToCart = (id: string) => {
    setCart((prevCart) => ({
      ...prevCart,
      [id]: (prevCart[id] || 0) + 1,
    }));
  };

  // Render each menu item
  const renderItem = ({ item }: { item: MenuItem }) => {
    const quantity = cart[item.id] || 0;
    return (
      <View style={styles.card}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        {quantity > 0 ? (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, -1)}
              style={styles.quantityButton}
            >
              <Text style={styles.quantityText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, 1)}
              style={styles.quantityButton}
            >
              <Text style={styles.quantityText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => addToCart(item.id)} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <FlatList
        data={menuItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={4} // Changed to 4 columns
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        scrollEnabled={false} // Disable scrolling to ensure exactly 4 rows
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingTop: 20,
  },
  list: {
    padding: 10,
    height: SCREEN_HEIGHT - 40, // Adjust height to fit 4 rows
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    width: "23%", // Adjusted for 4 columns (100% / 4 - spacing)
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: (SCREEN_HEIGHT - 40) / 4 - 20, // Divide available height by 4 rows
    justifyContent: "center",
  },
  image: {
    width: 60, // Reduced size for 4 columns
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 10, // Reduced font size to fit
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  price: {
    fontSize: 10,
    color: "#555",
    marginBottom: 4,
  },
  addButton: {
    backgroundColor: "#ff5722",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 60,
  },
  quantityButton: {
    backgroundColor: "#ddd",
    padding: 2,
    borderRadius: 4,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  quantity: {
    fontSize: 12,
    marginHorizontal: 6,
  },
});