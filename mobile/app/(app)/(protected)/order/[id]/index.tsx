import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Share,
  Dimensions,
  FlatList,
} from "react-native";
import { api } from "@/utils/api";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { OrderDetail, OrderItem } from "@/utils/types";
import {
  capitalizeText,
  formatCurrency,
} from "@/utils/format";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  buildDetailReceiptText,
  PrinterPickerModal,
  useReceiptPrinter,
} from "@/services/receipt-printer";

export default function OrderDetailsScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    modalVisible,
    setModalVisible,
    devices: bluetoothDevices,
    selectedDevice,
    setSelectedDevice,
    printing,
    scanBluetoothDevices,
    connectAndPrint: printToDevice,
  } = useReceiptPrinter({
    permissionRequiredTitle: "Permissions Required",
    permissionRequiredMessage:
      "Bluetooth and location permissions are needed to scan for printers. Please grant all permissions.",
    permissionSettingsLabel: "Open Settings",
    noPrinterMessage:
      "No Bluetooth printers found. Ensure your printer is powered on and in pairing mode.",
    scanErrorPrefix: "Failed to scan for Bluetooth devices",
  });

  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } =
    Dimensions.get("window");
  const isTablet = SCREEN_WIDTH > 600;

  useEffect(() => {
    if (id) {
      fetchOrderDetails(id as string);
    }
    
  }, [id]);

  const fetchOrderDetails = async (orderId: string) => {
    try {
      setLoading(true);

      const { data: orderData, error: orderError } = await api
        .from("orders")
        .select(
          `
            *,
            user:user_id (
              id
            )
          `
        )
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      let userData = null;
      if (orderData.user_id) {
        const { data: profileData, error: profileError } = await api
          .from("profiles")
          .select(
            `
              full_name,
              role_id
            `
          )
          .eq("id", orderData.user_id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        } else {
          userData = {
            ...profileData,
            email: "",
          };
        }
      }

      const transformedOrder = {
        ...orderData,
        user: userData,
      };

      setOrder(transformedOrder as OrderDetail);
      setOrderItems((orderData.items || []) as OrderItem[]);
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", "Gagal memuat detail pesanan");
    } finally {
      setLoading(false);
    }
  };
  const connectAndPrint = async (inner_mac_address: string) => {
    try {
      if (!order) return;
      const { data: shopData, error } = await api
        .from("shop")
        .select("name, address, phone, wifi_name, wifi_password")
        .single();

      if (error) throw error;
      const receiptText = buildDetailReceiptText({
        shopData,
        order,
        items: orderItems,
      });

      await printToDevice(inner_mac_address, receiptText);
      setModalVisible(false);
      Alert.alert("Success", "Struk berhasil dicetak");
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", "Gagal mencetak struk");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return colors.success;
      case "cancelled":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleShareOrder = async () => {
    if (!order) return;

    try {
      const itemsList = orderItems
        .map(
          (item) =>
            `- ${item.menu?.name_menu || "Item"} (${
              item.quantity
            }x) ${formatCurrency(item.subtotal)}`
        )
        .join("\n");

      const message = `Detail Pesanan
          Invoice: ${order.invoice_number}
          Tanggal: ${formatDate(order.created_at)}
           Status: ${order.status}
           Pembayaran: ${order.payment_type}
           Total: ${formatCurrency(order.total_amount)}
           Dibayar: ${formatCurrency(order.paid || 0)}
           Kembalian: ${formatCurrency(order.changes || 0)}

           Item Pesanan:
           ${itemsList}`;

      await Share.share({
        message,
        title: `Pesanan ${order.invoice_number}`,
      });
    } catch (error) {
      Alert.alert("Error", "Gagal membagikan pesanan");
    }
  };

  const handlePrintReceipt = () => {
    scanBluetoothDevices();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      marginTop: isTablet ? 0 : -40,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    backButton: {
      padding: 8,
    },
    content: {
      flex: 1,
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    orderInfo: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
      textAlign: "right",
    },
    statusValue: {
      fontSize: 14,
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    itemsList: {
      marginTop: 8,
    },
    itemCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    itemCategory: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    itemPrice: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    itemMeta: {
      alignItems: "flex-end",
    },
    itemQuantity: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      marginBottom: 4,
    },
    itemSubtotal: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    summarySection: {
      padding: 16,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 8,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.text,
    },
    summaryValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    totalValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primary,
    },
    actions: {
      flexDirection: "row",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      marginHorizontal: 4,
    },
    secondaryButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      color: colors.buttonText,
      fontWeight: "600",
      marginLeft: 8,
    },
    secondaryButtonText: {
      color: colors.text,
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
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      width: isTablet ? "60%" : "90%",
      maxHeight: SCREEN_HEIGHT * 0.7,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    descriptionText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
      textAlign: "center",
    },
    pickerContainer: {
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    picker: {
      height: 50,
      width: "100%",
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 20,
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>
          Memuat detail pesanan...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Detail Pesanan</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Detail Pesanan</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.content}>
          <View style={[styles.errorContainer]}>
            <Text style={[styles.errorText]}>Pesanan tidak ditemukan</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Detail Pesanan</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleShareOrder}>
          <Feather name="share-2" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pesanan</Text>
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>No. Invoice</Text>
              <Text style={styles.infoValue}>{order.invoice_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pelanggan</Text>
              <Text style={styles.infoValue}>{order.customer || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal</Text>
              <Text style={styles.infoValue}>
                {formatDate(order.created_at)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Metode Pembayaran</Text>
              <Text style={styles.infoValue}>
                {capitalizeText(order.payment_type)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text
                style={[
                  styles.statusValue,
                  {
                    backgroundColor: getStatusColor(order.status) + "20",
                    color: getStatusColor(order.status),
                  },
                ]}
              >
                {capitalizeText(order.status)}
              </Text>
            </View>
            {order.user && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Kasir</Text>
                <Text style={styles.infoValue}>
                  {order.user.full_name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Pesanan</Text>
          <View style={styles.itemsList}>
            {orderItems.length > 0 ? (
              orderItems.map((item) => (
                <View style={styles.itemCard} key={item.id}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                      {item.menu?.name_menu || "Item Menu"}
                    </Text>
                    {item.menu?.category && (
                      <Text style={styles.itemCategory}>
                        {capitalizeText(item.menu.category.name_category)}
                      </Text>
                    )}
                    <Text style={styles.itemPrice}>
                      {formatCurrency(item.price)}
                    </Text>
                  </View>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                    <Text style={styles.itemSubtotal}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.infoLabel, { textAlign: "center" }]}>
                Tidak ada item pesanan
              </Text>
            )}
          </View>
        </View>

        {/* Order Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Ringkasan Pembayaran</Text>
          <View style={styles.orderInfo}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Item</Text>
              <Text style={styles.summaryValue}>{order.total || 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(order.total_amount || 0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Dibayar</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(order.paid || 0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kembalian</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(order.changes || 0)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(order.total_amount || 0)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleBackPress}
        >
          <Feather name="arrow-left" size={18} color={colors.text} />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Kembali
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handlePrintReceipt}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="printer" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Cetak Struk</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <PrinterPickerModal
        animationType="slide"
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        devices={bluetoothDevices}
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
        onPrint={() => selectedDevice && connectAndPrint(selectedDevice)}
        printing={printing}
        styles={styles}
        description={
          "Pilih perangkat printer Bluetooth yang tersedia di daftar di bawah\nini. Pastikan printer dalam mode pairing dan berada dalam\njangkauan. Jika tidak ada perangkat yang terdeteksi, aktifkan\nBluetooth dan coba lagi."
        }
      />
    </SafeAreaView>
  );
}
