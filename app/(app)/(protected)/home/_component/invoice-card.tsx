import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/utils/supabase";
import { formatCurrency } from "@/utils/format";
import { MenuItem } from "@/utils/types";
import { Feather } from "@expo/vector-icons";

type InvoiceCartProps = {
  cart: { [id: string]: number };
  setCart: React.Dispatch<React.SetStateAction<{ [id: string]: number }>>;
};

export default function InvoiceCart({ cart, setCart }: InvoiceCartProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    if (Object.keys(cart).length > 0) {
      const cartIds = Object.keys(cart);
      const existingIds = menuItems.map(item => item.id.toString());
      const newIds = cartIds.filter(id => !existingIds.includes(id));
      
      if (newIds.length > 0) {
        const fetchNewItems = async () => {
          try {
            setLoading(true);
            const { data, error } = await supabase
              .from("menu")
              .select("*")
              .in("id", newIds);
    
            if (error) throw error;
    
            setMenuItems(prev => [...prev, ...(data || [])]);
          } catch (error) {
            console.error("Error fetching menu items for cart:", error);
          } finally {
            setLoading(false);
          }
        };
        
        fetchNewItems();
      }
      
      setMenuItems(prev => prev.filter(item => 
        Object.keys(cart).includes(item.id.toString())
      ));
    } else {
      setMenuItems([]);
      setLoading(false);
    }
  }, [cart]);
  
  const calculateSubtotal = (item: MenuItem, quantity: number) => {
    const price =
      item.promo && item.promo_price ? item.promo_price : item.price;
    return price * quantity;
  };

  const calculateTotal = () => {
    return menuItems.reduce((sum, item) => {
      const quantity = cart[item.id.toString()] || 0;
      return sum + calculateSubtotal(item, quantity);
    }, 0);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prevCart) => {
      const newQuantity = (prevCart[id] || 0) + delta;
      
      if (newQuantity <= 0) {
        const newCart = {...prevCart};
        delete newCart[id]; 
        return newCart;
      }
      
      return { ...prevCart, [id]: newQuantity };
    });
  };

  const removeItem = (id: string) => {
    setCart((prevCart) => {
      const newCart = {...prevCart};
      delete newCart[id]; 
      return newCart;
    });
  };

  const handleOrder = async () => {
    try {
      const total = calculateTotal();

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          created_at: new Date().toISOString(),
          invoice_number: `INV-${Date.now()}`,
          total: Object.values(cart).reduce((sum, qty) => sum + qty, 0),
          total_amount: total,
          payment_type: "cash",
          status: "completed",
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;

      const orderItems = menuItems.map((item) => ({
        created_at: new Date().toISOString(),
        quantity: cart[item.id.toString()],
        subtotal: calculateSubtotal(item, cart[item.id.toString()]),
        menu_id: item.id,
        order_id: orderId,
        price: item.promo && item.promo_price ? item.promo_price : item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setCart({});
    } catch (error) {
      console.error("Error placing order:", error);
    }
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      // backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      marginRight: 10,
      color: colors.primary,
    },
    headerText: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
    },
    itemCount: {
      marginLeft: "auto",
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    itemCountText: {
      color: colors.card,
      fontWeight: "bold",
      fontSize: 12,
    },
    listContainer: {
      flex: 1,
    },
    itemInfo: {
      flex: 1,
      justifyContent: "space-between",
    },
    itemNameContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8, // tambahkan margin bottom
    },
    priceContainer: {
      alignItems: "flex-end",
    },
    itemName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    priceText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      textAlign: "right",
    },
    originalPrice: {
      fontSize: 12,
      color: colors.textSecondary,
      textDecorationLine: "line-through",
      marginBottom: 2,
      textAlign: "right",
    },
    promoPrice: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.primary,
      textAlign: "right",
    },
    actionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    itemContainer: {
      flexDirection: "row",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    imageContainer: {
      marginRight: 12,
      alignItems: "center",
    },
    itemImage: {
      width: 60, 
      height: 60, 
      borderRadius: 8,
      backgroundColor: colors.border,
      marginBottom: 8, 
    },
    quantityContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    quantityButton: {
      padding: 4,
      borderRadius: 15,
    },
    quantityText: {
      fontWeight: "600",
      fontSize: 14,
      color: colors.text,
      marginHorizontal: 10,
      minWidth: 20,
      textAlign: "center",
    },
    removeButton: {
      padding: 4,
    },
    totalSection: {
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    subtotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 5,
    },
    subtotalText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    subtotalAmount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 5,
    },
    totalText: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
    },
    totalAmount: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
    },
    orderButton: {
      marginTop: 15,
      paddingVertical: 12,
      backgroundColor: colors.primary,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    orderButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.card,
      marginLeft: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 30,
    },
    emptyIcon: {
      color: colors.border,
      marginBottom: 15,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 5,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather
          name="shopping-bag"
          width={20}
          height={20}
          style={styles.headerIcon}
        />
        <Text style={styles.headerText}>Pesanan Anda</Text>
        {getTotalItems() > 0 && (
          <View style={styles.itemCount}>
            <Text style={styles.itemCountText}>{getTotalItems()}</Text>
          </View>
        )}
      </View>

      {menuItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather
            name="shopping-bag"
            width={40}
            height={40}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>Belum ada pesanan</Text>
          <Text style={styles.emptySubtext}>
            Pilih menu untuk mulai memesan
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.listContainer}>
            <FlatList
              data={menuItems}
              extraData={cart}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const quantity = cart[item.id.toString()];
                const isPromo = item.promo && item.promo_price;

                return (
                  <View style={styles.itemContainer}>
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: item.images }}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.itemInfo}>
                      <View style={styles.itemNameContainer}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.name_menu}
                        </Text>
                        {isPromo ? (
                          <Text style={styles.subtotalText}>
                            {formatCurrency(item.promo_price!)}
                          </Text>
                        ) : (
                          <Text style={styles.subtotalText}>
                            {formatCurrency(item.price)}
                          </Text>
                        )}
                        </View>
                        {isPromo ? (
                          <View style={styles.priceContainer}>
                            <Text style={styles.promoPrice}>
                              {formatCurrency(item.promo_price! * quantity)}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.priceText}>
                            {formatCurrency(item.price * quantity)}
                          </Text>
                        )}
                      </View>

                      <View style={styles.actionRow}>
                        <View style={styles.quantityContainer}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() =>
                              updateQuantity(item.id.toString(), -1)
                            }
                          >
                            <Feather
                              name="minus"
                              size={16}
                              color={colors.primary}
                            />
                          </TouchableOpacity>

                          <Text style={styles.quantityText}>{quantity}</Text>

                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() =>
                              updateQuantity(item.id.toString(), 1)
                            }
                          >
                            <Feather
                              name="plus"
                              size={16}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeItem(item.id.toString())}
                        >
                          <Feather
                            name="trash-2"
                            size={20}
                            color={colors.error}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          </View>

          <View style={styles.totalSection}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalText}>Total Item</Text>
              <Text style={styles.subtotalAmount}>{getTotalItems()}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(calculateTotal())}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.orderButton} onPress={handleOrder}>
            <Feather
              name="shopping-bag"
              width={20}
              height={20}
              color={colors.card}
            />
            <Text style={styles.orderButtonText}>Pesan Sekarang</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
