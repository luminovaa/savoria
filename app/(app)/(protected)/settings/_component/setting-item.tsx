import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors, Theme } from "../styles";

type FeatherIconName = keyof typeof Feather.glyphMap;

type SettingItemProps = {
  icon: FeatherIconName;
  title: string;
  onPress: () => void;
  showToggle?: boolean;
  description?: string;
  colors: Colors;
  styles: any;
  theme?: Theme;
  isLogout?: boolean;
  containerStyle?: any;
};

const SettingItem = ({
  icon,
  title,
  onPress,
  showToggle = false,
  description,
  colors,
  styles,
  theme,
  isLogout = false,
  containerStyle,
}: SettingItemProps) => {
  // Animation for toggle
  const switchAnimation = useRef(
    new Animated.Value(theme === "dark" ? 1 : 0)
  ).current;

  useEffect(() => {
    if (theme) {
      Animated.timing(switchAnimation, {
        toValue: theme === "dark" ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [theme, switchAnimation]);

  const translateX = switchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const iconStyle = isLogout
    ? [styles.settingIcon, { backgroundColor: colors.error + "15" }]
    : styles.settingIcon;

  const iconColor = isLogout ? colors.error : colors.primary;
  const textStyle = isLogout
    ? [styles.settingTitle, styles.logoutText]
    : styles.settingTitle;
  const chevronColor = isLogout ? colors.error : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.settingItem, containerStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingIconTitle}>
        <View style={iconStyle}>
          <Feather name={icon} size={20} color={iconColor} />
        </View>
        <View>
          <Text style={textStyle}>{title}</Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
      </View>

      {showToggle ? (
        <View style={styles.themeIndicator}>
          <Animated.View
            style={[styles.themeIndicatorKnob, { transform: [{ translateX }] }]}
          />
        </View>
      ) : (
        <Feather name="chevron-right" size={20} color={chevronColor} />
      )}
    </TouchableOpacity>
  );
};

export default SettingItem;
