import React, { memo, useEffect, useMemo, useRef, useState } from "react";
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
  parseCurrency,
} from "@/utils/format";
import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { MenuItem } from "@/utils/types";
import {
  buildCheckoutReceiptText,
  PrinterPickerModal,
  useReceiptPrinter,
} from "@/services/receipt-printer";
import { useAuth } from "@/context/auth-provider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH > 600;

function isPromoActive(item: MenuItem) {
  if (!item.promo || item.promo_price === null || item.promo_price === undefined || !item.promo_start || !item.promo_end) return false;
  const today = new Date();
  const promoStart = new Date(item.promo_start);
  const promoEnd = new Date(item.promo_end);
  const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const normalizedToday = normalizeDate(new Date(today.getTime() + (7 * 60 - today.getTimezoneOffset()) * 60 * 1000));
  return normalizedToday >= normalizeDate(promoStart) && normalizedToday <= normalizeDate(promoEnd);
}

type InvoiceCartProps = {
  cart: { [id: string]: number };
  setCart: React.Dispatch<React.SetStateAction<{ [id: string]: number }>>;
};

export default function InvoiceCart({ cart, setCart }: InvoiceCartProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshingMenus, setIsRefreshingMenus] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    modalVisible,
    setModalVisible,
    devices: bluetoothDevices,
    selectedDevice,
    setSelectedDevice,
    printing,
    setPrinting,
    scanBluetoothDevices,
    connectAndPrint: printToDevice,
  } = useReceiptPrinter({
    permissionRequiredTitle: "Izin Diperlukan",
    permissionRequiredMessage:
      "Izin Bluetooth diperlukan untuk memindai printer. Silakan berikan semua izin yang diminta.",
    permissionSettingsLabel: "Buka Pengaturan",
    noPrinterMessage:
      "Tidak ada printer Bluetooth yang ditemukan. Pastikan printer dalam mode pairing dan dinyalakan.",
    scanErrorPrefix: "Gagal memindai perangkat Bluetooth",
    noDevicePatternMessage:
      "Pesanan tersimpan, tetapi tidak ada printer Bluetooth yang ditemukan.",
  });
  const [paymentType, setPaymentType] = useState<"cash" | "qris">("cash");
  const [customer, setCustomer] = useState("");
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [changes, setChanges] = useState<number | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const clientOrderId = useRef<string | null>(null);
  const fetchVersion = useRef(0);
  const cartIds = useMemo(
    () => Object.keys(cart).filter((id) => (cart[id] || 0) > 0).sort(),
    [cart]
  );
  const cartKey = cartIds.join(",");

  const fetchMenuItems = async (cartIds: string[]) => {
    const requestVersion = ++fetchVersion.current;
    const sortedCartIds = [...cartIds].sort();
    try {
      if (menuItems.length === 0) {
        setInitialLoading(true);
      }
      setIsRefreshingMenus(true);
      const data = await queryClient.fetchQuery({
        queryKey: ["checkout-menus", sortedCartIds.join(",")],
        staleTime: 2 * 60 * 1000,
        queryFn: async () => {
          const { data, error } = await api
            .from("menu")
            .select("id, name_menu, price, promo, promo_price, promo_start, promo_end, images, stock")
            .in("id", sortedCartIds);
          if (error) throw error;
          return (data || []) as MenuItem[];
        },
      });
      if (requestVersion === fetchVersion.current) {
        setMenuItems(data);
      }
    } catch (error) {
      console.error("Error fetching menu items for cart:", error);
    } finally {
      if (requestVersion === fetchVersion.current) {
        setInitialLoading(false);
        setIsRefreshingMenus(false);
      }
    }
  };

  useEffect(() => {
    if (cartIds.length > 0) {
      fetchMenuItems(cartIds);
    } else {
      fetchVersion.current += 1;
      setMenuItems([]);
      setInitialLoading(false);
      setIsRefreshingMenus(false);
      clientOrderId.current = null;
      setInvoiceNumber("");
      setCustomer("");
      setConfirmedOrderId(null);
    }
  }, [cartKey]);

  const calculateSubtotal = (item: MenuItem, quantity: number) => {
    const price = isPromoActive(item) ? item.promo_price! : item.price;
    return price * quantity;
  };

  const calculateTotal = () => {
    return menuItems.reduce((sum, item) => {
      const quantity = cart[item.id.toString()] || 0;
      return sum + calculateSubtotal(item, quantity);
    }, 0);
  };

  const getValidatedCartItems = (showAlert = true) => {
    const itemsByID = new Map(menuItems.map((item) => [item.id.toString(), item]));
    const missingIds = cartIds.filter((id) => !itemsByID.has(id));

    if (cartIds.length === 0) {
      if (showAlert) Alert.alert("Error", "Belum ada item di keranjang");
      return null;
    }

    if (isRefreshingMenus || missingIds.length > 0 || menuItems.length !== cartIds.length) {
      if (showAlert) {
        Alert.alert(
          "Data menu belum lengkap",
          "Tunggu sebentar lalu coba checkout ulang agar semua item pesanan ikut tersimpan."
        );
      }
      return null;
    }

    return cartIds.map((id) => itemsByID.get(id)!);
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
      const validatedItems = getValidatedCartItems();
      if (!validatedItems) return;
      const total = calculateTotal();

      // Validasi pembayaran
      if (
        paymentType === "cash" &&
        (!paidAmount || paidAmount < total)
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
        customer: customer.trim(),
        items: Object.entries(cart)
          .filter(([, quantity]) => quantity > 0)
          .map(([id, quantity]) => ({
            menu_id: Number(id),
            quantity,
          })),
        payment_type: paymentType,
        paid: paymentType === "cash" ? paidAmount : null,
      });
      setConfirmedOrderId(order.order_id);
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

  const connectAndPrint = async (inner_mac_address: string) => {
    try {
      if (!confirmedOrderId) {
        Alert.alert("Error", "Pesanan belum terkonfirmasi");
        return;
      }
      const { data: shopData, error: shopError } = await api
        .from("shop")
        .select("name, address, phone, wifi_name, wifi_password")
        .single();

      if (shopError) throw shopError;
      const { data: orderData, error: orderError } = await api
        .from("orders")
        .select("*")
        .eq("id", confirmedOrderId)
        .single();

      if (orderError) throw orderError;

      const receiptText = buildCheckoutReceiptText({
        shopData,
        customer: orderData.customer || customer,
        cashier: orderData.user?.full_name || user?.full_name,
        invoiceNumber: orderData.invoice_number || invoiceNumber,
        paymentType: orderData.payment_type || paymentType,
        total: orderData.total_amount ?? confirmedTotal ?? calculateTotal(),
        paid: orderData.paid ?? paidAmount,
        changes: orderData.changes ?? changes,
        items: (orderData.items || []).map((item: any) => ({
          name_menu: item.menu?.name_menu,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
      });

      await printToDevice(inner_mac_address, receiptText);

      // Clear cart and close modal on success
      setModalVisible(false);
      setCart({});
      setPaidAmount(null);
      setChanges(null);
      setConfirmedTotal(null);
      setConfirmedOrderId(null);
      setInvoiceNumber("");
      setCustomer("");
      clientOrderId.current = null;
      Alert.alert("Sukses", "Pesanan tersimpan dan struk berhasil dicetak");
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", "Pesanan sudah tersimpan, tetapi struk gagal dicetak");
    } finally {
      setPrinting(false);
    }
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const cartDataComplete = getValidatedCartItems(false) !== null;

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
    orderButtonDisabled: {
      opacity: 0.55,
    },
    orderButtonText: {
      fontSize: isTablet ? 13 : 14,
      fontWeight: "bold",
      color: colors.card,
      marginLeft: 8,
    },
    refreshStatus: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      marginBottom: 8,
    },
    refreshStatusText: {
      marginLeft: 8,
      fontSize: isTablet ? 12 : 11,
      color: colors.textSecondary,
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

  if (initialLoading && menuItems.length === 0 && cartIds.length > 0) {
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
      const isPromo = isPromoActive(item);

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

      {isRefreshingMenus && menuItems.length > 0 && (
        <View style={styles.refreshStatus}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.refreshStatusText}>Memuat item...</Text>
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
              <Text style={styles.paymentLabel}>Pelanggan</Text>
              <TextInput
                style={[styles.paymentInput, { borderColor: colors.border }]}
                value={customer}
                onChangeText={setCustomer}
                placeholder="Masukkan nama pelanggan (opsional)"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="done"
              />
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
            style={[
              styles.orderButton,
              (!cartDataComplete || printing) && styles.orderButtonDisabled,
            ]}
            onPress={handleOrder}
            disabled={!cartDataComplete || printing}
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

      <PrinterPickerModal
        animationType="fade"
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        devices={bluetoothDevices}
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
        onPrint={() => selectedDevice && connectAndPrint(selectedDevice)}
        printing={printing}
        styles={styles}
        description={
          "Pilih perangkat printer Bluetooth yang tersedia di daftar di bawah\nini. Pastikan printer dalam mode pairing dan berada dalam\njangkauan."
        }
      />
    </ScrollView>
  );
}
