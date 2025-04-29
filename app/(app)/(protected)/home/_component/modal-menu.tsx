import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { MenuItem } from '@/utils/types';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

interface MenuActionModalProps {
  visible: boolean;
  onClose: () => void;
  menu: MenuItem | null;
  position: { x: number; y: number };
  onDelete: (menu: MenuItem) => void;
  onArchive?: (menu: MenuItem) => void; // New archive callback
}

export default function MenuActionModal({ 
  visible, 
  onClose, 
  menu, 
  position, 
  onDelete,
  onArchive 
}: MenuActionModalProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const styles = StyleSheet.create({
    modalContainer: {
      position: 'absolute',
      width: 160,
      backgroundColor: colors.card,
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
      top: position.y,
      left: position.x - 160, 
    },
    modalButton: {
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.textSecondary + '20',
    },
    modalButtonText: {
      color: colors.text,
      fontSize: 16,
      marginLeft: 8,
    },
    modalButtonDestructive: {
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalButtonDestructiveText: {
      color: colors.error,
      fontSize: 16,
      marginLeft: 8,
    },
    iconContainer: {
      width: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'transparent' }}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalButton}
            onPress={() => {
              if (menu) {
                router.push({
                  pathname: '/(app)/(protected)/home/edit-menu',
                  params: { menuId: menu.id },
                });
                onClose();
              }
            }}
          >
            <View style={styles.iconContainer}>
              <Feather name="edit" width={16} height={16} color={colors.text} />
            </View>
            <Text style={styles.modalButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.modalButton} 
            onPress={() => {
              if (menu && onArchive) {
                onArchive(menu);
                onClose();
              }
            }}
          >
            <View style={styles.iconContainer}>
              <Feather name="archive" width={16} height={16} color={colors.text} />
            </View>
            <Text style={styles.modalButtonText}>Arsipkan</Text>
          </Pressable>
          <Pressable
            style={styles.modalButtonDestructive}
            onPress={() => {
              if (menu) {
                onDelete(menu);
                onClose();
              }
            }}
          >
            <View style={styles.iconContainer}>
              <Feather name="trash-2" width={16} height={16} color={colors.error} />
            </View>
            <Text style={styles.modalButtonDestructiveText}>Hapus</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}