import React, { useState, useEffect } from "react";
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
  Image,
  Modal,
  FlatList,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { z } from "zod";
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// Schema validasi untuk form menu
const menuFormSchema = z.object({
  name_menu: z.string().min(1, "Nama menu wajib diisi"),
  description: z.string().min(1, "Deskripsi wajib diisi"),
  price: z.number().positive("Harga harus lebih dari 0"),
  category_id: z.number().positive("Kategori wajib dipilih"),
  promo: z.boolean().default(false),
  promo_price: z.number().optional(),
  promo_start: z.string().optional(),
  promo_end: z.string().optional(),
});

type MenuFormData = z.infer<typeof menuFormSchema>;

interface Category {
  id: number;
  name_category: string;
}

interface Bucket {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number;
  allowed_mime_types: string[];
}

export default function AddMenuScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [form, setForm] = useState<MenuFormData>({
    name_menu: "",
    description: "",
    price: 0,
    category_id: 0,
    promo: false,
    promo_price: 0,
    promo_start: "",
    promo_end: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    initializeCategories();
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Maaf, kami membutuhkan izin untuk mengakses galeri foto');
        }
      }
    })();
  }, []);

  async function initializeCategories() {
    try {
      const { data, error } = await supabase
        .from('category')
        .select('id, name_category')
        .order('name_category');
      
      if (error) throw error;
      
      setCategories(data || []);
      
      if (form.category_id && data) {
        const selected = data.find(cat => cat.id === form.category_id);
        if (selected) {
          setSelectedCategory(selected);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Gagal memuat kategori: ' + error.message);
    }
  }

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memilih gambar');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      // Upload gambar
      const response = await fetch(uri);
      const arraybuffer = await response.arrayBuffer();
      
      // Cek ukuran file (5MB)
      if (arraybuffer.byteLength > 5 * 1024 * 1024) {
        throw new Error('Ukuran file terlalu besar. Maksimal 5MB');
      }

      // Cek tipe file
      const fileType = uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      if (!['jpeg', 'png', 'jpg'].includes(fileType)) {
        throw new Error('Tipe file tidak didukung. Gunakan JPEG, PNG, atau JPG');
      }

      const fileName = `menu-${Date.now()}.${fileType}`;
      
      console.log('Uploading file:', {
        fileName,
        fileType,
        fileSize: arraybuffer.byteLength
      });

      const { data, error } = await supabase.storage
        .from('file')
        .upload(fileName, arraybuffer, {
          contentType: `image/${fileType}`,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw new Error('Gagal mengupload gambar: ' + error.message);
      }

      console.log('File uploaded successfully:', data);

      // Dapatkan URL publik
      const { data: { publicUrl } } = supabase.storage
        .from('file')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload image error:', error);
      throw new Error('Gagal mengupload gambar: ' + error.message);
    }
  };

  const validateForm = (): boolean => {
    try {
      menuFormSchema.parse(form);
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

  async function handleAddMenu() {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);
      let imageUrl = null;
      
      if (image) {
        imageUrl = await uploadImage(image);
      }

      // Debug: Log data yang akan disimpan
      console.log('Data menu yang akan disimpan:', {
        name_menu: form.name_menu.trim(),
        description: form.description.trim(),
        price: form.price,
        category_id: form.category_id,
        images: imageUrl,
        promo: form.promo,
        promo_price: form.promo ? form.promo_price : null,
        promo_start: form.promo ? form.promo_start : null,
        promo_end: form.promo ? form.promo_end : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const { error } = await supabase
        .from('menu')
        .insert({
          name_menu: form.name_menu.trim(),
          description: form.description.trim(),
          price: form.price,
          category_id: form.category_id,
          images: imageUrl,
          promo: form.promo,
          promo_price: form.promo ? form.promo_price : null,
          promo_start: form.promo ? form.promo_start : null,
          promo_end: form.promo ? form.promo_end : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error menyimpan menu:', error);
        throw error;
      }

      Alert.alert("Sukses", "Menu berhasil ditambahkan");
      router.back();
    } catch (error: any) {
      console.error('Error detail:', error);
      Alert.alert("Error", "Gagal menambahkan menu: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (field: keyof MenuFormData, value: string | number | boolean) => {
    setForm({ ...form, [field]: value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: "" });
    }
  };

  const selectCategory = (category: Category) => {
    setSelectedCategory(category);
    setForm({ ...form, category_id: category.id });
    setShowCategoryModal(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Tambah Menu</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Upload Image */}
          <TouchableOpacity
            style={styles.imageUploadContainer}
            onPress={pickImage}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="image" size={40} color={colors.primary} />
                <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>
                  Tap untuk memilih gambar
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name Menu */}
          <View style={styles.fieldContainer}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.fieldIcon}>
                <Feather name="tag" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Nama Menu</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                formErrors.name_menu ? styles.inputError : null,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={form.name_menu}
              onChangeText={(value) => handleInputChange("name_menu", value)}
              placeholder="Masukkan nama menu"
              placeholderTextColor={colors.textSecondary}
            />
            {formErrors.name_menu && (
              <Text style={styles.errorText}>{formErrors.name_menu}</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.fieldIcon}>
                <Feather name="file-text" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Deskripsi</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                formErrors.description ? styles.inputError : null,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={form.description}
              onChangeText={(value) => handleInputChange("description", value)}
              placeholder="Masukkan deskripsi menu"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />
            {formErrors.description && (
              <Text style={styles.errorText}>{formErrors.description}</Text>
            )}
          </View>

          {/* Price */}
          <View style={styles.fieldContainer}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.fieldIcon}>
                <Feather name="dollar-sign" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Harga</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                formErrors.price ? styles.inputError : null,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={form.price.toString()}
              onChangeText={(value) => handleInputChange("price", parseFloat(value) || 0)}
              placeholder="Masukkan harga"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
            {formErrors.price && (
              <Text style={styles.errorText}>{formErrors.price}</Text>
            )}
          </View>

          {/* Category */}
          <View style={styles.fieldContainer}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.fieldIcon}>
                <Feather name="grid" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Kategori</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.input,
                styles.categoryButton,
                formErrors.category_id ? styles.inputError : null,
                { borderColor: colors.border },
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={{ color: selectedCategory ? colors.text : colors.textSecondary }}>
                {selectedCategory ? selectedCategory.name_category : "Pilih kategori"}
              </Text>
              <Feather name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {formErrors.category_id && (
              <Text style={styles.errorText}>{formErrors.category_id}</Text>
            )}
          </View>

          {/* Promo Section */}
          <View style={styles.fieldContainer}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              <View style={styles.fieldIcon}>
                <Feather name="percent" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Promo</Text>
              <TouchableOpacity
                style={styles.switchContainer}
                onPress={() => handleInputChange("promo", !form.promo)}
              >
                <View
                  style={[
                    styles.switch,
                    { backgroundColor: form.promo ? colors.primary : colors.border },
                  ]}
                >
                  <View style={styles.switchThumb} />
                </View>
              </TouchableOpacity>
            </View>

            {form.promo && (
              <>
                <View style={styles.promoField}>
                  <Text style={styles.promoLabel}>Harga Promo</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={form.promo_price?.toString()}
                    onChangeText={(value) => handleInputChange("promo_price", parseFloat(value) || 0)}
                    placeholder="Masukkan harga promo"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.promoField}>
                  <Text style={styles.promoLabel}>Mulai Promo</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={form.promo_start}
                    onChangeText={(value) => handleInputChange("promo_start", value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.promoField}>
                  <Text style={styles.promoLabel}>Akhir Promo</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={form.promo_end}
                    onChangeText={(value) => handleInputChange("promo_end", value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleAddMenu}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Tambah Menu</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Pilih Kategori</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => selectCategory(item)}
                >
                  <Text style={[styles.categoryItemText, { color: colors.text }]}>
                    {item.name_category}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  formContainer: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldIcon: {
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  imageUploadContainer: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 10,
    fontSize: 14,
  },
  categoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchContainer: {
    marginLeft: 'auto',
  },
  switch: {
    width: 50,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    padding: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  promoField: {
    marginTop: 10,
  },
  promoLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '80%',
    borderRadius: 8,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  categoryItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  categoryItemText: {
    fontSize: 16,
  },
});
