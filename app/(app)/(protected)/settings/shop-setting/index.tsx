import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { Shop } from "@/utils/types";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";

export default function ShopSettingScreen() {
  const { colors, theme } = useTheme();

  const [shop, setShop] = useState<Shop>({
    name: "",
    address: "",
    phone: "",
    wifi_name: "",
    wifi_password: "",
  });

  const [editedShop, setEditedShop] = useState<Shop>({
    name: "",
    address: "",
    phone: "",
    wifi_name: "",
    wifi_password: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchShop();
  }, []);

  async function fetchShop() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shop")
        .select("id, name, address, phone, wifi_name, wifi_password")
        .single();

      if (error) {
        throw error;
      }

      const shopData = data || {
        name: "",
        address: "",
        phone: "",
        wifi_name: "",
        wifi_password: "",
      };

      setShop(shopData);
      setEditedShop(shopData);
    } catch (error: any) {
      setError(error.message);
      console.error("Error fetching shop:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateShop() {
    try {
      setSaving(true);

      // Simple validation
      if (!editedShop.name!.trim()) {
        Alert.alert("Error", "Nama toko tidak boleh kosong");
        return;
      }

      const { error } = await supabase
        .from("shop")
        .update({
          name: editedShop.name!.trim(),
          address: editedShop.address!.trim(),
          phone: editedShop.phone!.trim(),
          wifi_name: editedShop.wifi_name!.trim(),
          wifi_password: editedShop.wifi_password!.trim(),
          updated_at: new Date(),
        })
        .eq("id", shop.id)
        .select();

      if (error) {
        throw error;
      }

      setShop(editedShop);
      setIsEditing(false);
      Alert.alert("Sukses", "Data toko berhasil diperbarui");
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", "Gagal menyimpan data toko: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing, revert changes
      setEditedShop(shop);
      setIsEditing(false);
      setShowWifiPassword(false);
    } else {
      setIsEditing(true);
      // Focus on name input after a short delay
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  };

  const toggleShowWifiPassword = () => {
    setShowWifiPassword(!showWifiPassword);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      paddingBottom: 7,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isEditing ? colors.error + "20" : colors.primary + "20",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    editButtonText: {
      marginLeft: 4,
      fontWeight: "500",
      color: isEditing ? colors.error : colors.primary,
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
    lastFieldContainer: {
      marginBottom: 0,
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 6,
      fontWeight: "500",
    },
    value: {
      fontSize: 16,
      color: colors.text,
      paddingVertical: 6,
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
    errorText: {
      color: colors.error,
      textAlign: "center",
    },
    fieldIcon: {
      marginRight: 10,
      width: 24,
      alignItems: "center",
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>
          Memuat data toko...
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
              <Text style={styles.errorText}>Error: {error}</Text>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Informasi Toko</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditToggle}
              >
                <Feather
                  name={isEditing ? "x" : "edit-2"}
                  size={16}
                  color={isEditing ? colors.error : colors.primary}
                />
                <Text style={styles.editButtonText}>
                  {isEditing ? "Batal" : "Edit"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather
                    name="shopping-bag"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.label}>Nama Toko</Text>
              </View>
              {isEditing ? (
                <TextInput
                  ref={nameInputRef}
                  style={styles.input}
                  value={editedShop.name}
                  onChangeText={(text) =>
                    setEditedShop({ ...editedShop, name: text })
                  }
                  placeholder="Masukkan nama toko"
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={styles.value}>{shop.name || "-"}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather name="map-pin" size={18} color={colors.primary} />
                </View>
                <Text style={styles.label}>Alamat Toko</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedShop.address}
                  onChangeText={(text) =>
                    setEditedShop({ ...editedShop, address: text })
                  }
                  placeholder="Masukkan alamat toko"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              ) : (
                <Text style={styles.value}>{shop.address || "-"}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather name="phone" size={18} color={colors.primary} />
                </View>
                <Text style={styles.label}>Nomor Telepon</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedShop.phone}
                  onChangeText={(text) =>
                    setEditedShop({ ...editedShop, phone: text })
                  }
                  placeholder="Masukkan nomor telepon"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.value}>{shop.phone || "-"}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather name="wifi" size={18} color={colors.primary} />
                </View>
                <Text style={styles.label}>Nama WiFi</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedShop.wifi_name}
                  onChangeText={(text) =>
                    setEditedShop({ ...editedShop, wifi_name: text })
                  }
                  placeholder="Masukkan nama WiFi toko"
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={styles.value}>{shop.wifi_name || "-"}</Text>
              )}
            </View>

            <View style={styles.lastFieldContainer}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.fieldIcon}>
                  <Feather name="lock" size={18} color={colors.primary} />
                </View>
                <Text style={styles.label}>Password WiFi</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedShop.wifi_password}
                  onChangeText={(text) =>
                    setEditedShop({ ...editedShop, wifi_password: text })
                  }
                  placeholder="Masukkan password WiFi"
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={styles.value}>{shop.wifi_password || "-"}</Text>
              )}
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={updateShop}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
