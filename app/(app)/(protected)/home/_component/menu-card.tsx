import React, { useState, useEffect } from "react";
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
  ScrollView,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { MenuItem } from "@/utils/types";
import { formatCurrency } from "@/utils/format";
import { Feather } from "@expo/vector-icons";
import { MenuActionModal } from "./modal-menu";


const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH > 600; 
type MainCardMenuProps = {
  selectedCategory: number | null;
  cart: { [id: string]: number };
  setCart: React.Dispatch<React.SetStateAction<{ [id: string]: number }>>;
};

export default function MainCardMenu({
  selectedCategory,
  cart,
  setCart,
}: MainCardMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("menu")
        .select("*")
        .eq("is_deleted", false) 
        .eq("is_archive", false); 

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get current date in WIB (UTC+7)
      const currentDate = new Date();
      const wibOffset = 7 * 60; // WIB is UTC+7, in minutes
      const wibDate = new Date(
        currentDate.getTime() + (wibOffset - currentDate.getTimezoneOffset()) * 60 * 1000
      );

      const normalizeDate = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      };

      const items = (data || []).filter((item: MenuItem) => {
        if (!item.promo || !item.promo_start || !item.promo_end) {
          return true;
        }

        const promoStart = normalizeDate(new Date(item.promo_start));
        const promoEnd = normalizeDate(new Date(item.promo_end));
        const normalizedCurrentDate = normalizeDate(wibDate);

        return normalizedCurrentDate >= promoStart && normalizedCurrentDate <= promoEnd;
      });

      setMenuItems([
        ...items,
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
  }, [selectedCategory]);

  const updateQuantity = (id: string, delta: number) => {
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
    setCart((prevCart) => ({
      ...prevCart,
      [id]: (prevCart[id] || 0) + 1,
    }));
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
    setModalPosition({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    setModalVisible(true);
  };

  const confirmDeleteMenuItem = (item: MenuItem) => {
    Alert.alert(
      'Konfirmasi Hapus',
      `Apakah Anda yakin ingin menghapus menu ${item.name_menu}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => softDeleteMenuItem(item.id),
        },
      ],
      { cancelable: true }
    );
  };

  const softDeleteMenuItem = async (menuId: number) => {
    try {
      const { error } = await supabase
        .from("menu")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", menuId);

      if (error) throw error;

      setMenuItems(menuItems.filter((item) => item.id !== menuId));
      Alert.alert('Sukses', 'Menu berhasil dihapus');
    } catch (error: any) {
      Alert.alert('Error', 'Gagal menghapus menu: ' + error.message);
    }
  };

  const archiveMenuItem = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from("menu")
        .update({ is_archive: true, updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) throw error;

      setMenuItems(menuItems.filter((menu) => menu.id !== item.id));
      Alert.alert('Sukses', 'Menu berhasil diarsipkan');
    } catch (error: any) {
      Alert.alert('Error', 'Gagal mengarsipkan menu: ' + error.message);
    }
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
    row: {
      justifyContent: "flex-start",
      gap: 15,
      marginBottom: 15,
    },
    card: {
      borderRadius: 12,
      width: isTablet ? "23.8%" : "48%", // 2 cards per row on phone, 4 on tablet
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
      height: 280,
    },
    imageContainer: {
      width: "100%",
      height: 160,
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
      width: isTablet ? "23.8%" : "48%", // Match card width
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      backgroundColor: colors.card,
      height: 280,
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
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 4,
      color: colors.text,
    },
    priceContainer: {
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

  const renderItem = ({ item }: { item: MenuItem }) => {
    if (item.id === 0) {
      return (
        <TouchableOpacity style={styles.addButtonCard} onPress={handleAddMenu}>
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
    const hasPromo = item.promo && item.promo_price !== null;

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
          <Image
            source={{ uri: item.images }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name_menu}
          </Text>

          <View style={styles.priceContainer}>
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
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>Tambah</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={menuItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={isTablet ? 4 : 2} // 2 columns on phone, 4 on tablet
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        scrollEnabled={false}
        extraData={cart}
      />
      <MenuActionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        menu={selectedMenuItem}
        position={modalPosition}
        onDelete={confirmDeleteMenuItem}
        onArchive={archiveMenuItem}
      />
    </View>
  );

}