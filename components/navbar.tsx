import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  SafeAreaView,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRouter, useSegments } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSupabase } from "@/context/supabase-provider";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const Navbar = () => {
  const { colors, theme } = useTheme();
  const { signOut, user } = useSupabase();
  const router = useRouter();
  const segments = useSegments();
  const [isAvatarModalVisible, setAvatarModalVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  const sidebarAnimation = new Animated.Value(0);
  
  useEffect(() => {
    const updateLayout = () => {
      const breakpoint = 768;
      const windowWidth = Dimensions.get('window').width;
      setIsMobile(windowWidth < breakpoint);
    };
    
    updateLayout();
    Dimensions.addEventListener('change', updateLayout);
    
    return () => {
      if (Dimensions.addEventListener) {
        Dimensions.addEventListener('change', updateLayout);
      }
    };
  }, []);
  
  useEffect(() => {
    // Animate sidebar opening/closing
    Animated.timing(sidebarAnimation, {
      toValue: isSidebarOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSidebarOpen]);
  
  // Calculate sidebar position
  const sidebarTranslateX = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-wp('70%'), 0],
  });
  
  const overlayOpacity = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const isTabActive = (path: string) => {
    const currentPath = `/${segments.join("/")}`;
    return currentPath === path;
  };

  const userInitials = user?.email ? user.email[0].toUpperCase() : "U";
  
  const navigateTo = (path: any) => {
    router.push(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Use original styles for tablet view to ensure it looks exactly like the original
  const originalStyles = StyleSheet.create({
    navbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 80,
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderBottomColor: colors.border,
    },
    logo: {
      width: 200,
      height: 350,
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

  const mobileStyles = StyleSheet.create({
    mobileNavbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 60,
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderBottomColor: colors.border,
    },
    hamburgerIcon: {
      padding: 8,
    },
    mobileLogoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    mobileLogo: {
      width: 200,
      height: 300,
    },
    mobileAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      justifyContent: "center",
      alignItems: "center",
    },
    sidebarContainer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: wp('70%'),
      backgroundColor: colors.background,
      zIndex: 10,
      shadowColor: "#000",
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    sidebarHeader: {
      height: 120,
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sidebarLogo: {
      width: wp('40%'),
      height: 150,
      resizeMode: 'contain',
    },
    sidebarNavItems: {
      padding: 16,
      marginTop: 16,
    },
    sidebarNavItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginBottom: 16,
      borderRadius: 8,
    },
    sidebarActiveNavItem: {
      backgroundColor: colors.primary,
    },
    sidebarIcon: {
      marginRight: 12,
    },
    sidebarOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 5,
      backgroundColor: "black",
    },
    sidebarFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });

  // Mobile sidebar render
  const renderSidebar = () => {
    if (!isMobile) return null;

    return (
      <>
        {/* Overlay */}
        {isSidebarOpen && (
        <TouchableWithoutFeedback
          onPress={() => setSidebarOpen(false)}
        >
          <Animated.View
            style={[
              mobileStyles.sidebarOverlay,
              { opacity: overlayOpacity }
            ]}
          />
        </TouchableWithoutFeedback>
      )}
        {/* Sidebar */}
        <Animated.View
          style={[
            mobileStyles.sidebarContainer,
            { transform: [{ translateX: sidebarTranslateX }] }
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={mobileStyles.sidebarHeader}>
              <Image
                source={
                  theme === "dark"
                    ? require("@/assets/logo/savoria-dark.png")
                    : require("@/assets/logo/savoria-light.png")
                }
                style={mobileStyles.sidebarLogo}
              />
            </View>
            
            <View style={mobileStyles.sidebarNavItems}>
              <TouchableOpacity
                style={[
                  mobileStyles.sidebarNavItem,
                  isTabActive("/(app)/(protected)/home") && mobileStyles.sidebarActiveNavItem,
                ]}
                onPress={() => navigateTo("/(app)/(protected)/home")}
              >
                <Feather
                  name="home"
                  size={20}
                  color={isTabActive("/(app)/(protected)/home") ? (theme === "dark" ? "#000" : "#FFF") : colors.text}
                  style={mobileStyles.sidebarIcon}
                />
                <Text
                  style={
                    isTabActive("/(app)/(protected)/home")
                      ? originalStyles.activeNavText
                      : originalStyles.navText
                  }
                >
                  Beranda
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  mobileStyles.sidebarNavItem,
                  isTabActive("/(app)/(protected)/order") && mobileStyles.sidebarActiveNavItem,
                ]}
                onPress={() => navigateTo("/(app)/(protected)/order")}
              >
                <Feather
                  name="shopping-bag"
                  size={20}
                  color={isTabActive("/(app)/(protected)/order") ? (theme === "dark" ? "#000" : "#FFF") : colors.text}
                  style={mobileStyles.sidebarIcon}
                />
                <Text
                  style={
                    isTabActive("/(app)/(protected)/order")
                      ? originalStyles.activeNavText
                      : originalStyles.navText
                  }
                >
                  Pesanan
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  mobileStyles.sidebarNavItem,
                  isTabActive("/(app)/(protected)/cashier") && mobileStyles.sidebarActiveNavItem,
                ]}
                onPress={() => navigateTo("/(app)/(protected)/cashier")}
              >
                <Feather
                  name="dollar-sign"
                  size={20}
                  color={isTabActive("/(app)/(protected)/cashier") ? (theme === "dark" ? "#000" : "#FFF") : colors.text}
                  style={mobileStyles.sidebarIcon}
                />
                <Text
                  style={
                    isTabActive("/(app)/(protected)/cashier")
                      ? originalStyles.activeNavText
                      : originalStyles.navText
                  }
                >
                  Kasir
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  mobileStyles.sidebarNavItem,
                  isTabActive("/(app)/(protected)/settings") && mobileStyles.sidebarActiveNavItem,
                ]}
                onPress={() => navigateTo("/(app)/(protected)/settings")}
              >
                <Feather
                  name="settings"
                  size={20}
                  color={isTabActive("/(app)/(protected)/settings") ? (theme === "dark" ? "#000" : "#FFF") : colors.text}
                  style={mobileStyles.sidebarIcon}
                />
                <Text
                  style={
                    isTabActive("/(app)/(protected)/settings")
                      ? originalStyles.activeNavText
                      : originalStyles.navText
                  }
                >
                  Pengaturan
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={mobileStyles.sidebarFooter}>
              <TouchableOpacity
                style={originalStyles.modalItem}
                onPress={() => {
                  signOut();
                  setSidebarOpen(false);
                  router.push("/(app)/sign-in");
                }}
              >
                <Feather
                  name="log-out"
                  size={20}
                  color={colors.error}
                  style={originalStyles.modalIcon}
                />
                <Text style={originalStyles.modalText}>Keluar</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </>
    );
  };

  // Render based on screen size
  if (isMobile) {
    return (
      <>
        <View style={mobileStyles.mobileNavbar}>
          <View style={mobileStyles.mobileLogoContainer}>
            <TouchableOpacity 
              style={mobileStyles.hamburgerIcon}
              onPress={() => setSidebarOpen(true)}
            >
              <Feather name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
            
            <Image
              source={
                theme === "dark"
                  ? require("@/assets/logo/savoria-dark-text.png")
                  : require("@/assets/logo/savoria-light-text.png")
              }
              style={mobileStyles.mobileLogo}
            />
            
            <TouchableOpacity
              onPress={() => setAvatarModalVisible(true)}
            >
              <View style={mobileStyles.mobileAvatar}>
                <Text style={originalStyles.avatarText}>{userInitials}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {renderSidebar()}

        {/* Avatar dropdown modal for mobile */}
        <Modal
          transparent={true}
          visible={isAvatarModalVisible}
          animationType="fade"
          onRequestClose={() => setAvatarModalVisible(false)}
        >
          <TouchableOpacity
            style={originalStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setAvatarModalVisible(false)}
          >
            <View style={originalStyles.modalContent}>
              <TouchableOpacity
                style={originalStyles.modalItem}
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
                  style={originalStyles.modalIcon}
                />
                <Text style={originalStyles.modalText}>Keluar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  // Return the original tablet layout without modifications
  return (
    <View style={originalStyles.navbar}>
      {/* Logo */}
      <Image
        source={
          theme === "dark"
            ? require("@/assets/logo/savoria-dark-text.png")
            : require("@/assets/logo/savoria-light-text.png")
        }
        style={originalStyles.logo}
      />

      <View style={originalStyles.navItems}>
        <TouchableOpacity
          style={[
            originalStyles.navItem,
            isTabActive("/(app)/(protected)/home") && originalStyles.activeNavItem,
          ]}
          onPress={() => router.push("/(app)/(protected)/home")}
        >
          <Text
            style={
              isTabActive("/(app)/(protected)/home")
                ? originalStyles.activeNavText
                : originalStyles.navText
            }
          >
            Beranda
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            originalStyles.navItem,
            isTabActive("/(app)/(protected)/order") && originalStyles.activeNavItem,
          ]}
          onPress={() => router.push("/(app)/(protected)/order")}
        >
          <Text
            style={
              isTabActive("/(app)/(protected)/order")
                ? originalStyles.activeNavText
                : originalStyles.navText
            }
          >
            Pesanan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            originalStyles.navItem,
            isTabActive("/(app)/(protected)/cashier") && originalStyles.activeNavItem,
          ]}
          onPress={() => router.push("/(app)/(protected)/cashier")}
        >
          <Text
            style={
              isTabActive("/(app)/(protected)/cashier")
                ? originalStyles.activeNavText
                : originalStyles.navText
            }
          >
            Kasir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            originalStyles.navItem,
            isTabActive("/(app)/(protected)/settings") && originalStyles.activeNavItem,
          ]}
          onPress={() => router.push("/(app)/(protected)/settings")}
        >
          <Text
            style={
              isTabActive("/(app)/(protected)/settings")
                ? originalStyles.activeNavText
                : originalStyles.navText
            }
          >
            Pengaturan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={originalStyles.avatarContainer}
          onPress={() => setAvatarModalVisible(true)}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={originalStyles.avatar}>
              <Text style={originalStyles.avatarText}>{userInitials}</Text>
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

      {/* Avatar dropdown modal for tablet */}
      <Modal
        transparent={true}
        visible={isAvatarModalVisible}
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <TouchableOpacity
          style={originalStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAvatarModalVisible(false)}
        >
          <View style={originalStyles.modalContent}>
            <TouchableOpacity
              style={originalStyles.modalItem}
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
                style={originalStyles.modalIcon}
              />
              <Text style={originalStyles.modalText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default Navbar;