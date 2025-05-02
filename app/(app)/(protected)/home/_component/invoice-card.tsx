import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/utils/supabase";
import { capitalizeText, formatCurrency, formatCurrency2, formatDatetoIndonesia } from "@/utils/format";
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
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    generateUniqueInvoiceNumber();

    if (Object.keys(cart).length > 0) {
      const cartIds = Object.keys(cart);
      fetchMenuItems(cartIds);
    } else {
      setMenuItems([]);
      setLoading(false);
    }
  }, [cart]);

  const fetchMenuItems = async (cartIds: string[]) => {
    try {
      setLoading(true);
      const existingIds = menuItems.map((item) => item.id.toString());
      const newIds = cartIds.filter((id) => !existingIds.includes(id));

      let newItems: MenuItem[] = [];
      if (newIds.length > 0) {
        const { data, error } = await supabase
          .from("menu")
          .select("*")
          .in("id", newIds);

        if (error) throw error;
        newItems = data || [];
      }

      setMenuItems((prev) => {
        const combined = [...prev, ...newItems];
        const uniqueItems = Array.from(
          new Map(combined.map((item) => [item.id, item])).values()
        );
        return uniqueItems.filter((item) =>
          cartIds.includes(item.id.toString())
        );
      });
    } catch (error) {
      console.error("Error fetching menu items for cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = (item: MenuItem, quantity: number) => {
    const price = item.promo && item.promo_price ? item.promo_price : item.price;
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
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `INV-${randomNum}`;
  };

  const generateUniqueInvoiceNumber = async () => {
    let isUnique = false;
    let proposedInvoiceNumber = "";

    while (!isUnique) {
      proposedInvoiceNumber = generateRandomInvoiceNumber();
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .eq("invoice_number", proposedInvoiceNumber)
        .limit(1);

      if (error) {
        console.error("Error checking invoice number:", error);
        isUnique = true;
      } else {
        isUnique = data.length === 0;
      }
    }

    setInvoiceNumber(proposedInvoiceNumber);
    return proposedInvoiceNumber;
  };

  const handleOrder = async () => {
    try {
      const total = calculateTotal();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("No user is logged in");

      const authUserId = user.id;
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", authUserId)
        .single();

      if (profileError || !profileData) {
        throw new Error("Profile not found for this user");
      }

      const profileId = profileData.id;
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          created_at: new Date().toISOString(),
          invoice_number: invoiceNumber,
          total: Object.values(cart).reduce((sum, qty) => sum + qty, 0),
          total_amount: total,
          user_id: profileId,
          payment_type: "cash",
          status: "completed",
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;
      setOrderId(orderId);
      
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

      // Show print modal after successful order
      scanBluetoothDevices();
      
    } catch (error) {
      console.error("Error placing order:", error);
      Alert.alert("Error", "Gagal memproses pesanan");
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
            message: "Aplikasi memerlukan izin untuk memindai perangkat Bluetooth untuk menghubungkan ke printer.",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          },
        },
        {
          permission: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          rationale: {
            title: "Bluetooth Connect Permission",
            message: "Aplikasi memerlukan izin untuk menghubungkan ke printer Bluetooth.",
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
          const shouldShowRationale = await PermissionsAndroid.request(permission);
          if (!shouldShowRationale && result === PermissionsAndroid.RESULTS.DENIED) {
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
      console.error("Scan error:", error);
      Alert.alert("Error", `Gagal memindai perangkat Bluetooth: ${error}`);
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
      setCart({});
      Alert.alert("Sukses", "Struk berhasil dicetak");
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", "Gagal mencetak struk");
    } finally {
      setPrinting(false);
    }
  };

  const printReceipt = async () => {
    if (!orderId) return;
    
    try {
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      
      if (orderError || !orderData) throw orderError;

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*, menu:menu_id(name_menu, price, promo_price, promo)")
        .eq("order_id", orderId);
      
      if (itemsError) throw itemsError;

      // Fetch shop details
      const { data: shopData, error: shopError } = await supabase
        .from("shop")
        .select("name, address, phone")
        .single();
      
      if (shopError) throw shopError;

      // Format receipt
      let receiptText = `
<C>=============================</C>
<C>** ${shopData.name.slice(0, 16).toUpperCase()} **</C>
<C>${shopData.address.slice(0, 24)}</C>
<C>Telp: ${shopData.phone.slice(0, 13)}</C>
<C>=============================</C>
<L>INV: ${orderData.invoice_number.slice(0, 10)}</L>
<L>TGL: ${formatDatetoIndonesia(orderData.created_at).slice(0, 15)}</L>
<C>-----------------------------</C>`;

      // Add items
      itemsData.forEach((item) => {
        const maxLength = 24;
        const itemName = item.menu?.name_menu || "Item";
        const formattedName = itemName.length > maxLength 
          ? `${itemName.substring(0, maxLength - 3)}...` 
          : itemName;
        
        const leftText = `${item.quantity}x ${capitalizeText(formattedName)}`;
        const price = item.menu?.promo && item.menu?.promo_price 
          ? item.menu.promo_price 
          : item.menu?.price || 0;
        const subtotal = formatCurrency2(price * item.quantity).padStart(10);
        
        receiptText += `
<L>${leftText}</L>
<R>${subtotal}</R>`;
      });

      receiptText += `
<C>-----------------------------</C>
<L>TOTAL:<R>${formatCurrency2(orderData.total_amount)}</R></L>
<C>=============================</C>
<C>*** TERIMA KASIH ***</C>
<C>Barang yang dibeli</C>
<C>tidak dapat ditukar</C>`;

      await BLEPrinter.printBill(receiptText, {
        cut: true,
        beep: true,
        encoding: "GBK",
      });
    } catch (error) {
      console.error("Print error:", error);
      throw error;
    }
  };

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
      flex: 1,
      paddingHorizontal: isTablet ? 15 : 10,
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
      flexGrow: 0, // Changed to prevent taking extra space
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
                            onPress={() =>
                              updateQuantity(item.id.toString(), -1)
                            }
                          >
                            <Feather
                              name="minus"
                              size={13}
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
                              size={13}
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

      {/* Print Modal */}
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