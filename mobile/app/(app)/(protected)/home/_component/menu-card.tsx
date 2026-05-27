import React, { useState, useEffect, memo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import FastImage from "react-native-fast-image";

import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";
import { api } from "@/utils/api";
import { request } from "@/services/api-client";
import type { MenuItem, MenuSort } from "@/utils/types";
import { capitalizeText, formatCurrency } from "@/utils/format";
import { Feather } from "@expo/vector-icons";
import MenuActionModal from "./modal-menu";
import UpdateStockModal from "./update-stock-modal"; // Import modal baru
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { dataService } from "@/services/data-service";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH > 600;

const sortOptions: { value: MenuSort; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "az", label: "A-Z" },
  { value: "za", label: "Z-A" },
  { value: "bestseller", label: "Terlaris" },
];

function isPromoActive(item: MenuItem) {
  if (!item.promo || item.promo_price === null || item.promo_price === undefined || !item.promo_start || !item.promo_end) return false;
  const today = new Date();
  const promoStart = new Date(item.promo_start);
  const promoEnd = new Date(item.promo_end);
  const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const normalizedToday = normalizeDate(new Date(today.getTime() + (7 * 60 - today.getTimezoneOffset()) * 60 * 1000));
  return normalizedToday >= normalizeDate(promoStart) && normalizedToday <= normalizeDate(promoEnd);
}

type MainCardMenuProps = {
  selectedCategory: number | null;
  menuSort: MenuSort;
  setMenuSort: (sort: MenuSort) => void;
  cart: { [id: string]: number };
  setCart: React.Dispatch<React.SetStateAction<{ [id: string]: number }>>;
};

export default function MainCardMenu({
  selectedCategory,
  menuSort,
  setMenuSort,
  cart,
  setCart,
}: MainCardMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const { colors } = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null
  );
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // State untuk modal update stock
  const [updateStockModalVisible, setUpdateStockModalVisible] = useState(false);
  const [stockUpdateMenuItem, setStockUpdateMenuItem] =
    useState<MenuItem | null>(null);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);

      const finalMenuData = await queryClient.fetchQuery({
        queryKey: ["menus", selectedCategory, menuSort],
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          return dataService.menus(selectedCategory, false, menuSort);
        },
      });

      setMenuItems([
        ...(finalMenuData as MenuItem[]),
        {
          id: 0,
          name_menu: "Tambah Menu",
          description: "",
          price: 0,
          category_id: 0,
          images: "",
          promo: false,
          promo_price: null,
          promo_start: null,
          promo_end: null,
          created_at: "",
          updated_at: "",
          isAddButton: true,
          is_deleted: false,
          is_archive: false,
          stock: 0,
        },
      ]);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, [selectedCategory, menuSort]);

  useEffect(() => {
    const prefetchImages = async () => {
      const uris = menuItems
        .filter((item) => item.id !== 0 && item.images)
        .slice(0, 8)
        .map((item) => ({
          uri: item.images,
          priority: FastImage.priority.low,
          cache: FastImage.cacheControl.immutable,
        }));

      FastImage.preload(uris);
    };

    if (menuItems.length > 0) {
      prefetchImages();
    }
  }, [menuItems]);

  const updateQuantity = (id: string, delta: number) => {
    const item = menuItems.find((menu) => menu.id.toString() === id);
    if (!item) return;

    if (delta > 0 && (cart[id] || 0) >= item.stock!) {
      Alert.alert(
        "Stok Tidak Cukup",
        "Jumlah di keranjang melebihi stok yang tersedia."
      );
      return;
    }

    setCart((prevCart) => {
      const newQuantity = (prevCart[id] || 0) + delta;
      if (newQuantity <= 0) {
        const { [id]: _, ...rest } = prevCart;
        return rest;
      }
      return { ...prevCart, [id]: newQuantity };
    });
  };

  const addToCart = (id: string) => {
    if (isAdding) return;

    const item = menuItems.find((menu) => menu.id.toString() === id);
    if (!item || item.stock! <= 0) {
      Alert.alert("Stok Habis", "Maaf, item ini sudah habis.");
      return;
    }

    if ((cart[id] || 0) >= item.stock!) {
      Alert.alert(
        "Stok Tidak Cukup",
        "Jumlah di keranjang melebihi stok yang tersedia."
      );
      return;
    }

    setIsAdding(id);
    setCart((prevCart) => ({
      ...prevCart,
      [id]: (prevCart[id] || 0) + 1,
    }));

    setTimeout(() => {
      setIsAdding(null);
    }, 100);
  };

  const handleAddMenu = () => {
    router.push("/(app)/(protected)/home/add-menu");
  };

  const handleLongPress = (
    item: MenuItem,
    event: { nativeEvent: { pageX: number; pageY: number } }
  ) => {
    if (item.id === 0) return; // Don't show modal for "Tambah Menu" button
    setSelectedMenuItem(item);
    setModalPosition({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
    setModalVisible(true);
  };

  const confirmDeleteMenuItem = (item: MenuItem) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus menu ${item.name_menu}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => softDeleteMenuItem(item.id),
        },
      ],
      { cancelable: true }
    );
  };

  const softDeleteMenuItem = async (menuId: number) => {
    try {
      const { error } = await api
        .from("menu")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", menuId);

      if (error) throw error;

      setMenuItems(menuItems.filter((item) => item.id !== menuId));
      await queryClient.invalidateQueries({ queryKey: ["menus"] });
      Alert.alert("Sukses", "Menu berhasil dihapus");
    } catch (error: any) {
      Alert.alert("Error", "Gagal menghapus menu: " + error.message);
    }
  };

  const archiveMenuItem = async (item: MenuItem) => {
    try {
      await request(`/v1/menus/${item.id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ is_archive: true }),
      });

      setMenuItems(menuItems.filter((menu) => menu.id !== item.id));
      await queryClient.invalidateQueries({ queryKey: ["menus"] });
      Alert.alert("Sukses", "Menu berhasil diarsipkan");
    } catch (error: any) {
      Alert.alert("Error", "Gagal mengarsipkan menu: " + error.message);
    }
  };

  // Handler untuk membuka modal update stock
  const handleUpdateStock = (item: MenuItem) => {
    setStockUpdateMenuItem(item);
    setUpdateStockModalVisible(true);
  };

  // Handler untuk ketika stock berhasil diupdate
  const handleStockUpdated = (menuId: number, newStock: number) => {
    setMenuItems((prevItems) =>
      prevItems.map((item) =>
        item.id === menuId ? { ...item, stock: newStock } : item
      )
    );
    queryClient.invalidateQueries({ queryKey: ["menus"] });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      minHeight: SCREEN_HEIGHT * 0.7,
    },
    list: {
      paddingHorizontal: 15,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      paddingTop: 4,
      paddingBottom: 12,
    },
    toolbarTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    sortButton: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    sortButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    sortOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.25)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    sortMenu: {
      width: "100%",
      maxWidth: 320,
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sortOptionText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "500",
    },
    row: {
      justifyContent: "flex-start",
      gap: 15,
      marginBottom: 15,
    },
    card: {
      borderRadius: 12,
      width: isTablet ? "23.8%" : "48%",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
      height: isTablet ? 240 : 250,
    },
    imageContainer: {
      width: "100%",
      height: isTablet ? 100 : 130,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      overflow: "hidden",
    },
    image: {
      width: "100%",
      height: "100%",
    },
    contentContainer: {
      padding: 10,
      flex: 1,
      justifyContent: "space-between",
    },
    addButtonCard: {
      borderRadius: 12,
      width: isTablet ? "23.8%" : "48%",
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      backgroundColor: colors.card,
      height: isTablet ? 240 : 250,
      justifyContent: "center",
      alignItems: "center",
    },
    addIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 15,
    },
    addIcon: {
      color: colors.primary,
    },
    addText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    name: {
      fontSize: isTablet ? 13 : 16,
      fontWeight: "600",
      marginBottom: 4,
      color: colors.text,
    },
    priceContainer: {
      flexDirection: "row", // Tambahkan ini
      justifyContent: "space-between", // Tambahkan ini
      alignItems: "center", // Tambahkan ini
      marginBottom: 8,
    },
    price: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "600",
    },
    originalPrice: {
      fontSize: 12,
      textDecorationLine: "line-through",
      color: colors.textSecondary,
      marginBottom: 2,
    },
    promoPrice: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.primary,
    },
    stockText: {
      fontSize: 12,
      color: colors.textSecondary,
      // marginBottom: 8, // Hapus ini jika ingin sejajar
    },
    labelPromo: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
      zIndex: 1,
    },
    labelPromoText: {
      color: colors.card,
      fontSize: 10,
      fontWeight: "bold",
    },
    addButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    addButtonDisabled: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.textSecondary,
      alignItems: "center",
    },
    addButtonText: {
      fontWeight: "600",
      fontSize: 12,
      color: colors.card,
    },
    quantityContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    quantityButton: {
      padding: 4,
    },
    quantity: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
  });

  type RenderItemProps = {
    item: MenuItem;
    cart: { [id: string]: number };
    colors: any;
    styles: any;
    updateQuantity: (id: string, delta: number) => void;
    addToCart: (id: string) => void;
    handleAddMenu: () => void;
    handleLongPress: (
      item: MenuItem,
      event: { nativeEvent: { pageX: number; pageY: number } }
    ) => void;
    isAdding: string | null;
  };

  const RenderItem = memo(
    ({
      item,
      cart,
      colors,
      styles,
      updateQuantity,
      addToCart,
      handleAddMenu,
      handleLongPress,
      isAdding,
    }: RenderItemProps) => {
      if (item.id === 0) {
        return (
          <TouchableOpacity
            style={styles.addButtonCard}
            onPress={handleAddMenu}
          >
            <View style={styles.addIconContainer}>
              <Feather
                name="plus"
                width={30}
                height={30}
                style={styles.addIcon}
              />
            </View>
            <Text style={styles.addText}>Tambah Menu</Text>
          </TouchableOpacity>
        );
      }

      const quantity = cart[item.id.toString()] || 0;
      const hasPromo = isPromoActive(item);
      const isOutOfStock = item.stock! <= 0;

      return (
        <TouchableOpacity
          style={styles.card}
          onLongPress={(event) => handleLongPress(item, event)}
        >
          {hasPromo && (
            <View style={styles.labelPromo}>
              <Text style={styles.labelPromoText}>PROMO</Text>
            </View>
          )}
          <View style={styles.imageContainer}>
            <FastImage
              source={{
                uri: item.images,
                priority: FastImage.priority.low,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.image}
              resizeMode={FastImage.resizeMode.cover}
            />
          </View>
          <View style={styles.contentContainer}>
            <Text style={styles.name} numberOfLines={2}>
              {capitalizeText(item.name_menu)}
            </Text>
            <View style={styles.priceContainer}>
              <View>
                {hasPromo ? (
                  <>
                    <Text style={styles.originalPrice}>
                      {formatCurrency(item.price)}
                    </Text>
                    <Text style={styles.promoPrice}>
                      {formatCurrency(item.promo_price!)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                )}
              </View>
              <Text style={styles.stockText}>
                {isOutOfStock ? "Stok Habis" : `${item.stock} pcs`}
              </Text>
            </View>
            {quantity > 0 ? (
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  onPress={() => updateQuantity(item.id.toString(), -1)}
                  style={styles.quantityButton}
                >
                  <Feather
                    name="minus"
                    width={18}
                    height={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.quantity}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(item.id.toString(), 1)}
                  style={styles.quantityButton}
                >
                  <Feather
                    name="plus"
                    width={18}
                    height={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => addToCart(item.id.toString())}
                style={[
                  isOutOfStock ? styles.addButtonDisabled : styles.addButton,
                  isAdding === item.id.toString() && { opacity: 0.5 },
                ]}
                disabled={isAdding === item.id.toString() || isOutOfStock}
              >
                <Text style={styles.addButtonText}>
                  {isOutOfStock ? "Stok Habis" : "Tambah"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    }
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const activeSortLabel = sortOptions.find((option) => option.value === menuSort)?.label || "Terbaru";
  const renderToolbar = () => (
    <View style={styles.toolbar}>
      <Text style={styles.toolbarTitle}>Menu</Text>
      <TouchableOpacity style={styles.sortButton} onPress={() => setSortModalVisible(true)}>
        <Feather name="sliders" size={16} color={colors.primary} />
        <Text style={styles.sortButtonText}>{activeSortLabel}</Text>
        <Feather name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={menuItems}
        ListHeaderComponent={renderToolbar}
        renderItem={({ item }) => (
          <RenderItem
            item={item}
            cart={cart}
            colors={colors}
            styles={styles}
            updateQuantity={updateQuantity}
            addToCart={addToCart}
            handleAddMenu={handleAddMenu}
            handleLongPress={handleLongPress}
            isAdding={isAdding}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={isTablet ? 4 : 2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        scrollEnabled={true}
        extraData={cart}
        initialNumToRender={4}
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews={true}
      />

      <Modal
        transparent
        visible={sortModalVisible}
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.sortOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.sortMenu}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOption}
                onPress={() => {
                  setMenuSort(option.value);
                  setSortModalVisible(false);
                }}
              >
                <Text style={styles.sortOptionText}>{option.label}</Text>
                {menuSort === option.value && (
                  <Feather name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Action Menu */}
      <MenuActionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        menu={selectedMenuItem}
        position={modalPosition}
        onDelete={confirmDeleteMenuItem}
        onArchive={archiveMenuItem}
        onUpdateStock={handleUpdateStock} // Pass handler ke modal
      />

      {/* Modal Update Stock */}
      <UpdateStockModal
        visible={updateStockModalVisible}
        onClose={() => setUpdateStockModalVisible(false)}
        menu={stockUpdateMenuItem}
        onStockUpdated={handleStockUpdated}
      />
    </SafeAreaView>
  );
}
