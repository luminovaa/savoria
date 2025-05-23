import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";

interface Member {
  id: string;
  name_member: string;
  percent: number;
  created_at: string;
  is_deleted?: boolean;
}

interface MemberActionModalProps {
  visible: boolean;
  onClose: () => void;
  member: Member | null;
  position: { x: number; y: number };
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function MemberActionModal({
  visible,
  onClose,
  member,
  position,
  onEdit,
  onDelete,
}: MemberActionModalProps) {
  const { colors } = useTheme();

  if (!member) return null;

  const modalWidth = 200;
  const modalHeight = 120;

  // Calculate position to keep modal within screen bounds
  const calculatePosition = () => {
    let x = position.x - modalWidth / 2;
    let y = position.y - modalHeight - 10;

    // Adjust horizontal position
    if (x < 10) x = 10;
    if (x + modalWidth > SCREEN_WIDTH - 10) x = SCREEN_WIDTH - modalWidth - 10;

    // Adjust vertical position
    if (y < 50) y = position.y + 10; // Show below finger if not enough space above
    if (y + modalHeight > SCREEN_HEIGHT - 50) y = SCREEN_HEIGHT - modalHeight - 50;

    return { x, y };
  };

  const modalPosition = calculatePosition();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      justifyContent: "flex-start",
      alignItems: "flex-start",
    },
    modal: {
      position: "absolute",
      left: modalPosition.x,
      top: modalPosition.y,
      width: modalWidth,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    menuItemText: {
      marginLeft: 12,
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    deleteText: {
      color: colors.error,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 8,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => onEdit(member)}
          >
            <Feather name="edit-2" size={16} color={colors.primary} />
            <Text style={styles.menuItemText}>Edit Member</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => onDelete(member)}
          >
            <Feather name="trash-2" size={16} color={colors.error} />
            <Text style={[styles.menuItemText, styles.deleteText]}>
              Hapus Member
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}