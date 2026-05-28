import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { authService } from "@/services/api-client";
import { adminUserService } from "@/services/data-service";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { UserList } from "@/utils/types";
import { capitalizeText } from "@/utils/format";
import UserActionModal from "./_components/modal-user";

export default function UsersListScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [users, setUsers] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [selectedUser, setSelectedUser] = useState<UserList | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // State untuk menyimpan role pengguna
  const isOwner = userRole === "Owner";

  useEffect(() => {
    fetchUsers();
    fetchUserRole();
  }, []);

  const fetchUserRole = useCallback(async () => {
    try {
      const user = await authService.sessionUser();
      if (!user)
        throw new Error("Gagal mendapatkan data pengguna");
      setUserRole(user.role);
      setError(null);
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", "Gagal memuat data role pengguna");
    }
  }, []);
  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await adminUserService.list();
      setUsers(data.map((user: any) => ({
        id: user.id,
        email: user.email || "",
        full_name: user.full_name || "-",
        role_name: user.role || "-",
      })));
      setError(null);
    } catch (error: any) {
      setError(error.message);
      if (users.length === 0) {
        Alert.alert("Error", "Gagal memuat daftar kasir");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleAddCashier = () => {
    router.push("/(app)/(protected)/cashier/add-user");
  };

  const handleLongPress = (
    user: UserList,
    event: { nativeEvent: { pageX: number; pageY: number } }
  ) => {
    if (!isOwner) {
      return;
    }
    setSelectedUser(user);
    setModalPosition({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
    setModalVisible(true);
  };

  const confirmDeleteUser = (user: UserList) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus kasir ${user.full_name || "-"}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => deleteUser(user.id),
        },
      ],
      { cancelable: true }
    );
  };

  const deleteUser = async (userId: string) => {
    try {
      await adminUserService.remove(userId);
      setUsers(users.filter((user) => user.id !== userId));
      Alert.alert("Sukses", "Pengguna berhasil dihapus");
    } catch (error: any) {
      Alert.alert("Error", "Gagal menghapus kasir");
    }
  };

  const renderUserItem = ({ item }: { item: UserList }) => (
    <TouchableOpacity
      style={styles.userItem}
      onLongPress={isOwner ? (event) => handleLongPress(item, event) : undefined}
      activeOpacity={isOwner ? 0.7 : 1}
    >
      <View style={styles.userIcon}>
        <Feather name="user" size={20} color={colors.primary} />
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userEmail, { color: colors.text }]}>
          {capitalizeText(item.full_name || "-")}
        </Text>
        <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
          Email: {item.email}
        </Text>
      </View>
      <View style={styles.roleContainer}>
        <Text style={[styles.roleText, { color: colors.primary }]}>
          {item.role_name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
      paddingBottom: 80,
    },
    userItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      marginHorizontal: 5,
      shadowColor: theme === "dark" ? "#000" : colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    userIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    userInfo: {
      flex: 1,
    },
    userEmail: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 4,
    },
    userMeta: {
      fontSize: 14,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    roleContainer: {
      marginLeft: "auto",
      paddingLeft: 12,
    },
    roleText: {
      fontSize: 16,
      fontWeight: "600",
      textTransform: "capitalize",
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
    addButtonContainer: {
      position: "absolute",
      bottom: 80,
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    addButton: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    addButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>
          Memuat daftar kasir...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text
              style={[
                styles.userMeta,
                { color: colors.text, textAlign: "center" },
              ]}
            >
              Tidak ada kasir ditemukan
            </Text>
          }
        />
      </View>
      {isOwner && (
        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddCashier}>
            <Feather name="plus" size={20} color={colors.buttonText} />
            <Text style={styles.addButtonText}>Tambah Kasir</Text>
          </TouchableOpacity>
        </View>
      )}
      {isOwner && (
        <UserActionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        user={selectedUser}
        position={modalPosition}
        onDelete={confirmDeleteUser}
        />
      )}
    </SafeAreaView>
  );
}
