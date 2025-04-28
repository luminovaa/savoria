import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/utils/supabase";
import { formatCurrency } from "@/utils/format";
import { MenuItem } from "@/utils/types";
import { Feather } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH > 600; // Define tablet as width > 600px

type InvoiceCartProps = {
  cart: { [id: string]: number };
  setCart: React.Dispatch<React.SetStateAction<{ [id: string]: number }>>;
};

export default function InvoiceCart({ cart, setCart }: InvoiceCartProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const { colors } = useTheme();

  useEffect(() => {
    // Generate a unique invoice number when component mounts
    generateUniqueInvoiceNumber();

    if (Object.keys(cart).length > 0) {
      const cartIds = Object.keys(cart);
      const existingIds = menuItems.map((item) => item.id.toString());
      const newIds = cartIds.filter((id) => !existingIds.includes(id));

      if (newIds.length > 0) {
        const fetchNewItems = async () => {
          try {
            setLoading(true);
            const { data, error } = await supabase
              .from("menu")
              .select("*")
              .in("id", newIds);

            if (error) throw error;

            setMenuItems((prev) => [...prev, ...(data || [])]);
          } catch (error) {
            console.error("Error fetching menu items for cart:", error);
          } finally {
            setLoading(false);
          }
        };

        fetchNewItems();
      }

      setMenuItems((prev) =>
        prev.filter((item) => Object.keys(cart).includes(item.id.toString()))
      );
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
        const newCart = { ...prevCart };
        delete newCart[id];
        return newCart;
      }

      return { ...prevCart, [id]: newQuantity };
    });
  };

  const removeItem = (id: string) => {
    setCart((prevCart) => {
      const newCart = { ...prevCart };
      delete newCart[id];
      return newCart;
    });
  };

  const generateRandomInvoiceNumber = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
    return `INV-${randomNum}`;
  };

  const generateUniqueInvoiceNumber = async () => {
    let isUnique = false;
    let proposedInvoiceNumber = "";

    while (!isUnique) {
      proposedInvoiceNumber = generateRandomInvoiceNumber();

      // Check if invoice number already exists in database
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .eq("invoice_number", proposedInvoiceNumber)
        .limit(1);

      if (error) {
        console.error("Error checking invoice number:", error);
        // If there's an error, we'll just use the generated number
        isUnique = true;
      } else {
        // If no data returned, the invoice number is unique
        isUnique = data.length === 0;
      }
    }

    setInvoiceNumber(proposedInvoiceNumber);
    return proposedInvoiceNumber;
  };

  const handleOrder = async () => {
    try {
      const total = calculateTotal();

      // Fetch the current user's ID from Supabase auth
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("No user is logged in");

      const userId = user.id;

      // Use the already generated unique invoice number
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          created_at: new Date().toISOString(),
          invoice_number: invoiceNumber,
          total: Object.values(cart).reduce((sum, qty) => sum + qty, 0),
          total_amount: total,
          user_id: userId,
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

      // Generate a new invoice number for the next order
      await generateUniqueInvoiceNumber();
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
      paddingHorizontal: isTablet ? 15 : 10, // Slightly less padding on phones
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
      fontSize: isTablet ? 18 : 16, // Smaller font on phones
      fontWeight: "bold",
      color: colors.text,
    },
    invoiceNumberContainer: {
      backgroundColor: colors.card,
      padding: isTablet ? 12 : 10, // Slightly less padding on phones
      borderRadius: 8,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
    },
    invoiceNumberLabel: {
      fontSize: isTablet ? 14 : 12, // Smaller font on phones
      color: colors.textSecondary,
      marginRight: 8,
    },
    invoiceNumberText: {
      fontSize: isTablet ? 16 : 14, // Smaller font on phones
      fontWeight: "bold",
      color: colors.primary,
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
      fontSize: isTablet ? 12 : 10, // Smaller font on phones
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
      marginBottom: 8,
    },
    priceContainer: {
      alignItems: "flex-end",
    },
    itemName: {
      fontSize: isTablet ? 15 : 14, // Smaller font on phones
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    priceText: {
      fontSize: isTablet ? 15 : 14, // Smaller font on phones
      fontWeight: "600",
      color: colors.text,
      textAlign: "right",
    },
    originalPrice: {
      fontSize: isTablet ? 12 : 10, // Smaller font on phones
      color: colors.textSecondary,
      textDecorationLine: "line-through",
      marginBottom: 2,
      textAlign: "right",
    },
    promoPrice: {
      fontSize: isTablet ? 15 : 14, // Smaller font on phones
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
      paddingVertical: isTablet ? 12 : 10, // Slightly less padding on phones
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    imageContainer: {
      marginRight: isTablet ? 12 : 10, // Slightly less margin on phones
      alignItems: "center",
    },
    itemImage: {
      width: isTablet ? 60 : 50, // Smaller image on phones
      height: isTablet ? 60 : 50, // Smaller image on phones
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
      paddingHorizontal: isTablet ? 8 : 6, // Slightly less padding on phones
      paddingVertical: isTablet ? 4 : 3, // Slightly less padding on phones
    },
    quantityButton: {
      padding: isTablet ? 4 : 3, // Slightly less padding on phones
      borderRadius: 15,
    },
    quantityText: {
      fontWeight: "600",
      fontSize: isTablet ? 14 : 12, // Smaller font on phones
      color: colors.text,
      marginHorizontal: isTablet ? 10 : 8, // Slightly less margin on phones
      minWidth: 20,
      textAlign: "center",
    },
    removeButton: {
      padding: isTablet ? 4 : 3, // Slightly less padding on phones
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
      fontSize: isTablet ? 14 : 12, // Smaller font on phones
      color: colors.textSecondary,
    },
    subtotalAmount: {
      fontSize: isTablet ? 14 : 12, // Smaller font on phones
      color: colors.textSecondary,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 5,
    },
    totalText: {
      fontSize: isTablet ? 18 : 16, // Smaller font on phones
      fontWeight: "bold",
      color: colors.text,
    },
    totalAmount: {
      fontSize: isTablet ? 18 : 16, // Smaller font on phones
      fontWeight: "bold",
      color: colors.primary,
    },
    orderButton: {
      marginTop: 15,
      paddingVertical: isTablet ? 12 : 10, // Slightly less padding on phones
      backgroundColor: colors.primary,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      marginBottom: 15, // Add marginBottom to ensure button is not cut off in ScrollView
    },
    orderButtonText: {
      fontSize: isTablet ? 16 : 14, // Smaller font on phones
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
      fontSize: isTablet ? 15 : 14, // Smaller font on phones
      color: colors.textSecondary,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: isTablet ? 13 : 12, // Smaller font on phones
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
    <ScrollView style={styles.container}>
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

      {menuItems.length > 0 && (
        <View style={styles.invoiceNumberContainer}>
          <Feather
            name="file-text"
            size={16}
            color={colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.invoiceNumberLabel}>Nomor Invoice:</Text>
          <Text style={styles.invoiceNumberText}>{invoiceNumber}</Text>
        </View>
      )}

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
    </ScrollView>
  );
}