import React, { useState, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import { Member } from "@/utils/types";


export default function EditMemberScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    name_member: "",
    percent: "",
  });
  const [errors, setErrors] = useState({
    name_member: "",
    percent: "",
  });

  useEffect(() => {
    if (id) {
      fetchMember();
    }
  }, [id]);

  const fetchMember = async () => {
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from("member")
        .select("*")
        .eq("id", id)
        .eq("is_deleted", false)
        .single();

      if (error) throw error;

      if (!data) {
        Alert.alert("Error", "Member tidak ditemukan", [
          { text: "OK", onPress: () => router.back() }
        ]);
        return;
      }

      setMember(data);
      setFormData({
        name_member: data.name_member,
        percent: data.percent.toString(),
      });
    } catch (error: any) {
      console.error("Error fetching member:", error);
      Alert.alert("Error", "Gagal memuat data member", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } finally {
      setInitialLoading(false);
    }
  };

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
    if (!validateForm() || !member) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("member")
        .update({
          name_member: formData.name_member.trim(),
          percent: parseFloat(formData.percent),
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id)
        .select();

      if (error) throw error;

      Alert.alert(
        "Berhasil",
        "Data member berhasil diperbarui",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error updating member:", error);
      Alert.alert(
        "Error",
        error.message || "Terjadi kesalahan saat memperbarui member"
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

  const handleDelete = () => {
    if (!member) return;

    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus member ${member.name_member}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!member) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("member")
        .update({ 
          is_deleted: true, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", member.id);

      if (error) throw error;

      Alert.alert(
        "Berhasil",
        "Member berhasil dihapus",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error deleting member:", error);
      Alert.alert("Error", "Gagal menghapus member: " + error.message);
    } finally {
      setLoading(false);
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
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
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
    deleteButton: {
      padding: 8,
    },
    scrollContainer: {
      flex: 1,
    },
    content: {
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.text,
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
    memberInfo: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 16,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    memberInfoTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    memberInfoText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
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
    buttonLoadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    buttonLoadingText: {
      color: colors.card,
      marginLeft: 8,
      fontSize: 16,
      fontWeight: "600",
    },
  });

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Member</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat data member...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!member) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Member</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Member tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Member</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={loading}
        >
          <Feather name="trash-2" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.scrollContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          

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
              <View style={styles.buttonLoadingContainer}>
                <ActivityIndicator size="small" color={colors.card} />
                <Text style={styles.buttonLoadingText}>Menyimpan...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Simpan Perubahan</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}