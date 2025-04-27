import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { capitalizeText } from "@/utils/format";

interface Category {
  id: number;
  name_category: string;
}

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  categories: Category[];
  colors: {
    text: string;
    card: string;
    border: string;
  };
}

const CategoryModal = ({
  visible,
  onClose,
  onSelect,
  categories,
  colors,
}: CategoryModalProps) => {
  const dynamicStyles = StyleSheet.create({
    modalContent: {
      backgroundColor: colors.card,
      width: "80%",
      maxHeight: "80%",
      borderRadius: 8,
      padding: 20,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    categoryItem: {
      borderBottomColor: colors.border,
      paddingVertical: 15,
      borderBottomWidth: 1,
    },
    categoryItemText: {
      color: colors.text,
      fontSize: 16,
    },
    closeButtonIcon: {
      color: colors.text,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
      },
      modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      },
      closeButton: {
        padding: 5,
      },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={dynamicStyles.modalContainer}>
        <View style={dynamicStyles.modalContent}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>Pilih Kategori</Text>
            <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
              <Feather name="x" size={24} style={dynamicStyles.closeButtonIcon} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={dynamicStyles.categoryItem}
                onPress={() => onSelect(item)}
              >
                <Text style={dynamicStyles.categoryItemText}>
                  {capitalizeText(item.name_category)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};


export default CategoryModal;