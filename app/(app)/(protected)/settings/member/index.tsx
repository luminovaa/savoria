import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MemberActionModal from "./_components/modal-action";

interface Member {
  id: string;
  name_member: string;
  percent: number;
  created_at: string;
  is_deleted?: boolean;
  isAddButton?: boolean;
}

export default function MemberListScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const LIMIT = 15;

  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
  const isTablet = SCREEN_WIDTH > 600;

  const fetchMembers = useCallback(async (pageNumber = 0, refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
      } else if (pageNumber > 0) {
        setLoadingMore(true);
      }

      const from = pageNumber * LIMIT;
      const to = from + LIMIT - 1;

      let query = supabase
        .from("member")
        .select("*", { count: "exact" })
        .eq("is_deleted", false) // Filter out deleted members
        .order("created_at", { ascending: false });

      if (pageNumber > 0) {
        query = query.range(from, to);
      } else {
        query = query.limit(LIMIT);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const memberData = data || [];
      
      // Add the "Add Member" button as the first item
      const membersWithAddButton = [
        {
          id: "add-member",
          name_member: "Tambah Member",
          percent: 0,
          created_at: "",
          isAddButton: true,
        },
        ...memberData,
      ];
      
      if (refresh) {
        setMembers(membersWithAddButton);
      } else {
        setMembers(prevMembers => {
          const existingIds = new Set(prevMembers.map(member => member.id));
          const newMembers = memberData.filter(member => !existingIds.has(member.id));
          return [...prevMembers, ...newMembers];
        });
      }

      if (memberData.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      setPage(pageNumber);
    } catch (error: any) {
      setError(error.message);
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers(0, true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    await fetchMembers(0, true);
  }, [fetchMembers]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchMembers(page + 1);
    }
  }, [fetchMembers, loadingMore, hasMore, page]);

  const handleAddMember = () => {
    router.push("/(app)/(protected)/settings/member/add");
  };

  const handleLongPress = (
    member: Member,
    event: { nativeEvent: { pageX: number; pageY: number } }
  ) => {
    if (member.isAddButton) return; // Don't show modal for "Add Member" button
    setSelectedMember(member);
    setModalPosition({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
    setModalVisible(true);
  };

  const handleEditMember = (member: Member) => {
    router.push(`/(app)/(protected)/settings/member/edit/${member.id}`);
    setModalVisible(false);
  };

  const confirmDeleteMember = (member: Member) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus member ${member.name_member}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => softDeleteMember(member.id),
        },
      ],
      { cancelable: true }
    );
    setModalVisible(false);
  };

  const softDeleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("member")
        .update({ is_deleted: true,})
        .eq("id", memberId);

      if (error) throw error;

      setMembers(members.filter((member) => member.id !== memberId));
      Alert.alert("Sukses", "Member berhasil dihapus");
    } catch (error: any) {
      Alert.alert("Error", "Gagal menghapus member: " + error.message);
    }
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    if (item.isAddButton) {
      return (
        <TouchableOpacity
          style={[styles.addMemberItem, { backgroundColor: colors.card }]}
          onPress={handleAddMember}
        >
          <View style={styles.addIconContainer}>
            <Feather name="plus" size={24} color={colors.primary} />
          </View>
          <View style={styles.addMemberInfo}>
            <Text style={[styles.addMemberText, { color: colors.text }]}>
              {item.name_member}
            </Text>
            <Text style={[styles.addMemberSubText, { color: colors.textSecondary }]}>
              Klik untuk menambah member baru
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.memberItem, { backgroundColor: colors.card }]}
        onLongPress={(event) => handleLongPress(item, event)}
      >
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {item.name_member}
          </Text>
          <Text style={[styles.memberDate, { color: colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        
        <View style={styles.percentBadge}>
          <Text style={[styles.percentText, { color: colors.primary }]}>
            {item.percent}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        Daftar Member
      </Text>
      <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
        Kelola member dan persentase komisi
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Memuat member lainnya...
        </Text>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    headerContainer: {
      paddingHorizontal: 16,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: isTablet ? 28 : 24,
      fontWeight: "bold",
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: isTablet ? 16 : 14,
    },
    listContainer: {
      flex: 1,
      paddingTop: 8,
    },
    memberItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      shadowColor: theme === "dark" ? "#000" : colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    addMemberItem: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.primary,
      shadowColor: theme === "dark" ? "#000" : colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    addIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    addMemberInfo: {
      flex: 1,
    },
    addMemberText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "600",
      marginBottom: 2,
    },
    addMemberSubText: {
      fontSize: isTablet ? 14 : 12,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "500",
      marginBottom: 4,
    },
    memberDate: {
      fontSize: isTablet ? 14 : 12,
    },
    percentBadge: {
      backgroundColor: colors.primary + "20",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    percentText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "bold",
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
      margin: 16,
    },
    errorText: {
      color: colors.error,
      textAlign: "center",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 30,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    footerLoader: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    footerText: {
      marginLeft: 8,
      fontSize: 14,
    },
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>
          Memuat daftar member...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <View style={styles.listContainer}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}

        <FlatList
          data={members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => `member-${item.id}`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          extraData={members.length}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                Tidak ada member yang terdaftar
              </Text>
            </View>
          }
        />
      </View>

      <MemberActionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        member={selectedMember}
        position={modalPosition}
        onEdit={handleEditMember}
        onDelete={confirmDeleteMember}
      />
    </SafeAreaView>
  );
}