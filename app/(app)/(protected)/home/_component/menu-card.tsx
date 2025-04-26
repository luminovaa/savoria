import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { MenuItem } from "@/utils/types";
import { formatCurrency } from "@/utils/format";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type MainCardMenuProps = {
  selectedCategory: number | null;
};

export default function MainCardMenu({ selectedCategory }: MainCardMenuProps) {
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const router = useRouter();

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      let query = supabase.from('menu').select('*');
      
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      } else {
        query = query.order('created_at', { ascending: false });
      }
  
      const { data, error } = await query;
  
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
  
  useEffect(() => {
    fetchMenuItems();
  }, [selectedCategory]); 


  const addToCart = (id: string) => {
    const newQuantity = (cart[id] || 0) + 1;
    setCart({ ...cart, [id]: newQuantity });
    addToOrder(id, newQuantity); 
  };
  
  const updateQuarterQuantity = (id: string, delta: number) => {
    setCart((prevCart) => {
      const newQuantity = (prevCart[id] || 0) + delta;
      if (newQuantity <= 0) {
        const { [id]: _, ...rest } = prevCart;
        return rest;
      }
      addToOrder(id, newQuantity); 
      return { ...prevCart, [id]: newQuantity };
    });
  };

  // const updateQuarterQuantity = (id: string, delta: number) => {
  //   setCart((prevCart) => {
  //     const newQuantity = (prevCart[id] || 0) + delta;
  //     if (newQuantity <= 0) {
  //       const { [id]: _, ...rest } = prevCart;
  //       return rest;
  //     }
  //     return { ...prevCart, [id]: newQuantity };
  //   });
  // };

  // const addToCart = (id: string) => {
  //   setCart((prevCart) => ({
  //     ...prevCart,
  //     [id]: (prevCart[id] || 0) + 1,
  //   }));
  // };

  const handleAddMenu = () => {
    router.push("/(app)/(protected)/home/add-menu");
  };



const addToOrder = async (menuId: string, quantity: number) => {
  try {
 
    let { data: activeOrder, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let orderId;
    if (!activeOrder) {
      
      const invoiceNumber = `INV-${Date.now()}`; 
      const { data: newOrder, error: newOrderError } = await supabase
        .from('orders')
        .insert([{
          invoice_number: invoiceNumber,
          status: 'draft',
          payment_type: null,
          total_amount: 0,
          total: 0
        }])
        .select()
        .single();
      if (newOrderError) throw newOrderError;
      orderId = newOrder.id;
    } else {
      orderId = activeOrder.id;
    }

    
    const { data: existingItem } = await supabase
      .from('order_items')
      .select('id, quantity, price')
      .eq('orders_id', orderId)
      .eq('menu_id', menuId)
      .maybeSingle();

    
    const { data: menu, error: menuError } = await supabase
      .from('menu')
      .select('price, promo_price, promo')
      .eq('id', menuId)
      .single();
    if (menuError) throw menuError;
    const price = menu.promo ? menu.promo_price : menu.price;

    if (existingItem) {
      
      const newQuantity = existingItem.quantity + quantity;
      const newSubtotal = price * newQuantity;
      await supabase
        .from('order_items')
        .update({
          quantity: newQuantity,
          subtotal: newSubtotal
        })
        .eq('id', existingItem.id);
    } else {
     
      await supabase
        .from('order_items')
        .insert([{
          orders_id: orderId,
          menu_id: menuId,
          price: price,
          quantity: quantity,
          subtotal: price * quantity
        }]);
    }

    // await supabase
    //   .from('orders')
    //   .update({ status: 'paid' })
    //   .eq('id', orderId);

    alert('Item berhasil ditambahkan ke pesanan!');
  } catch (error) {
    console.error('Error adding to order:', error);
    alert('Gagal menambahkan item ke pesanan');
  }
};











  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    list: {
      paddingHorizontal: 15,
    },
    row: {
      justifyContent: "flex-start",
      gap: 15,
      marginBottom: 15,
    },
    card: {
      borderRadius: 12,
      padding: 10,
      width: "23.8%",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
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
      color: colors.primary,
    },
    name: {
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 4,
      flexWrap: "wrap",
      color: colors.text,
    },
    price: {
      fontSize: 11,
      marginBottom: 6,
      color: colors.textSecondary,
    },
    promoPrice: {
      fontSize: 10,
      marginBottom: 6,
      color: colors.primary,
    },
    addButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    addButtonText: {
      fontWeight: "600",
      fontSize: 12,
      color: colors.card,
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
      backgroundColor: colors.secondary,
    },
    quantityText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    quantity: {
      fontSize: 12,
      marginHorizontal: 8,
      color: colors.text,
    },
  });
  
  const renderItem = ({ item }: { item: MenuItem }) => {
    if (item.id === 0) {
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={handleAddMenu}
        >
          <View style={styles.addIconContainer}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <Text style={styles.name}>Tambah Menu</Text>
        </TouchableOpacity>
      );
    }

    const quantity = cart[item.id.toString()] || 0;
    return (
      <View style={styles.card}>
        <Image source={{ uri: item.images }} style={styles.image} />
        <Text style={styles.name} numberOfLines={2}>
          {item.name_menu}
        </Text>
        <Text style={styles.price}>
          {formatCurrency(item.price)}
        </Text>
        {item.promo && (
          <Text style={styles.promoPrice}>
            {formatCurrency(item.promo_price!)}
          </Text>
        )}
        {quantity > 0 ? (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={() => updateQuarterQuantity(item.id.toString(), -1)}
              style={styles.quantityButton}
            >
              <Text style={styles.quantityText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => updateQuarterQuantity(item.id.toString(), 1)}
              style={styles.quantityButton}
            >
              <Text style={styles.quantityText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => addToCart(item.id.toString())}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>Tambah</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }


  return (
    <View style={styles.container}>
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