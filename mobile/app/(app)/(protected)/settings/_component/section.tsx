import React from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../styles";

type FeatherIconName = keyof typeof Feather.glyphMap;

type SectionHeaderProps = {
  icon: FeatherIconName;
  title: string;
  colors: Colors;
  styles: any;
};

const SectionHeader = ({ icon, title, colors, styles }: SectionHeaderProps) => {
  return (
    <View style={styles.sectionTitleContainer}>
      <View style={styles.sectionTitleIcon}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
};

export default SectionHeader;