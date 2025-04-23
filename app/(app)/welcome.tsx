import React from "react";
import { useRouter } from "expo-router";
import { View, Image, SafeAreaView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useSupabase } from "@/context/supabase-provider";

export default function WelcomeScreen() {
  const router = useRouter();
  const {signUp} = useSupabase();

  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.icon}
        />
        <Text style={styles.title}>Welcome to Expo Supabase Starter</Text>
        <Text style={styles.subtitle}>
          A comprehensive starter project for developing React Native and Expo
          applications with Supabase as the backend.
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/sign-in")}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/sign-up")}
        >
          <Text style={styles.buttonText}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
    gap: 16,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  buttonContainer: {
    margin: 16,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#E5E5EA",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});