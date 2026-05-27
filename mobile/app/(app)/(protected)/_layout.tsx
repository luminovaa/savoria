import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Redirect, Slot } from "expo-router";
import TabletNavbar from "@/components/navbar/tablet";
import MobileNavbar from "@/components/navbar/mobile";
import Navbar from "@/components/navbar/mobile-top";
import { useAuth } from "@/context/auth-provider";

export default function ProtectedLayout() {
  const { initialized, user } = useAuth();
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
    },
    content: {
      flex: 1,
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
      {isMobile && <MobileNavbar />}
    </View>
  );
}
