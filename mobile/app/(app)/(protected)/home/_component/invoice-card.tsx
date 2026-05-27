import React, { memo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
  PermissionsAndroid,
  Platform,
  Linking,
  Alert,
  TextInput,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/utils/api";
import { submitOrder } from "@/services/order-service";
import { useQueryClient } from "@tanstack/react-query";
import FastImage from "react-native-fast-image";
import {
  capitalizeText,
  formatCurrency,
  formatCurrency2,
  formatDatetoIndonesia,
  formatDatetoIndonesia2,
  parseCurrency,
} from "@/utils/format";
import { Feather } from "@expo/vector-icons";
import { BLEPrinter } from "react-native-thermal-receipt-printer";
import { Picker } from "@react-native-picker/picker";
import { MenuItem } from "@/utils/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH > 600;

type InvoiceCartProps = {
  cart: { [id: string]: number };
  setCart: React.Dispatch<React.SetStateAction<{ [id: string]: number }>>;
};

interface BluetoothDevice {
  inner_mac_address: string;
  device_name: string;
}

export default function InvoiceCart({ cart, setCart }: InvoiceCartProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>(
    []
  );
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "qris">("cash");
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [changes, setChanges] = useState<number | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const clientOrderId = useRef<string | null>(null);

  const fetchMenuItems = async (cartIds: string[]) => {
    try {
      setLoading(true);
      const data = await queryClient.fetchQuery({
        queryKey: ["checkout-menus", cartIds.sort().join(",")],
        staleTime: 2 * 60 * 1000,
        queryFn: async () => {
          const { data, error } = await api
          .from("menu")
          .select("id, name_menu, price, promo, promo_price, images, stock")
          .in("id", cartIds);
          if (error) throw error;
          return (data || []) as MenuItem[];
        },
      });
      setMenuItems(data);
    } catch (error) {
      console.error("Error fetching menu items for cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Object.keys(cart).length > 0) {
      fetchMenuItems(Object.keys(cart));
    } else {
      setMenuItems([]);
      setLoading(false);
      clientOrderId.current = null;
      setInvoiceNumber("");
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

  const handleOrder = async () => {
    try {
      // Validasi pembayaran
      if (
        paymentType === "cash" &&
        (!paidAmount || paidAmount < calculateTotal())
      ) {
        Alert.alert("Error", "Jumlah pembayaran tidak mencukupi");
        return;
      }

      clientOrderId.current =
        clientOrderId.current ||
        `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setPrinting(true);
      const order = await submitOrder({
        client_order_id: clientOrderId.current,
        items: menuItems.map((item) => ({
          menu_id: item.id,
          quantity: cart[item.id.toString()],
        })),
        payment_type: paymentType,
        paid: paymentType === "cash" ? paidAmount : null,
      });
      setInvoiceNumber(order.invoice_number);
      setChanges(order.changes);
      setConfirmedTotal(order.total_amount);
      await queryClient.invalidateQueries({ queryKey: ["menus"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      Alert.alert("Transaksi Tersimpan", "Pilih printer untuk mencetak struk.");
      await scanBluetoothDevices();
    } catch (error) {
      console.error("Error processing order:", error);
      Alert.alert(
        "Transaksi Belum Tercatat",
        "Checkout gagal. Periksa koneksi lalu coba lagi; struk belum dapat dicetak."
      );
    } finally {
      setPrinting(false);
    }
  };

  const requestAndroid31Permissions = async () => {
    if (Platform.OS !== "android") {
      console.log("Skipping permission request for non-Android platform");
      return true;
    }

    try {
      const permissions = [
        {
          permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          rationale: {
            title: "Bluetooth Scan Permission",
            message:
              "Aplikasi memerlukan izin untuk memindai perangkat Bluetooth untuk menghubungkan ke printer.",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          },
        },
        {
          permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          rationale: {
            title: "Bluetooth Connect Permission",
            message:
              "Aplikasi memerlukan izin untuk menghubungkan ke printer Bluetooth.",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          },
        },
      ];

      let allGranted = true;

      for (const { permission, rationale } of permissions) {
        const isGranted = await PermissionsAndroid.check(permission);
        console.log(`Permission ${permission} granted: ${isGranted}`);

        if (isGranted) {
          continue;
        }

        const result = await PermissionsAndroid.request(permission, rationale);
        console.log(`Permission ${permission} result: ${result}`);

        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          allGranted = false;
          const shouldShowRationale = await PermissionsAndroid.request(
            permission
          );
          if (
            !shouldShowRationale &&
            result === PermissionsAndroid.RESULTS.DENIED
          ) {
            Alert.alert(
              "Izin Diperlukan",
              `Izin ${rationale.title} diperlukan untuk mencetak struk. Silakan aktifkan di Pengaturan.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Buka Pengaturan",
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
      Alert.alert("Error", "Gagal meminta izin. Silakan coba lagi.");
      return false;
    }
  };

  const scanBluetoothDevices = async () => {
    console.log("Starting scanBluetoothDevices");
    try {
      const hasPermission = await requestAndroid31Permissions();
      if (!hasPermission) {
        Alert.alert(
          "Izin Diperlukan",
          "Izin Bluetooth diperlukan untuk memindai printer. Silakan berikan semua izin yang diminta.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Buka Pengaturan", onPress: () => Linking.openSettings() },
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
          "Tidak ada printer Bluetooth yang ditemukan. Pastikan printer dalam mode pairing dan dinyalakan."
        );
      }

      setBluetoothDevices(devices);
      setModalVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/No Device Found/i.test(message)) {
        console.warn("No Bluetooth printer found");
        Alert.alert(
          "Info",
          "Pesanan tersimpan, tetapi tidak ada printer Bluetooth yang ditemukan."
        );
        return;
      }

      console.error("Scan error:", error);
      Alert.alert("Error", `Gagal memindai perangkat Bluetooth: ${message}`);
    } finally {
      setPrinting(false);
    }
  };

  const connectAndPrint = async (inner_mac_address: string) => {
    try {
      setPrinting(true);
      await BLEPrinter.connectPrinter(inner_mac_address);

      const total = confirmedTotal ?? calculateTotal();
      await printReceipt(total, paidAmount, changes);

      // Clear cart and close modal on success
      setModalVisible(false);
      setCart({});
      setPaidAmount(null);
      setChanges(null);
      setConfirmedTotal(null);
      setInvoiceNumber("");
      clientOrderId.current = null;
      Alert.alert("Sukses", "Pesanan tersimpan dan struk berhasil dicetak");
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", "Pesanan sudah tersimpan, tetapi struk gagal dicetak");
    } finally {
      setPrinting(false);
    }
  };

  async function printReceipt(
    total: number,
    paid: number | null,
    changes: number | null
  ) {
    try {
      const { data: shopData, error: shopError } = await api
        .from("shop")
        .select("name, address, phone, wifi_name, wifi_password")
        .single();

      if (shopError) throw shopError;

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

      const formatReceiptLine = (
        left: string,
        right: string,
        width: number = 32
      ): string => {
        const leftLen = left.length;
        const rightLen = right.length;
        const spacesNeeded = Math.max(1, width - leftLen - rightLen);
        const spaces = " ".repeat(spacesNeeded);

        return `<L>${left}${spaces}${right}</L>`;
      };

      const shopName = shopData.name.toUpperCase();
      const addressLines = splitLongText(shopData.address, 32);
      const phoneText = `Telp: ${shopData.phone}`;

      let receiptText = `
  <C>=============================</C>
  <C>** ${shopName.slice(0, 32)} **</C>`;

      addressLines.forEach((line) => {
        receiptText += `
  <C>${line}</C>`;
      });

      receiptText += `
  <C>${phoneText.slice(0, 32)}</C>
  <C>=============================</C>
  <L>INV: ${invoiceNumber.slice(0, 15)}</L>
  <L>TGL: ${formatDatetoIndonesia(
    new Date().toISOString()
  )} - ${formatDatetoIndonesia2(new Date().toISOString())} </L>
  <L>TIPE: ${paymentType.toUpperCase().slice(0, 10)}</L>
  <C>-----------------------------</C>`;

      menuItems.forEach((item) => {
        const itemName = capitalizeText(item.name_menu) || "Item";
        const quantityText = `${cart[item.id.toString()]}x`;
        const subtotalText = formatCurrency2(
          calculateSubtotal(item, cart[item.id.toString()])
        );

        const itemNameLines = splitTextToLines(itemName, 18);

        const formattedLine = formatReceiptLine(
          `${quantityText} ${itemNameLines[0] || ""}`,
          subtotalText,
          32
        );
        receiptText += `\n${formattedLine}`;

        if (itemNameLines.length > 1) {
          receiptText += `\n<L>  ${itemNameLines[1]}</L>`;
        }
      });
      receiptText += `
<C>-----------------------------</C>
<L>TOTAL:<R>${formatCurrency2(total)}</R></L>`;
      if (paid !== null) {
        receiptText += `
<L>DIBAYAR:<R>${formatCurrency2(paid)}</R></L>`;
        if (changes! > 0) {
          receiptText += `
<C>-----------------------------</C>
<L>KEMBALI:<R>${formatCurrency2(changes || 0)}</R></L>`;
        }
      }

      receiptText += `
<C>=============================</C>
<C>*** TERIMA KASIH ***</C>
<C>Barang yang dibeli</C>
<C>tidak dapat ditukar</C>`;
      if (shopData.wifi_name) {
        receiptText += `
  <C>-----------------------------</C>
  <C>Wifi: ${shopData.wifi_name.slice(0, 32)}</C>`;

        if (shopData.wifi_password) {
          receiptText += `
    <C>Password: ${shopData.wifi_password.slice(0, 32)}</C>`;
        }
      }

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

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const styles = StyleSheet.create({
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
      maxHeight: "70%",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
      textAlign: "center",
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
    container: {
      flex: isTablet ? 1 : 0,
      paddingHorizontal: isTablet ? 0 : 10,
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
      flexDirection: "row",
      alignItems: "center",
      marginRight: 10,
      marginBottom: -10,
      color: colors.primary,
    },
    headerText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text,
    },
    invoiceNumberContainer: {
      backgroundColor: colors.card,
      padding: isTablet ? 8 : 10,
      borderRadius: 8,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    invoiceNumberLabel: {
      fontSize: isTablet ? 13 : 12,
      color: colors.textSecondary,
      marginRight: 8,
    },
    invoiceNumberText: {
      fontSize: isTablet ? 13 : 14,
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
      fontSize: isTablet ? 12 : 10,
    },
    listContainer: {
      flexGrow: 0,
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
      fontSize: isTablet ? 13 : 14,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    priceText: {
      fontSize: isTablet ? 13 : 14,
      fontWeight: "600",
      color: colors.text,
      textAlign: "right",
    },
    originalPrice: {
      fontSize: isTablet ? 12 : 10,
      color: colors.textSecondary,
      textDecorationLine: "line-through",
      marginBottom: 2,
      textAlign: "right",
    },
    promoPrice: {
      fontSize: isTablet ? 13 : 14,
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
      paddingVertical: isTablet ? 12 : 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    imageContainer: {
      marginRight: isTablet ? 12 : 10,
      alignItems: "center",
    },
    itemImage: {
      width: isTablet ? 40 : 50,
      height: isTablet ? 40 : 50,
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
      paddingHorizontal: isTablet ? 4 : 6,
      paddingVertical: isTablet ? 4 : 3,
    },
    quantityButton: {
      padding: isTablet ? 2 : 3,
      borderRadius: 15,
    },
    quantityText: {
      fontWeight: "600",
      fontSize: isTablet ? 12 : 12,
      color: colors.text,
      marginHorizontal: isTablet ? 10 : 8,
      minWidth: 20,
      textAlign: "center",
    },
    removeButton: {
      padding: isTablet ? 4 : 3,
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
      fontSize: isTablet ? 13 : 12,
      color: colors.textSecondary,
    },
    subtotalAmount: {
      fontSize: isTablet ? 14 : 12,
      color: colors.textSecondary,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 5,
    },
    totalText: {
      fontSize: isTablet ? 15 : 16,
      fontWeight: "bold",
      color: colors.text,
    },
    totalAmount: {
      fontSize: isTablet ? 15 : 16,
      fontWeight: "bold",
      color: colors.primary,
    },
    orderButton: {
      marginTop: 15,
      paddingVertical: isTablet ? 12 : 10,
      backgroundColor: colors.primary,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      marginBottom: 15,
    },
    orderButtonText: {
      fontSize: isTablet ? 13 : 14,
      fontWeight: "bold",
      color: colors.card,
      marginLeft: 8,
    },
    emptyContainer: {
      flex: isTablet ? 1 : 0,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 30,
    },
    emptyIcon: {
      color: colors.border,
      marginBottom: 15,
    },
    emptyText: {
      fontSize: isTablet ? 15 : 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: isTablet ? 13 : 12,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 5,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    paymentTypeContainer: {
      marginTop: 15,
    },
    paymentTypeLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    paymentPickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.card,
    },

    pickerItem: {
      color: colors.text,
      backgroundColor: colors.card,
    },
    paymentInputContainer: {
      marginTop: 15,
      marginBottom: 10,
    },
    paymentLabel: {
      fontSize: isTablet ? 15 : 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    paymentInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: isTablet ? 15 : 14,
      color: colors.text,
      backgroundColor: colors.card,
    },
    changesText: {
      marginTop: 8,
      fontSize: isTablet ? 14 : 13,
      color: colors.text,
      fontWeight: "bold",
      textAlign: "right",
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  type RenderItemProps = {
    item: MenuItem;
    cart: { [id: string]: number };
    updateQuantity: (id: string, delta: number) => void;
    removeItem: (id: string) => void;
    colors: any;
    styles: any;
  };

  const RenderItem = memo(
    ({
      item,
      cart,
      updateQuantity,
      removeItem,
      colors,
      styles,
    }: RenderItemProps) => {
      const quantity = cart[item.id.toString()];
      const isPromo = item.promo && item.promo_price;

      return (
        <View style={styles.itemContainer}>
          <View style={styles.imageContainer}>
            {/* <Image
              source={{ uri: item.images }}
              style={styles.itemImage}
              resizeMode={FastImage.resizeMode.cover}
            /> */}
            <FastImage
              source={{
                uri: item.images,
                priority: FastImage.priority.low,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.itemImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.itemNameContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={3}>
                  {capitalizeText(item.name_menu)}
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
                  onPress={() => updateQuantity(item.id.toString(), -1)}
                >
                  <Feather name="minus" size={13} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id.toString(), 1)}
                >
                  <Feather name="plus" size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeItem(item.id.toString())}
              >
                <Feather name="trash-2" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
  );

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

      {menuItems.length > 0 && invoiceNumber !== "" && (
        <View style={styles.invoiceNumberContainer}>
          <Feather
            name="file-text"
            size={16}
            color={colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.invoiceNumberLabel}>Invoice:</Text>
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
              renderItem={({ item }) => (
                <RenderItem
                  item={item}
                  cart={cart}
                  updateQuantity={updateQuantity}
                  removeItem={removeItem}
                  colors={colors}
                  styles={styles}
                />
              )}
              scrollEnabled={false}
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
            <View style={styles.paymentInputContainer}>
              <Text style={styles.paymentLabel}>Bayar</Text>
              <TextInput
                style={[styles.paymentInput, { borderColor: colors.border }]}
                value={paidAmount ? formatCurrency(paidAmount) : ""}
                onChangeText={(text) => {
                  const num = parseCurrency(text);
                  setPaidAmount(num > 0 ? num : null);
                  if (num > 0) {
                    setChanges(num - calculateTotal());
                  } else {
                    setChanges(null);
                  }
                }}
                keyboardType="numeric"
                placeholder="Masukkan jumlah bayar"
                placeholderTextColor={colors.textSecondary}
              />
              {changes !== null && changes >= 0 && (
                <Text style={styles.changesText}>
                  Kembalian: {formatCurrency(changes)}
                </Text>
              )}
              {changes !== null && changes < 0 && (
                <Text style={[styles.changesText, { color: colors.error }]}>
                  Kurang: {formatCurrency(Math.abs(changes))}
                </Text>
              )}
            </View>
            <View style={styles.paymentTypeContainer}>
              <Text style={styles.paymentTypeLabel}>Tipe Pembayaran</Text>
              <View style={styles.paymentPickerContainer}>
                <Picker
                  selectedValue={paymentType}
                  onValueChange={(itemValue: "cash" | "qris") =>
                    setPaymentType(itemValue)
                  }
                  style={styles.picker}
                >
                  <Picker.Item
                    style={styles.pickerItem}
                    label="Cash"
                    value="cash"
                  />
                  <Picker.Item
                    style={styles.pickerItem}
                    label="QRIS"
                    value="qris"
                  />
                </Picker>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.orderButton}
            onPress={handleOrder}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Feather
                  name="shopping-bag"
                  width={20}
                  height={20}
                  color={colors.card}
                />
                <Text style={styles.orderButtonText}>Pesan Sekarang</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      <Modal
        animationType="fade"
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
              jangkauan.
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
    </ScrollView>
  );
}
