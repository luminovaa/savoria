import React from "react";
import { View, ScrollView, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/context/auth-provider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import createStyles, { Theme } from "./styles";
import ProfileSection from "./_component/profile";
import SettingItem from "./_component/setting-item";
import SectionHeader from "./_component/section";
import FooterSection from "./_component/footer";
import { useRouter } from "expo-router";
import { Linking } from "react-native";
import { APP_VERSION_LABEL } from "@/utils/app-config";

export default function SettingScreen() {
  const { theme, toggleTheme, colors } = useTheme() as {
    theme: Theme;
    toggleTheme: () => void;
    colors: any;
  };
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, theme, insets);
  const router = useRouter();

  const userData = {
    name: user?.email ? user.email.split("@")[0] : "User",
    email: user?.email || "user@example.com",
    initials: user?.email ? user.email[0].toUpperCase() : "U",
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* <View style={styles.header}>
          <Text style={styles.headerTitle}>Pengaturan</Text>
        </View> */}

        <ProfileSection userData={userData} colors={colors} styles={styles} />

        <View style={styles.section}>
          <SectionHeader
            icon="sun"
            title="Tampilan"
            colors={colors}
            styles={styles}
          />

          <SettingItem
            icon={theme === "dark" ? "moon" : "sun"}
            title={`Tema ${theme === "dark" ? "Gelap" : "Terang"}`}
            description="Ubah tampilan aplikasi"
            onPress={toggleTheme}
            showToggle={true}
            theme={theme}
            colors={colors}
            styles={styles}
          />

          <SettingItem
            icon="globe"
            title="Bahasa"
            description="Indonesia"
            onPress={() => {}}
            colors={colors}
            styles={styles}
          />
          <SettingItem
            icon="package"
            title="Pengaturan Toko"
            description="Pengaturan Seputar Toko"
            onPress={() =>
              router.push("/(app)/(protected)/settings/shop-setting")
            }
            colors={colors}
            styles={styles}
          />
          <SettingItem
            icon="shopping-cart"
            title="Arsip Menu"
            description="Menu yang tidak di tampilkan di Menu Utama"
            onPress={() =>
              router.push("/(app)/(protected)/settings/archive-menu")
            }
            colors={colors}
            styles={styles}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            icon="info"
            title="Tentang Aplikasi"
            colors={colors}
            styles={styles}
          />

          <SettingItem
            icon="info"
            title="Versi Aplikasi"
            description={APP_VERSION_LABEL}
            onPress={() => {}}
            colors={colors}
            styles={styles}
          />

          <SettingItem
            icon="shield"
            title="Kebijakan Privasi"
            onPress={() => {}}
            colors={colors}
            styles={styles}
          />

          <SettingItem
            icon="file-text"
            title="Syarat dan Ketentuan"
            onPress={() => {}}
            colors={colors}
            styles={styles}
          />

          <SettingItem
            icon="help-circle"
            title="Bantuan & Dukungan"
            onPress={() => Linking.openURL("https://wa.me/628385578764")}
            colors={colors}
            styles={styles}
          />
        </View>

        <SettingItem
          icon="log-out"
          title="Keluar"
          onPress={signOut}
          colors={colors}
          styles={styles}
          isLogout={true}
          containerStyle={[styles.section, styles.logoutButton]}
        />

        <FooterSection theme={theme} styles={styles} colors={colors} />
      </ScrollView>
    </View>
  );
}
