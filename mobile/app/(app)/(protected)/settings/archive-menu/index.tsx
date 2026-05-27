import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { 
  widthPercentageToDP as wp, 
  heightPercentageToDP as hp 
} from "react-native-responsive-screen";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";
import { api } from "@/utils/api";
import { request } from "@/services/api-client";
import { MenuItem } from "@/utils/types";
import { formatCurrency } from "@/utils/format";
import { SafeAreaView } from "react-native-safe-area-context";
import  MenuActionModal  from "./_component/modal-archive";

type MainCardMenuProps = {
  selectedCategory: number | null;
};

export default function MainCardMenu({ selectedCategory }: MainCardMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  
  const isTablet = SCREEN_WIDTH >= 768;
  
  const numColumns = isTablet ? 5 : 2;

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      let query = api
        .from("menu")
        .select("*")
        .eq("is_deleted", false)
        .eq("is_archive", true); 

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      setMenuItems(data || []); // No "Tambah Menu" button for archived view
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, [selectedCategory]);

  const handleLongPress = (
    item: MenuItem,
    event: { nativeEvent: { pageX: number; pageY: number } }
  ) => {
    setSelectedMenuItem(item);
    setModalPosition({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
    setModalVisible(true);
  };

  const unarchiveMenuItem = async (item: MenuItem) => {
    try {
      await request(`/v1/menus/${item.id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ is_archive: false }),
      });

      setMenuItems(menuItems.filter((menu) => menu.id !== item.id));
      Alert.alert("Sukses", "Menu berhasil di-unarsipkan");
    } catch (error: any) {
      Alert.alert("Error", "Gagal meng-unarsipkan menu");
    }
  };

  const styles = StyleSheet.create({
    container: {
      paddingTop: isTablet ? hp(2) : hp(-2),
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      minHeight: hp(70),
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      minHeight: hp(70),
    },
    emptyText: {
      fontSize: wp(4),
      color: colors.textSecondary,
      textAlign: "center",
    },
    list: {
      paddingHorizontal: wp(3),
    },
    row: {
      justifyContent: "flex-start",
      gap: isTablet? wp(1.5) : wp(2),
      marginBottom: hp(1.5),
    },
    card: {
      borderRadius: 12,
      width: isTablet ? wp(18) : wp(46), 
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
      height: isTablet ? hp(35) : hp(30),
      marginBottom: hp(1),
    },
    imageContainer: {
      width: "100%",
      height: isTablet ? hp(20) : hp(16),
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
    name: {
      fontSize: isTablet ? 16 : wp(3.4),
      fontWeight: "600",
      marginBottom: 20,
      color: colors.text,
    },
    priceContainer: {
      marginBottom: hp(1),
    },
    price: {
      fontSize: isTablet ? 13 : wp(3.2),
      color: colors.primary,
      fontWeight: "600",
    },
    originalPrice: {
      fontSize: isTablet ? 13 : wp(3),
      textDecorationLine: "line-through",
      color: colors.textSecondary,
      marginBottom: hp(0.2),
    },
    promoPrice: {
      fontSize: isTablet ? wp(2) : wp(3.2),
      fontWeight: "600",
      color: colors.primary,
    },
    labelPromo: {
      position: "absolute",
      top: hp(1),
      right: wp(2),
      backgroundColor: colors.primary,
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: 20,
      zIndex: 1,
    },
    labelPromoText: {
      color: colors.card,
      fontSize: isTablet ? wp(1.6) : wp(2.5),
      fontWeight: "bold",
    },
  });

  const renderItem = ({ item }: { item: MenuItem }) => {
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

  if (menuItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tidak ada menu yang diarsipkan</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={menuItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={numColumns.toString()} // This is important when changing numColumns
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
      />
      <MenuActionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        menu={selectedMenuItem}
        position={modalPosition}
        onUnarchive={unarchiveMenuItem}
      />
    </SafeAreaView>
  );
}
