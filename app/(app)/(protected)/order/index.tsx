import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { formatCurrency } from "@/utils/format";
import { SafeAreaView } from "react-native-safe-area-context";
import { Order } from "@/utils/types";

export default function OrderHistoryScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 10;
  
  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
  const isTablet = SCREEN_WIDTH > 600;

  const fetchOrders = useCallback(async (pageNumber = 0, refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
      } else if (pageNumber > 0) {
        setLoadingMore(true);
      }

      const from = pageNumber * LIMIT;
      const to = from + LIMIT - 1;

      const { data, error, count } = await supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Make sure data is not null
      const orderData = data || [];
      
      // Ensure each order has a unique ID
      const ordersWithCheckedIds = orderData.map((order: any) => {
        // If for some reason an order doesn't have an ID, generate a unique one
        if (!order.id) {
          order.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        }
        return order as Order;
      });

      if (refresh) {
        setOrders(ordersWithCheckedIds);
      } else {
        // Prevent duplicate orders by checking IDs
        setOrders(prevOrders => {
          const existingIds = new Set(prevOrders.map(order => order.id));
          const newOrders = ordersWithCheckedIds.filter(order => !existingIds.has(order.id));
          return [...prevOrders, ...newOrders];
        });
      }

      // Check if we've loaded all orders
      if (orderData.length < LIMIT) {
        setHasMore(false);
      }
      
      setPage(pageNumber);
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", "Gagal memuat riwayat pesanan");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchOrders(0, true);
  }, [fetchOrders]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchOrders(page + 1);
    }
  }, [fetchOrders, loadingMore, hasMore, page]);

  const handleViewOrderDetails = (order: Order) => {
    // Navigate to order details page
    router.push({
      pathname: "/(app)/(protected)/order/[id]",
      params: { id: order.id }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const orderDate = new Date(item.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    
    const orderTime = new Date(item.created_at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <TouchableOpacity
        key={`order-${item.id}`}
        style={styles.orderItem}
        onPress={() => handleViewOrderDetails(item)}
      >
        <View style={styles.orderHeader}>
          <Text style={[styles.invoiceNumber, { color: colors.primary }]}>
            {item.invoice_number}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderDate, { color: colors.text }]}>
              {orderDate} - {orderTime}
            </Text>
            <Text style={[styles.paymentMethod, { color: colors.textSecondary }]}>
              Pembayaran: {item.payment_type}
            </Text>
          </View>
          <Text style={[styles.orderAmount, { color: colors.text }]}>
            {formatCurrency(item.total_amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Memuat pesanan lainnya...
        </Text>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    headerContainer: {
      marginBottom: 16,
      marginTop: isTablet ? 0 : -40,
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center"
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    orderItem: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginHorizontal:10,
      marginBottom: 12,
      shadowColor: theme === "dark" ? "#000" : colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    orderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    invoiceNumber: {
      fontSize: 16,
      fontWeight: "bold",
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "500",
      textTransform: "capitalize",
    },
    orderDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    orderInfo: {
      flex: 1,
    },
    orderDate: {
      fontSize: 14,
      marginBottom: 4,
    },
    paymentMethod: {
      fontSize: 14,
      textTransform: "capitalize",
    },
    orderAmount: {
      fontSize: 16,
      fontWeight: "600",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    errorContainer: {
      padding: 16,
      backgroundColor: colors.error + "20",
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      color: colors.error,
      textAlign: "center",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 30,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    footerLoader: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    footerText: {
      marginLeft: 8,
      fontSize: 14,
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>
          Memuat riwayat pesanan...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}

        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Riwayat Pesanan</Text>
          <Text style={styles.headerSubtitle}>
            Lihat dan kelola semua pesanan yang telah dibuat
          </Text>
        </View>

        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => `order-item-${item.id}`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          extraData={orders.length} // Re-render when orders length changes
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                Belum ada pesanan yang dibuat
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}