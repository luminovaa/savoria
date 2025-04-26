import React from "react";
import { View, ScrollView, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/hooks/use-theme";
import { useSupabase } from "@/context/supabase-provider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createStyles, Theme } from "./styles";
import ProfileSection from "./_component/profile";
import SettingItem from "./_component/setting-item";
import SectionHeader from "./_component/section";
import FooterSection from "./_component/footer";
import { useRouter } from "expo-router";
import { Linking } from "react-native";

export default function SettingScreen() {
  // Explicitly type theme as Theme type
  const { theme, toggleTheme, colors } = useTheme() as {
    theme: Theme;
    toggleTheme: () => void;
    colors: any;
  };
  const { signOut, user } = useSupabase();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, theme, insets);
  const router = useRouter();

  // User data preparation
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
            description="v1.0.2"
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
