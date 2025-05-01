import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  FlatList,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Role } from "@/utils/types";
import { z } from "zod";

const userFormSchema = z.object({
  email: z.string().email("Email tidak valid").min(1, "Email wajib diisi"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter").max(100),
  first_name: z.string().min(1, "Nama depan wajib diisi"),
  last_name: z.string().min(1, "Nama belakang wajib diisi"),
  role_id: z.number().int().positive("Peran wajib dipilih"),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function AddUserScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [form, setForm] = useState<UserFormData>({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role_id: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRoles, setFetchingRoles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const emailInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchRoles();
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 100);
  }, []);

  async function fetchRoles() {
    try {
      setFetchingRoles(true);
      const { data, error } = await supabase
        .from("role")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) {
        throw error;
      }

      setRoles(data || []);
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", "Gagal memuat daftar peran: " + error.message);
    } finally {
      setFetchingRoles(false);
    }
  }

  const validateForm = (): boolean => {
    try {
      userFormSchema.parse(form);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  async function handleAddUser() {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.admin.createUser({
        email: form.email.trim(),
        password: form.password.trim(),
        email_confirm: true,
        user_metadata: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          role_id: form.role_id,
        },
      });

      if (error) {
        throw error;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role_id: form.role_id })
        .eq("id", data.user?.id);

      if (profileError) {
        throw profileError;
      }

      Alert.alert("Sukses", "Pengguna berhasil ditambahkan");
      router.back();
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", "Gagal menambahkan pengguna: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setForm({ ...form, [field]: value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: "" });
    }
  };

  const selectRole = (role: Role) => {
    setSelectedRole(role);
    setForm({ ...form, role_id: role.id });
    setDropdownVisible(false);
    if (formErrors.role_id) {
      setFormErrors({ ...formErrors, role_id: "" });
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
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginLeft: 16,
    },
    content: {
      padding: 16,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: theme === "dark" ? "#000" : colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    fieldContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 6,
      fontWeight: "500",
    },
    input: {
      fontSize: 16,
      color: colors.text,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: theme === "dark" ? colors.background : "#fff",
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 4,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 3,
    },
    saveButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: "600",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    errorContainer: {
      padding: 16,
      backgroundColor: colors.error + "20",
      borderRadius: 8,
      marginBottom: 16,
    },
    errorFullText: {
      color: colors.error,
      textAlign: "center",
    },
    backButton: {
      padding: 8,
    },
    fieldIcon: {
      marginRight: 10,
      width: 24,
      alignItems: "center",
    },
    dropdownButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: theme === "dark" ? colors.background : "#fff",
    },
    dropdownButtonText: {
      fontSize: 16,
      color: colors.text,
    },
    dropdownPlaceholder: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      margin: 20,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      maxHeight: "70%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    roleItem: {
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    roleItemText: {
      fontSize: 16,
      color: colors.text,
    },
  });

  if (fetchingRoles) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>
          Memuat daftar peran...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorFullText}>Error: {error}</Text>
            </View>
          )}
          <View style={styles.section}>
            <View style={styles.fieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather name="mail" size={18} color={colors.primary} />
                </View>
                <Text style={styles.label}>Email</Text>
              </View>
              <TextInput
                ref={emailInputRef}
                style={[
                  styles.input,
                  formErrors.email ? styles.inputError : null,
                ]}
                value={form.email}
                onChangeText={(text) => handleInputChange("email", text)}
                placeholder="Masukkan email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {formErrors.email && (
                <Text style={styles.errorText}>{formErrors.email}</Text>
              )}
            </View>
            <View style={styles.fieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather name="lock" size={18} color={colors.primary} />
                </View>
                <Text style={styles.label}>Kata Sandi</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  formErrors.password ? styles.inputError : null,
                ]}
                value={form.password}
                onChangeText={(text) => handleInputChange("password", text)}
                placeholder="Masukkan kata sandi"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />
              {formErrors.password && (
                <Text style={styles.errorText}>{formErrors.password}</Text>
              )}
            </View>
            <View style={styles.fieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather name="user" size={18} color={colors.primary} />
                </View>
                <Text style={styles.label}>Nama Depan</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  formErrors.first_name ? styles.inputError : null,
                ]}
                value={form.first_name}
                onChangeText={(text) => handleInputChange("first_name", text)}
                placeholder="Masukkan nama depan"
                placeholderTextColor={colors.textSecondary}
              />
              {formErrors.first_name && (
                <Text style={styles.errorText}>{formErrors.first_name}</Text>
              )}
            </View>
            <View style={styles.fieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather name="user" size={18} color={colors.primary} />
                </View>
                <Text style={styles.label}>Nama Belakang</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  formErrors.last_name ? styles.inputError : null,
                ]}
                value={form.last_name}
                onChangeText={(text) => handleInputChange("last_name", text)}
                placeholder="Masukkan nama belakang"
                placeholderTextColor={colors.textSecondary}
              />
              {formErrors.last_name && (
                <Text style={styles.errorText}>{formErrors.last_name}</Text>
              )}
            </View>
            <View style={styles.fieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather name="users" size={18} color={colors.primary} />
                </View>
                <Text style={styles.label}>Peran</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  formErrors.role_id ? styles.inputError : null,
                ]}
                onPress={() => setDropdownVisible(true)}
              >
                <Text
                  style={
                    selectedRole
                      ? styles.dropdownButtonText
                      : styles.dropdownPlaceholder
                  }
                >
                  {selectedRole ? selectedRole.name : "Pilih peran"}
                </Text>
                <Feather
                  name="chevron-down"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {formErrors.role_id && (
                <Text style={styles.errorText}>{formErrors.role_id}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleAddUser}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Tambah Pengguna</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Peran</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDropdownVisible(false)}
              >
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={roles}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.roleItem}
                  onPress={() => selectRole(item)}
                >
                  <Text style={styles.roleItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
