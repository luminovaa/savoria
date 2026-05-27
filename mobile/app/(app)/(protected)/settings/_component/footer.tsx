import React from "react";
import { View, Text, Image } from "react-native";
import { Colors, Theme } from "../styles";
import { APP_VERSION_LABEL } from "@/utils/app-config";

type FooterSectionProps = {
  theme: Theme;
  styles: any;
  colors: Colors;
};

const FooterSection = ({ theme, styles, colors }: FooterSectionProps) => {
  return (
    <View style={styles.footer}>
      <Image
        source={
          theme === "dark"
            ? require("@/assets/logo/savoria-dark.png")
            : require("@/assets/logo/savoria-light.png")
        }
        style={styles.footerLogo}
        resizeMode="contain"
      />
      <Text style={styles.footerText}>© 2025 Develop By Neon Code</Text>
      <View style={styles.versionBadge}>
        <Text style={styles.versionText}>{APP_VERSION_LABEL}</Text>
      </View>
    </View>
  );
};

export default FooterSection;
