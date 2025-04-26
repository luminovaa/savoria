import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/utils/supabase";
import { formatCurrency } from "@/utils/format";

interface OrderItem {
  id: string;
  created_at: string;
  quantity: number;
  subtotal: number;
  menu_id: string;
  menu: {
    name_menu: string;
    price: number;
    promo_price: number | null;
    promo: boolean;
  };
}

export default function InvoiceCart() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  const fetchOrderItems = async () => {
    try {
      setLoading(true);
      
     
      const { data: activeOrder, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'draft')
        .single();

      if (orderError || !activeOrder) {
        setOrderItems([]);
        return;
      }

      // Dapatkan order items beserta data menu terkait
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          created_at,
          quantity,
          subtotal,
          menu_id,
          menu:menu_id!inner (name_menu, price, promo_price, promo)
        `)
        .eq('order_id', activeOrder.id);

      if (error) throw error;

      setOrderItems(
        (data as any[]).map((item) => ({
          ...item,
          menu: Array.isArray(item.menu) ? item.menu[0] : item.menu,
        }))
      );
    } catch (error) {
      console.error('Error fetching order items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderItems();
    
    // Subscribe to changes in order_item table
    const subscription = supabase
      .channel('order_item_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => fetchOrderItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 15,
    },
    header: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
      color: colors.text,
    },
    itemContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemName: {
      fontSize: 16,
      color: colors.text,
    },
    itemDetails: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    totalContainer: {
      marginTop: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 20,
      color: colors.textSecondary,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pesanan Anda</Text>
      
      {orderItems.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada pesanan</Text>
      ) : (
        <>
          <FlatList
            data={orderItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.itemContainer}>
                <View>
                  <Text style={styles.itemName}>{item.menu.name_menu}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} x {formatCurrency(item.menu.promo ? item.menu.promo_price! : item.menu.price)}
                  </Text>
                </View>
                <Text style={styles.itemName}>
                  {formatCurrency(item.subtotal)}
                </Text>
              </View>
            )}
          />
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>
              Total: {formatCurrency(calculateTotal())}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}