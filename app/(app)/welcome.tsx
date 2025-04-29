import React, { useEffect, useRef } from "react";
import { 
  View, 
  Image, 
  StyleSheet, 
  Text, 
  Dimensions,
  Animated,
  StatusBar,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/use-theme";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function SplashScreenComponent() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;
  const isTablet = screenWidth > 600;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoTranslateY = useRef(new Animated.Value(50)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loadingScale = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      
      Animated.parallel([
        Animated.timing(loadingOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(loadingScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      router.replace("/(app)/sign-in");
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, logoTranslateY, loadingOpacity, loadingScale, taglineOpacity, router]);

  const spinValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme === "dark" ? "#121212" : colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    gradientBackground: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    contentContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 30,
      shadowColor: theme === "dark" ? "#fff" : "#000",
      shadowOffset: { width: 0, height: isTablet ? 6 : 4 },
      shadowOpacity: theme === "dark" ? 0.1 : 0.2,
      shadowRadius: isTablet ? 10 : 6,
      elevation: 5,
    },
    logo: {
      width: isTablet ? wp("45%") : wp("70%"),
      height: isTablet ? hp("30%") : hp("25%"),
      resizeMode: "contain",
    },
    titleContainer: {
      alignItems: "center",
      marginBottom: 24,
    },
    title: {
      fontSize: isTablet ? 42 : 32,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: 1.5,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    tagline: {
      fontSize: isTablet ? 18 : 16,
      color: theme === "dark" ? "#aaa" : "#666",
      marginTop: 10,
      fontStyle: "italic",
      letterSpacing: 0.5,
    },
    loadingContainer: {
      alignItems: "center",
      marginTop: 20,
      flexDirection: "row",
    },
    loadingText: {
      marginLeft: 10,
      fontSize: isTablet ? 16 : 14,
      color: theme === "dark" ? "#aaa" : "#666",
    },
    indicator: {
      width: isTablet ? 40 : 30,
      height: isTablet ? 40 : 30,
    },
    highlightText: {
      color: colors.primary,
    },
  });

  const gradientColors = theme === "dark" 
    ? ['#1a1a1a', '#121212', '#0a0a0a'] 
    : ['#ffffff', '#f9f9f9', '#f2f2f2'];

  return (
    <View style={styles.container}>
      <StatusBar 
        backgroundColor="transparent" 
        barStyle={theme === "dark" ? "light-content" : "dark-content"} 
        translucent 
      />
      
      
      <View style={styles.contentContainer}>
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: logoTranslateY }
              ]
            }
          ]}
        >
          <Image
            source={
              theme === "dark"
                ? require("@/assets/logo/savoria-dark.png")
                : require("@/assets/logo/savoria-light.png")
            }
            style={styles.logo}
          />
        </Animated.View>
        
        <View style={styles.titleContainer}>
          <Animated.Text 
            style={[
              styles.title,
              { opacity: fadeAnim }
            ]}
          >
            S<Text style={styles.highlightText}>avoria</Text>
          </Animated.Text>
          
          <Animated.Text 
            style={[
              styles.tagline,
              { opacity: taglineOpacity }
            ]}
          >
            Discover culinary excellence
          </Animated.Text>
        </View>
        
        <Animated.View 
          style={[
            styles.loadingContainer,
            {
              opacity: loadingOpacity,
              transform: [{ scale: loadingScale }]
            }
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialCommunityIcons 
              name="silverware-fork-knife" 
              size={isTablet ? 28 : 24} 
              color={colors.primary} 
              style={styles.indicator}
            />
          </Animated.View>
          <Text style={styles.loadingText}>Loading culinary experience...</Text>
        </Animated.View>
      </View>
    </View>
  );
}