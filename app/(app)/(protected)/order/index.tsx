import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { Picker } from '@react-native-picker/picker';

export default function OrderHistoryScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 10;
  const [userRole, setUserRole] = useState<string | null>(null); 

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
  const isTablet = SCREEN_WIDTH > 600;

  const stats = useMemo(() => {
    
    if (!allOrders.length) {
      return {
        todayOrders: 0,
        todayRevenue: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrdersArray = allOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      const isToday = orderDate.getTime() === today.getTime();
      const isNotCancelled = order.status.toLowerCase() !== 'cancelled';
      return isToday && isNotCancelled;
    });

    const todayRevenue = todayOrdersArray.reduce((sum, order) => 
      sum + (order.total_amount || 0), 0);

    const monthlyOrdersArray = allOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate.getMonth() + 1 === selectedMonth && 
             orderDate.getFullYear() === selectedYear &&
             order.status.toLowerCase() !== 'cancelled';
    });

    const monthlyRevenue = monthlyOrdersArray.reduce((sum, order) => 
      sum + (order.total_amount || 0), 0);

    const yearlyOrdersArray = allOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate.getFullYear() === selectedYear &&
             order.status.toLowerCase() !== 'cancelled';
    });

    const yearlyRevenue = yearlyOrdersArray.reduce((sum, order) => 
      sum + (order.total_amount || 0), 0);

    const result = {
      todayOrders: todayOrdersArray.length,
      todayRevenue,
      monthlyRevenue,
      yearlyRevenue
    };

    return result;
  }, [allOrders, selectedMonth, selectedYear]);

   const fetchUserRole = useCallback(async () => {
    try {
      // Ambil data pengguna yang sedang login
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Gagal mendapatkan data pengguna");

      // Ambil data profil pengguna berdasarkan user.id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) throw new Error("Gagal mendapatkan data profil");

      // Ambil nama role dari tabel role berdasarkan role_id
      const { data: role, error: roleError } = await supabase
        .from("role")
        .select("name")
        .eq("id", profile.role_id)
        .single();

      if (roleError || !role) throw new Error("Gagal mendapatkan data role");

      setUserRole(role.name);
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", "Gagal memuat data role pengguna");
    }
  }, []);


  const fetchAllOrders = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Error fetching all orders:', error);
        throw error;
      }

      const orderData = data || [];
      
      setAllOrders(orderData);
      return orderData;
    } catch (error: any) {
      console.error('fetchAllOrders error:', error);
      setError(error.message);
      Alert.alert("Error", "Gagal memuat data pesanan");
      return [];
    }
  }, []);

  const fetchOrders = useCallback(async (pageNumber = 0, refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
      } else if (pageNumber > 0) {
        setLoadingMore(true);
      }

      const from = pageNumber * LIMIT;
      const to = from + LIMIT - 1;

      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      endDate.setHours(23, 59, 59, 999);

      query = query.gte('created_at', startDate.toISOString())
                   .lte('created_at', endDate.toISOString());

      if (pageNumber > 0) {
        query = query.range(from, to);
      } else {
        query = query.limit(LIMIT);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const orderData = data || [];
      
      const ordersWithCheckedIds = orderData.map((order: any) => {
        if (!order.id) {
          order.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        }
        return order as Order;
      });

      if (refresh) {
        setOrders(ordersWithCheckedIds);
      } else {
        setOrders(prevOrders => {
          const existingIds = new Set(prevOrders.map(order => order.id));
          const newOrders = ordersWithCheckedIds.filter(order => !existingIds.has(order.id));
          return [...prevOrders, ...newOrders];
        });
      }

      if (orderData.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
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
  }, [selectedMonth, selectedYear]);

  // Initial load - fetch all orders first, then filtered orders
  useEffect(() => {
    const loadInitialData = async () => {
      // Fetch all orders first for stats
      await fetchAllOrders();
      // Then fetch filtered orders for display
      await fetchOrders(0, true);
    };
    
    loadInitialData();
    fetchUserRole();
  }, []); // Only run once on mount

  // When month/year changes, only fetch filtered orders (allOrders already loaded)
  useEffect(() => {
    if (allOrders.length > 0) { // Only if we already have all orders loaded
      fetchOrders(0, true);
    }
  }, [selectedMonth, selectedYear]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    
    // Fetch all orders first for updated stats
    await fetchAllOrders();
    // Then fetch filtered orders
    await fetchOrders(0, true);
  }, [fetchOrders, fetchAllOrders]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchOrders(page + 1);
    }
  }, [fetchOrders, loadingMore, hasMore, page]);

  const handleViewOrderDetails = (order: Order) => {
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

  const renderMonthPicker = () => {
    const months = [
      { label: 'Januari', value: 1 },
      { label: 'Februari', value: 2 },
      { label: 'Maret', value: 3 },
      { label: 'April', value: 4 },
      { label: 'Mei', value: 5 },
      { label: 'Juni', value: 6 },
      { label: 'Juli', value: 7 },
      { label: 'Agustus', value: 8 },
      { label: 'September', value: 9 },
      { label: 'Oktober', value: 10 },
      { label: 'November', value: 11 },
      { label: 'Desember', value: 12 },
    ];

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear; i++) {
      years.push({ label: i.toString(), value: i });
    }

    return (
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <View style={[styles.pickerContainer, { marginRight: 8 }]}>
            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Bulan</Text>
            <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(value) => setSelectedMonth(value)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                {months.map((month) => (
                  <Picker.Item key={`month-${month.value}`} label={month.label} value={month.value} />
                ))}
              </Picker>
            </View>
          </View>
          
          <View style={styles.pickerContainer}>
            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Tahun</Text>
            <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(value) => setSelectedYear(value)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                {years.map((year) => (
                  <Picker.Item key={`year-${year.value}`} label={year.label} value={year.value} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderStatCards = () => {
    return (
      <View style={styles.statsContainer}>
        {isTablet ? (
          // Single row for tablets
            <View style={[styles.statsRow, styles.statsRowTablet]}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Penjualan Hari Ini</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.todayOrders}</Text>
              <Text style={[styles.statUnit, { color: colors.primary }]}>Pesanan</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendapatan Hari Ini</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.todayRevenue)}</Text>
            </View>
            {(userRole !== 'Kasir') && (
              <>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendapatan Bulan Ini</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.monthlyRevenue)}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendapatan Tahun Ini</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.yearlyRevenue)}</Text>
              </View>
              </>
            )}
            </View>
        ) : (
          // Two rows for mobile phones
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Penjualan Hari Ini</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.todayOrders}</Text>
                <Text style={[styles.statUnit, { color: colors.primary }]}>Pesanan</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendapatan Hari Ini</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.todayRevenue)}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendapatan Bulan Ini</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.monthlyRevenue)}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendapatan Tahun Ini</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.yearlyRevenue)}</Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
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
              {item.payment_type}
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
    },
       
    filterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
    },
    filterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    pickerContainer: {
      flex: 1,
    },
    pickerLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    picker: {
      borderRadius: 8,
      borderWidth: 1,
      overflow: "hidden",
    },
    statsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    statsRowTablet: {
      marginBottom: 0, // Remove extra margin for single row on tablets
    },
    statCard: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      marginHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme === "dark" ? "#000" : colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      minWidth: isTablet ? 150 : undefined, // Ensure cards don't get too narrow on tablets
    },
    statLabel: {
      fontSize: 12,
      textAlign: "center",
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "bold",
      textAlign: "center",
    },
    statUnit: {
      fontSize: 11,
      marginTop: 2,
    },
    listContainer: {
      flex: 1,
      paddingTop: 8,
    },
    orderItem: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: isTablet? 10 : 16,
      paddingHorizontal: isTablet? 15 : 16,
      marginHorizontal: 16,
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
      marginBottom: isTablet ? 8 : 12,
    },
    invoiceNumber: {
      fontSize: isTablet ? 14 : 16,
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
      fontSize: isTablet? 12 : 14,
      marginBottom: 4,
    },
    paymentMethod: {
      fontSize: isTablet? 12 : 14,
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
      margin: 16,
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

  if (loading && !refreshing) {
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
      {/* Filter Section */}
      {renderMonthPicker()}
      
      {/* Statistics Cards - Hanya ditampilkan jika role adalah 'Owner' */}
      {renderStatCards()}

      {/* Order List */}
      <View style={styles.listContainer}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}

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
          extraData={orders.length} 
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                Tidak ada pesanan untuk periode ini
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}