import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRouter, useSegments } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSupabase } from "@/context/supabase-provider";

const Navbar = () => {
  const { colors, theme } = useTheme();
  const { signOut, user } = useSupabase();
  const router = useRouter();
  const segments = useSegments();
  const [isAvatarModalVisible, setAvatarModalVisible] = useState(false);

  const isTabActive = (path: string) => {
    const currentPath = `/${segments.join("/")}`;
    return currentPath === path;
  };

  const userInitials = user?.email ? user.email[0].toUpperCase() : "U";

  const styles = StyleSheet.create({
    navbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 80,
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderBottomColor: colors.border,
    },
    logo: {
      width: 100,
      height: 100,
    },
    navItems: {
      flexDirection: "row",
      gap: 8,
    },
    navItem: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    activeNavItem: {
      backgroundColor: colors.primary,
      borderRadius: 30,
    },
    navText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    activeNavText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme === "dark" ? "#000" : "#FFF",
    },
    avatarContainer: {
      marginLeft: 16,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-start",
      alignItems: "flex-end",
      paddingTop: 80,
      paddingRight: 16,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      width: 150,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    modalItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
    },
    modalIcon: {
      marginRight: 8,
    },
    modalText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.error,
    },
  });

  return (
    <View style={styles.navbar}>
      {/* Logo */}
      <Image
        source={
          theme === "dark"
            ? require("@/assets/logo/savoria-dark.png")
            : require("@/assets/logo/savoria-light.png")
        }
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.navItems}>
        <TouchableOpacity
          style={[
            styles.navItem,
            isTabActive("/(app)/(protected)/home") && styles.activeNavItem,
          ]}
          onPress={() => router.push("/(app)/(protected)/home")}
        >
          <Text
            style={
              isTabActive("/(app)/(protected)/home")
                ? styles.activeNavText
                : styles.navText
            }
          >
            Beranda
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navItem,
            isTabActive("/(app)/(protected)/order") && styles.activeNavItem,
          ]}
          onPress={() => router.push("/(app)/(protected)/order")}
        >
          <Text
            style={
              isTabActive("/(app)/(protected)/order")
                ? styles.activeNavText
                : styles.navText
            }
          >
            Pesanan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navItem,
            isTabActive("/(app)/(protected)/cashier") && styles.activeNavItem,
          ]}
          onPress={() => router.push("/(app)/(protected)/cashier")}
        >
          <Text
            style={
              isTabActive("/(app)/(protected)/cashier")
                ? styles.activeNavText
                : styles.navText
            }
          >
            Kasir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navItem,
            isTabActive("/(app)/(protected)/settings") && styles.activeNavItem,
          ]}
          onPress={() => router.push("/(app)/(protected)/settings")}
        >
          <Text
            style={
              isTabActive("/(app)/(protected)/settings")
                ? styles.activeNavText
                : styles.navText
            }
          >
            Pengaturan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setAvatarModalVisible(true)}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <Feather
              name="chevron-down"
              size={20}
              color={colors.text}
              style={{ marginLeft: 8 }}
            />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        transparent={true}
        visible={isAvatarModalVisible}
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAvatarModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                signOut();
                setAvatarModalVisible(false);
                router.push("/(app)/sign-in");
              }}
            >
              <Feather
                name="log-out"
                size={20}
                color={colors.error}
                style={styles.modalIcon}
              />
              <Text style={styles.modalText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default Navbar;
