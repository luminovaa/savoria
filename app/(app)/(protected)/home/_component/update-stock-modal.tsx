import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Modal, 
  TextInput, 
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { MenuItem } from '@/utils/types';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';

interface UpdateStockModalProps {
  visible: boolean;
  onClose: () => void;
  menu: MenuItem | null;
  onStockUpdated: (menuId: number, newStock: number) => void;
}

export default function UpdateStockModal({ 
  visible, 
  onClose, 
  menu,
  onStockUpdated
}: UpdateStockModalProps) {
  const { colors } = useTheme();
  const [stockValue, setStockValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [operation, setOperation] = useState<'set' | 'add' | 'subtract'>('set');

  useEffect(() => {
    if (menu && visible) {
      setStockValue(menu.stock?.toString() || '0');
      setOperation('set');
    }
  }, [menu, visible]);

  const handleUpdateStock = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    if (!menu || !stockValue.trim()) {
      Alert.alert('Error', 'Masukkan jumlah stock yang valid');
      return;
    }

    const inputValue = parseInt(stockValue);
    if (isNaN(inputValue) || inputValue < 0) {
      Alert.alert('Error', 'Stock harus berupa angka positif');
      return;
    }

    let newStock = inputValue;
    const currentStock = menu.stock || 0;

    // Calculate new stock based on operation
    switch (operation) {
      case 'add':
        newStock = currentStock + inputValue;
        break;
      case 'subtract':
        newStock = currentStock - inputValue;
        if (newStock < 0) {
          Alert.alert('Error', 'Stock tidak boleh kurang dari 0');
          return;
        }
        break;
      case 'set':
      default:
        newStock = inputValue;
        break;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('menu')
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', menu.id);

      if (error) throw error;

      // Call the callback to update the parent component
      onStockUpdated(menu.id, newStock);
      
      Alert.alert('Sukses', `Stock berhasil diupdate menjadi ${newStock}`);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', 'Gagal mengupdate stock: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxWidth: 400,
      maxHeight: '90%', 
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    menuInfo: {
      marginBottom: 20,
    },
    menuName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    currentStock: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    operationContainer: {
      marginBottom: 20,
    },
    operationLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    operationButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    operationButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    operationButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    operationButtonText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    operationButtonTextActive: {
      color: colors.card,
      fontWeight: '600',
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    previewContainer: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
      marginBottom: 20,
    },
    previewText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    previewValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      textAlign: 'center',
      marginTop: 4,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      paddingTop: 10, // Add some padding to ensure buttons are visible
    },
    cancelButton: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    updateButton: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    updateButtonDisabled: {
      backgroundColor: colors.textSecondary,
    },
    updateButtonText: {
      fontSize: 16,
      color: colors.card,
      fontWeight: '600',
    },
  });

  const getPreviewStock = () => {
    if (!menu || !stockValue.trim()) return menu?.stock || 0;
    
    const inputValue = parseInt(stockValue);
    if (isNaN(inputValue)) return menu?.stock || 0;
    
    const currentStock = menu.stock || 0;
    
    switch (operation) {
      case 'add':
        return currentStock + inputValue;
      case 'subtract':
        return Math.max(0, currentStock - inputValue);
      case 'set':
      default:
        return inputValue;
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <ScrollView 
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Stock</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {menu && (
                <>
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuName}>{menu.name_menu}</Text>
                    <Text style={styles.currentStock}>
                      Stock saat ini: {menu.stock || 0}
                    </Text>
                  </View>

                  <View style={styles.operationContainer}>
                    <Text style={styles.operationLabel}>Operasi:</Text>
                    <View style={styles.operationButtons}>
                      <TouchableOpacity
                        style={[
                          styles.operationButton,
                          operation === 'set' && styles.operationButtonActive
                        ]}
                        onPress={() => setOperation('set')}
                      >
                        <Text style={[
                          styles.operationButtonText,
                          operation === 'set' && styles.operationButtonTextActive
                        ]}>
                          Set
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.operationButton,
                          operation === 'add' && styles.operationButtonActive
                        ]}
                        onPress={() => setOperation('add')}
                      >
                        <Text style={[
                          styles.operationButtonText,
                          operation === 'add' && styles.operationButtonTextActive
                        ]}>
                          Tambah
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.operationButton,
                          operation === 'subtract' && styles.operationButtonActive
                        ]}
                        onPress={() => setOperation('subtract')}
                      >
                        <Text style={[
                          styles.operationButtonText,
                          operation === 'subtract' && styles.operationButtonTextActive
                        ]}>
                          Kurang
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      {operation === 'set' ? 'Stock Baru:' : 
                       operation === 'add' ? 'Jumlah Ditambah:' : 
                       'Jumlah Dikurang:'}
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={stockValue}
                      onChangeText={setStockValue}
                      placeholder="Masukkan jumlah..."
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="done"
                      onSubmitEditing={handleUpdateStock}
                    />
                  </View>

                  <View style={styles.previewContainer}>
                    <Text style={styles.previewText}>Stock setelah diupdate:</Text>
                    <Text style={styles.previewValue}>
                      {getPreviewStock()}
                    </Text>
                  </View>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={onClose}
                    >
                      <Text style={styles.cancelButtonText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.updateButton,
                        isLoading && styles.updateButtonDisabled
                      ]}
                      onPress={handleUpdateStock}
                      disabled={isLoading}
                    >
                      <Text style={styles.updateButtonText}>
                        {isLoading ? 'Updating...' : 'Update'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}