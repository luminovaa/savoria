import React from "react";
import {
  View,
  Image,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
const Navbar = () => {
  const { colors, theme } = useTheme();


  const mobileStyles = StyleSheet.create({
    mobileNavbar: {
      flexDirection: "row",
      alignItems: "center",
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
      alignItems: "center",
      width: "100%",
    },
    mobileLogo: {
      width: 200,
      height: 300,
    },
  });

  return (
    <>
      <View style={mobileStyles.mobileNavbar}>
        <View style={mobileStyles.mobileLogoContainer}>

          <Image
            source={
              theme === "dark"
                ? require("@/assets/logo/savoria-dark-text.png")
                : require("@/assets/logo/savoria-light-text.png")
            }
            style={mobileStyles.mobileLogo}
          />
        </View>
      </View>
    </>
  );
};

export default Navbar;
