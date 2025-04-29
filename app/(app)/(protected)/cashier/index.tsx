import React, { useState, useEffect } from "react";
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
import { supabase } from "@/utils/supabase";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ProfileWithRole, UserList } from "@/utils/types";
import { capitalizeText } from "@/utils/format";
import  UserActionModal  from "./_components/modal-user";

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

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { data: authData, error: authError } =
        await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const { data: profilesData, error: profilesError } = (await supabase
        .from("profiles")
        .select(`id, first_name, last_name, role_id, role (name)`)) as {
        data: ProfileWithRole[];
        error: any;
      };

      if (profilesError) throw profilesError;

      const combinedUsers = authData.users.map((user) => {
        const profile = profilesData.find((p) => p.id === user.id);
        return {
          id: user.id,
          email: user.email || "",
          last_sign_in_at: user.last_sign_in_at,
          first_name: profile?.first_name || "-",
          last_name: profile?.last_name || "-",
          role_name: profile?.role?.name || "-",
        };
      });
      setUsers(combinedUsers);
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", "Gagal memuat daftar kasir");
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
      `Apakah Anda yakin ingin menghapus kasir ${user.first_name} ${user.last_name}?`,
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
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      setUsers(users.filter((user) => user.id !== userId));
      Alert.alert("Sukses", "Pengguna berhasil dihapus");
    } catch (error: any) {
      Alert.alert("Error", "Gagal menghapus kasir");
    }
  };

  const renderUserItem = ({ item }: { item: UserList }) => (
    <TouchableOpacity
      style={styles.userItem}
      onLongPress={(event) => handleLongPress(item, event)}
    >
      <View style={styles.userIcon}>
        <Feather name="user" size={20} color={colors.primary} />
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userEmail, { color: colors.text }]}>
          {capitalizeText(item.first_name + " " + item.last_name)}
        </Text>
        <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
          Email: {item.email}
        </Text>
        <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
          Terakhir login:{" "}
          {item.last_sign_in_at
            ? new Date(item.last_sign_in_at).toLocaleDateString()
            : "-"}
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
      color: "#FFFFFF",
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

      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCashier}>
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Tambah Kasir</Text>
        </TouchableOpacity>
      </View>

      <UserActionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        user={selectedUser}
        position={modalPosition}
        onDelete={confirmDeleteUser}
      />
    </SafeAreaView>
  );
}
