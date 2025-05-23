import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";

export default function AddMemberScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name_member: "",
    percent: "",
  });
  const [errors, setErrors] = useState({
    name_member: "",
    percent: "",
  });

  const validateForm = () => {
    const newErrors = {
      name_member: "",
      percent: "",
    };
    let isValid = true;

    // Validate name
    if (!formData.name_member.trim()) {
      newErrors.name_member = "Nama member wajib diisi";
      isValid = false;
    } else if (formData.name_member.trim().length < 2) {
      newErrors.name_member = "Nama member minimal 2 karakter";
      isValid = false;
    }

    // Validate percent
    if (!formData.percent.trim()) {
      newErrors.percent = "Persentase komisi wajib diisi";
      isValid = false;
    } else {
      const percentValue = parseFloat(formData.percent);
      if (isNaN(percentValue)) {
        newErrors.percent = "Persentase harus berupa angka";
        isValid = false;
      } else if (percentValue < 0) {
        newErrors.percent = "Persentase tidak boleh negatif";
        isValid = false;
      } else if (percentValue > 100) {
        newErrors.percent = "Persentase tidak boleh lebih dari 100%";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("member")
        .insert([
          {
            name_member: formData.name_member.trim(),
            percent: parseFloat(formData.percent),
            is_deleted: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      Alert.alert(
        "Berhasil",
        "Member berhasil ditambahkan",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error adding member:", error);
      Alert.alert(
        "Error",
        error.message || "Terjadi kesalahan saat menambahkan member"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    scrollContainer: {
      flex: 1,
    },
    content: {
      padding: 16,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 8,
    },
    required: {
      color: colors.error,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
    },
    inputError: {
      borderColor: colors.error,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: 4,
    },
    percentContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    percentInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
    },
    percentSymbol: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 8,
      fontWeight: "500",
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 20,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: colors.card,
      fontSize: 16,
      fontWeight: "600",
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: colors.card,
      marginLeft: 8,
      fontSize: 16,
      fontWeight: "600",
    },
    infoBox: {
      backgroundColor: colors.primary + "20",
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    infoText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah Member</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.scrollContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Tambahkan member baru dengan mengisi nama dan persentase komisi yang akan diterima member tersebut.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Nama Member <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.name_member && styles.inputError,
              ]}
              placeholder="Masukkan nama member"
              placeholderTextColor={colors.textSecondary}
              value={formData.name_member}
              onChangeText={(value) => handleInputChange("name_member", value)}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {errors.name_member ? (
              <Text style={styles.errorText}>{errors.name_member}</Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Persentase Komisi <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.percentContainer}>
              <TextInput
                style={[
                  styles.percentInput,
                  errors.percent && styles.inputError,
                ]}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={formData.percent}
                onChangeText={(value) => handleInputChange("percent", value)}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.percentSymbol}>%</Text>
            </View>
            {errors.percent ? (
              <Text style={styles.errorText}>{errors.percent}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.card} />
                <Text style={styles.loadingText}>Menyimpan...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Tambah Member</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}