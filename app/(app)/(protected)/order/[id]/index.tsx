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
  Modal,
  FlatList,
  PermissionsAndroid,
  Platform,
  Linking,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { OrderDetail, OrderItem } from "@/utils/types";
import {
  capitalizeText,
  formatCurrency,
  formatCurrency2,
  formatDatetoIndonesia,
} from "@/utils/format";
import { SafeAreaView } from "react-native-safe-area-context";
import { BLEPrinter } from "react-native-thermal-receipt-printer";
import { Picker } from "@react-native-picker/picker";

interface BluetoothDevice {
  inner_mac_address: string;
  device_name: string;
}

export default function OrderDetailsScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>(
    []
  );
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } =
    Dimensions.get("window");
  const isTablet = SCREEN_WIDTH > 600;

  useEffect(() => {
    if (id) {
      fetchOrderDetails(id as string);
    }
    return () => {
      // Cleanup: Close printer connection on component unmount
      BLEPrinter.closeConn().catch((err) =>
        console.error("Close connection error:", err)
      );
    };
  }, [id]);

  const fetchOrderDetails = async (orderId: string) => {
    try {
      setLoading(true);

      const { data: orderData, error: orderError } = await supabase
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
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            `
              first_name,
              last_name,
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

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      const enhancedItemsData = [];
      for (const item of itemsData || []) {
        let menuData = null;
        if (item.menu_id) {
          const { data: menu, error: menuError } = await supabase
            .from("menu")
            .select(
              `
                id,
                name_menu,
                price,
                description,
                images,
                category:category_id (
                  id,
                  name_category
                )
              `
            )
            .eq("id", item.menu_id)
            .single();

          if (!menuError && menu) {
            menuData = menu;
          } else {
            console.error("Error fetching menu item:", menuError);
          }
        }

        enhancedItemsData.push({
          ...item,
          menu: menuData,
        });
      }

      const transformedOrder = {
        ...orderData,
        user: userData,
      };

      setOrder(transformedOrder as OrderDetail);
      setOrderItems(enhancedItemsData as OrderItem[]);
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", "Gagal memuat detail pesanan");
    } finally {
      setLoading(false);
    }
  };
  const requestAndroid31Permissions = async () => {
    if (Platform.OS !== "android") {
      console.log("Skipping permission request for non-Android platform");
      return true;
    }

    try {
      // Define permissions with specific rationales
      const permissions = [
        {
          permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          rationale: {
            title: "Bluetooth Scan Permission",
            message:
              "This app needs to scan for Bluetooth devices to connect to your thermal printer.",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          },
        },
        {
          permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          rationale: {
            title: "Bluetooth Connect Permission",
            message:
              "This app needs to connect to your thermal printer via Bluetooth.",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          },
        },
        // {
        //   permission: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        //   rationale: {
        //     title: "Location Permission",
        //     message:
        //       "Bluetooth scanning may require location access to detect nearby devices.",
        //     buttonPositive: "OK",
        //     buttonNegative: "Cancel",
        //   },
        // },
      ];

      let allGranted = true;

      for (const { permission, rationale } of permissions) {
        // Check if permission is already granted
        const isGranted = await PermissionsAndroid.check(permission);
        console.log(`Permission ${permission} granted: ${isGranted}`);

        if (isGranted) {
          continue;
        }

        // Request permission
        const result = await PermissionsAndroid.request(permission, rationale);
        console.log(`Permission ${permission} result: ${result}`);

        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          allGranted = false;
          // Check if permission was permanently denied
          const shouldShowRationale = await PermissionsAndroid.request(
            permission
          );
          if (
            !shouldShowRationale &&
            result === PermissionsAndroid.RESULTS.DENIED
          ) {
            Alert.alert(
              "Permission Required",
              `The ${rationale.title} is required to print receipts. Please enable it in Settings.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Open Settings",
                  onPress: () => Linking.openSettings(),
                },
              ]
            );
          }
        }
      }

      return allGranted;
    } catch (error) {
      console.error("Permission request error:", error);
      Alert.alert("Error", "Failed to request permissions. Please try again.");
      return false;
    }
  };

  // Example integration with scanBluetoothDevices
  const scanBluetoothDevices = async () => {
    console.log("Starting scanBluetoothDevices");
    try {
      const hasPermission = await requestAndroid31Permissions();
      if (!hasPermission) {
        Alert.alert(
          "Permissions Required",
          "Bluetooth and location permissions are needed to scan for printers. Please grant all permissions.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      setPrinting(true);
      await BLEPrinter.init();
      const devices = await BLEPrinter.getDeviceList();
      console.log("Devices found:", devices);

      if (devices.length === 0) {
        Alert.alert(
          "Info",
          "No Bluetooth printers found. Ensure your printer is powered on and in pairing mode."
        );
      }

      setBluetoothDevices(devices);
      setModalVisible(true);
    } catch (error) {
      console.error("Scan error:", error);
      Alert.alert("Error", `Failed to scan for Bluetooth devices: ${error}`);
    } finally {
      setPrinting(false);
    }
  };

  const connectAndPrint = async (inner_mac_address: string) => {
    try {
      setPrinting(true);
      await BLEPrinter.connectPrinter(inner_mac_address);
      await printReceipt();
      setModalVisible(false);
      Alert.alert("Success", "Struk berhasil dicetak");
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", "Gagal mencetak struk");
    } finally {
      setPrinting(false);
    }
  };

  async function printReceipt() {
    if (!order) return;

    // Fetch shop details from Supabase
    let shopData = null;
    const { data, error } = await supabase
      .from("shop")
      .select("name, address, phone")
      .single();

    if (error) throw error;
    shopData = data;

    // Fungsi untuk memecah teks panjang menjadi beberapa baris
    const splitLongText = (text: string, maxLength: number): string[] => {
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = words[0] || "";

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        if (currentLine.length + word.length + 1 <= maxLength) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    const splitTextToLines = (
      text: string,
      maxLength: number,
      maxLines: number = 2
    ): string[] => {
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = words[0] || "";

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        if (currentLine.length + word.length + 1 <= maxLength) {
          currentLine += " " + word;
        } else {
          if (lines.length < maxLines - 1) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Jika sudah mencapai maxLines, gabungkan sisa kata dan tambahkan ...
            currentLine += " " + word;
            if (currentLine.length > maxLength) {
              currentLine = currentLine.substring(0, maxLength - 3) + "...";
            }
            break;
          }
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    // Format header (max 28 chars per line for 60mm paper)
    const shopName = shopData.name.toUpperCase();
    const addressLines = splitLongText(shopData.address, 32);
    const phoneText = `Telp: ${shopData.phone}`;

    let receiptText = `
  <C>=============================</C>
  <C>** ${shopName.slice(0, 32)} **</C>`;

    // Tambahkan setiap baris alamat
    addressLines.forEach((line) => {
      receiptText += `
  <C>${line}</C>`;
    });

    receiptText += `
  <C>${phoneText.slice(0, 32)}</C>
  <C>=============================</C>
  <L>INV: ${order.invoice_number.slice(0, 10)}</L>
  <L>TGL: ${formatDatetoIndonesia(order.created_at).slice(0, 15)}</L>
  <L>KASIR: ${(order.user?.first_name || "-").slice(0, 10)}</L>
  <C>-----------------------------</C>`;

    const formatReceiptLine = (
      left: string,
      right: string,
      width: number = 32
    ): string => {
      // Hitung spasi yang dibutuhkan antara konten kiri dan kanan
      const leftLen = left.length;
      const rightLen = right.length;
      const spacesNeeded = Math.max(1, width - leftLen - rightLen);
      const spaces = " ".repeat(spacesNeeded);

      return `<L>${left}${spaces}${right}</L>`;
    };

    orderItems.forEach((item) => {
      const itemName = capitalizeText(item.menu?.name_menu) || "Item";
      const quantityText = `${item.quantity}x`;
      const subtotalText = formatCurrency2(item.subtotal);

      // Buat array untuk baris nama item
      const itemNameLines = splitTextToLines(itemName, 18);

      // Format baris item dengan fixed width
      // Kolom kiri = 20 karakter, sisanya untuk harga
      const formattedLine = formatReceiptLine(
        `${quantityText} ${itemNameLines[0] || ""}`,
        subtotalText,
        32
      );
      receiptText += `\n${formattedLine}`;

      // Jika nama item terlalu panjang, tampilkan di baris berikutnya
      if (itemNameLines.length > 1) {
        receiptText += `\n<L>  ${itemNameLines[1]}</L>`;
      }
    });

    receiptText += `
  <C>-----------------------------</C>
  <L>TOTAL:<R>${formatCurrency2(order.total_amount)}</R></L>
  <C>=============================</C>
  <C>*** TERIMA KASIH ***</C>
  <C>Barang yang dibeli</C>
  <C>tidak dapat ditukar</C>`;

    try {
      await BLEPrinter.printBill(receiptText, {
        cut: true,
        beep: true,
        encoding: "GBK",
      });
    } catch (error) {
      console.error("Print error:", error);
      throw error;
    }
  }

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
                  {order.user.first_name} {order.user.last_name}
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

      {/* Bluetooth Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Printer Bluetooth</Text>
            <Text style={styles.descriptionText}>
              Pilih perangkat printer Bluetooth yang tersedia di daftar di bawah
              ini. Pastikan printer dalam mode pairing dan berada dalam
              jangkauan. Jika tidak ada perangkat yang terdeteksi, aktifkan
              Bluetooth dan coba lagi.
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedDevice}
                onValueChange={(itemValue) => setSelectedDevice(itemValue)}
                style={styles.picker}
                enabled={bluetoothDevices.length > 0}
              >
                <Picker.Item label="Pilih Printer..." value={null} />
                {bluetoothDevices.length > 0 ? (
                  bluetoothDevices.map((device) => (
                    <Picker.Item
                      key={device.inner_mac_address}
                      label={device.device_name || device.inner_mac_address}
                      value={device.inner_mac_address}
                    />
                  ))
                ) : (
                  <Picker.Item
                    label="Tidak ada printer terdeteksi"
                    value={null}
                  />
                )}
              </Picker>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={[styles.actionButtonText, styles.secondaryButtonText]}
                >
                  Batal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (!selectedDevice || printing) && { opacity: 0.5 },
                ]}
                onPress={() =>
                  selectedDevice && connectAndPrint(selectedDevice)
                }
                disabled={!selectedDevice || printing}
              >
                {printing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionButtonText}>Cetak</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
