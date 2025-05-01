import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import * as z from "zod";
import { useSupabase } from "@/context/supabase-provider";
import React from "react";
import { useTheme } from "@/hooks/use-theme";
import { Ionicons } from "@expo/vector-icons";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

const formSchema = z.object({
  email: z.string().email("Masukkan Email Yang Valid."),
  password: z
    .string()
    .min(8, "Panjang Password Minimal 8 Karakter.")
    .max(64, "Panjang Password Maksimal 64 Karakter."),
});

export default function SignIn() {
  const { signInWithPassword } = useSupabase();
  const { colors, theme } = useTheme();
  const [secureTextEntry, setSecureTextEntry] = React.useState(true);

  const screenWidth = Dimensions.get("window").width;
  const isTablet = screenWidth > 600;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: "center",
      width: isTablet ? wp("50%") : wp("100%"),
      alignSelf: isTablet ? "center" : "stretch",
    },
    logoContainer: {
      alignItems: "center",
      marginTop: isTablet ? -80 : 0,
      marginBottom: isTablet ? -80 : 0,
    },
    logo: {
      width: isTablet ? wp("60%") : wp("80%"),
      height: isTablet ? hp("60%") : hp("30%"),
      resizeMode: "contain",
    },
    title: {
      fontSize: 28, 
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 24,
    },
    form: {
      gap: 20,
    },
    inputContainer: {
      gap: 8,
    },
    label: {
      fontSize: isTablet ? 18 : 16, 
      fontWeight: "500",
      color: colors.textSecondary,
      marginBottom: 4,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    input: {
      flex: 1,
      padding: 16,
      fontSize: 16,
      color: colors.text,
    },
    iconContainer: {
      paddingHorizontal: 16,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 4,
      marginLeft: 4,
    },
    buttonContainer: {
      marginTop: isTablet ? 20 : 32,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: isTablet ? 20 : 18,
      fontWeight: "600",
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      const result = await signInWithPassword(data.email, data.password);
      form.reset();
      console.log(result);
    } catch (error: any) {
      Alert.alert("Email Atau Password Salah");
      console.error("Sign in error:", error);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "android" ? 64 : 0}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={
                theme === "dark"
                  ? require("@/assets/logo/savoria-dark.png")
                  : require("@/assets/logo/savoria-light.png")
              }
              style={styles.logo}
            />
          </View>

          <Text style={styles.title}>Selamat Datang</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={form.watch("email")}
                  onChangeText={(text) => form.setValue("email", text)}
                />
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              </View>
              {form.formState.errors.email && (
                <Text style={styles.errorText}>
                  {form.formState.errors.email.message}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={secureTextEntry}
                  value={form.watch("password")}
                  onChangeText={(text) => form.setValue("password", text)}
                />
                <TouchableOpacity
                  style={styles.iconContainer}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                >
                  <Ionicons
                    name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {form.formState.errors.password && (
                <Text style={styles.errorText}>
                  {form.formState.errors.password.message}
                </Text>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  form.formState.isSubmitting && styles.buttonDisabled,
                ]}
                onPress={form.handleSubmit(onSubmit)}
                disabled={form.formState.isSubmitting}
                activeOpacity={0.8}
              >
                {form.formState.isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* You can add social login buttons here if needed */}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
