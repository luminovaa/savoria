import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Redirect, Slot } from "expo-router";
import TabletNavbar from "@/components/navbar/tablet";
import MobileNavbar from "@/components/navbar/mobile";
import Navbar from "@/components/navbar/mobile-top";
import { useAuth } from "@/context/auth-provider";
import { useTheme } from "@/hooks/use-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MOBILE_NAV_HEIGHT = 60;

export default function ProtectedLayout() {
  const { initialized, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const updateLayout = () => {
      const breakpoint = 768;
      const windowWidth = Dimensions.get("window").width;
      setIsMobile(windowWidth < breakpoint);
    };

    updateLayout();
    
    const subscription = Dimensions.addEventListener("change", updateLayout);

    return () => {
      subscription.remove();
    };
  }, []);
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingBottom: isMobile ? MOBILE_NAV_HEIGHT + insets.bottom : 0,
      backgroundColor: colors.background,
    },
    mobileNav: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
    },
  });

  if (!initialized) return null;
  if (!user) return <Redirect href="/(app)/welcome" />;

  return (
    <View style={styles.container}>
      {!isMobile && <TabletNavbar />}
      {isMobile && <Navbar />}
      <View style={styles.content}>
        <Slot />
      </View>
      {isMobile && (
        <View style={styles.mobileNav}>
          <MobileNavbar />
        </View>
      )}
    </View>
  );
}
