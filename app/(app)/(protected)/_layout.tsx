// ProtectedLayout.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Slot } from "expo-router";
import TabletNavbar from "@/components/navbar/tablet";
import MobileNavbar from "@/components/navbar/mobile";
import Navbar from "@/components/navbar/mobile-top";

export default function ProtectedLayout() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const updateLayout = () => {
      const breakpoint = 768;
      const windowWidth = Dimensions.get("window").width;
      setIsMobile(windowWidth < breakpoint);
    };

    // Initial check
    updateLayout();
    
    // Set up the event listener
    const subscription = Dimensions.addEventListener("change", updateLayout);

    // Clean up
    return () => {
      // Modern way to remove listeners in React Native
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
