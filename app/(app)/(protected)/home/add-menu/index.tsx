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
  Platform,
  Dimensions,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { z } from "zod";
import * as ImagePicker from 'expo-image-picker';
import CategoryModal from "./_component/category-modal";
import { formatCurrency, parseCurrency } from "@/utils/format";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    initializeCategories();
    checkIfTablet();
    
    // Add listener for orientation changes
    const subscription = Dimensions.addEventListener('change', () => {
      checkIfTablet();
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  const checkIfTablet = () => {
    const { width, height } = Dimensions.get('window');
    const screenWidth = Math.min(width, height); 
    setIsTablet(screenWidth >= 768);
  };

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
      // Ambil data gambar
      const response = await fetch(uri);
      const arraybuffer = await response.arrayBuffer();
      
      // Validasi ukuran file (5MB)
      if (arraybuffer.byteLength > 5 * 1024 * 1024) {
        throw new Error('Ukuran file terlalu besar. Maksimal 5MB');
      }
  
      // Validasi tipe file
      const fileType = uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      if (!['jpeg', 'png', 'jpg'].includes(fileType)) {
        throw new Error('Tipe file tidak didukung. Gunakan JPEG, PNG, atau JPG');
      }
  
      const fileName = `menu-${Date.now()}.${fileType}`;
      
      // Unggah ke bucket 'file'
      const { data, error } = await supabase.storage
        .from('file')
        .upload(fileName, arraybuffer, {
          contentType: `image/${fileType}`,
          cacheControl: '3600',
          upsert: false
        });
  
      if (error) {
        throw new Error('Gagal mengupload gambar: ' + error.message);
      }
  
      // Ambil URL publik
      const { data: { publicUrl } } = supabase.storage
        .from('file')
        .getPublicUrl(fileName);
  
      return publicUrl;
    } catch (error: any) {
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

      const { error } = await supabase.from("menu").insert({
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
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error menyimpan menu:", error);
        throw error;
      }

      Alert.alert("Sukses", "Menu berhasil ditambahkan");
      router.back();
    } catch (error: any) {
      console.error("Error detail:", error);
      Alert.alert("Error", "Gagal menambahkan menu: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (
    field: keyof MenuFormData,
    value: string | number | boolean
  ) => {
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
      alignItems: isTablet ? 'center' : 'stretch',
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      width: isTablet ? wp('70%') : wp('100%') - 40,
      alignSelf: isTablet ? 'center' : 'flex-start',
    },
    backButton: {
      marginRight: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
    },
    formContainer: {
      width: isTablet ? wp('70%') : wp('100%') - 40,
      alignSelf: 'center',
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
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderColor: colors.border,
    },
    textArea: {
      height: 100,
      textAlignVertical: "top",
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
      backgroundColor: colors.primary,
    },
    saveButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    imageUploadContainer: {
      width: "100%",
      height: isTablet ? hp('30%') : 200,
      marginBottom: 20,
      borderRadius: 8,
      overflow: "hidden",
    },
    imagePreview: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    imagePlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: "#f0f0f0",
      justifyContent: "center",
      alignItems: "center",
    },
    imagePlaceholderText: {
      marginTop: 10,
      fontSize: 14,
      color: colors.textSecondary,
    },
    categoryButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    switchContainer: {
      marginLeft: "auto",
    },
    switch: {
      width: 50,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      padding: 2,
      backgroundColor: colors.border,
    },
    switchActive: {
      backgroundColor: colors.primary,
    },
    switchThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#fff",
      marginLeft: form.promo ? 24 : 0, // Animate the thumb position
    },
    promoField: {
      marginTop: 10,
    },
    promoLabel: {
      fontSize: 14,
      marginBottom: 5,
      color: colors.text,
    },
    categoryText: {
      color: colors.text,
    },
    categoryPlaceholder: {
      color: colors.textSecondary,
    },
    chevronIcon: {
      color: colors.textSecondary,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Tambah Menu</Text>
        </View>

        <View style={styles.formContainer}>
          <TouchableOpacity
            style={styles.imageUploadContainer}
            onPress={pickImage}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="image" size={40} color={colors.primary} />
                <Text style={styles.imagePlaceholderText}>
                  Tap untuk memilih gambar
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.fieldContainer}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.fieldIcon}>
                <Feather name="tag" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Nama Menu</Text>
            </View>
            <TextInput
              style={[styles.input, formErrors.name_menu && styles.inputError]}
              value={form.name_menu}
              onChangeText={(value) => handleInputChange("name_menu", value)}
              placeholder="Masukkan nama menu"
              placeholderTextColor={colors.textSecondary}
            />
            {formErrors.name_menu && (
              <Text style={styles.errorText}>{formErrors.name_menu}</Text>
            )}
          </View>

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
                formErrors.description && styles.inputError,
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

          <View style={styles.fieldContainer}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.fieldIcon}>
                <Feather name="dollar-sign" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Harga</Text>
            </View>
            <TextInput
              style={[styles.input, formErrors.price && styles.inputError]}
              value={formatCurrency(form.price)}
              onChangeText={(value) =>
                handleInputChange("price", parseCurrency(value))
              }
              placeholder="Masukkan harga"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
            {formErrors.price && (
              <Text style={styles.errorText}>{formErrors.price}</Text>
            )}
          </View>

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
                formErrors.category_id && styles.inputError,
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text
                style={
                  selectedCategory
                    ? styles.categoryText
                    : styles.categoryPlaceholder
                }
              >
                {selectedCategory
                  ? selectedCategory.name_category
                  : "Pilih kategori"}
              </Text>
              <Feather
                name="chevron-down"
                size={20}
                style={styles.chevronIcon}
              />
            </TouchableOpacity>
            {formErrors.category_id && (
              <Text style={styles.errorText}>{formErrors.category_id}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <View style={styles.fieldIcon}>
                <Feather name="percent" size={18} color={colors.primary} />
              </View>
              <Text style={styles.label}>Promo</Text>
              <TouchableOpacity
                style={styles.switchContainer}
                onPress={() => handleInputChange("promo", !form.promo)}
              >
                <View
                  style={[styles.switch, form.promo && styles.switchActive]}
                >
                  <View style={[styles.switchThumb]} />
                </View>
              </TouchableOpacity>
            </View>

            {form.promo && (
              <>
                <View style={styles.promoField}>
                  <Text style={styles.promoLabel}>Harga Promo</Text>
                  <TextInput
                    style={styles.input}
                    value={
                      form.promo_price !== undefined
                        ? formatCurrency(form.promo_price)
                        : ""
                    } 
                    onChangeText={(value) =>
                      handleInputChange("promo_price", parseCurrency(value))
                    }
                    placeholder="Masukkan harga promo"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.promoField}>
                  <Text style={styles.promoLabel}>Mulai Promo</Text>
                  <TextInput
                    style={styles.input}
                    value={form.promo_start}
                    onChangeText={(value) =>
                      handleInputChange("promo_start", value)
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.promoField}>
                  <Text style={styles.promoLabel}>Akhir Promo</Text>
                  <TextInput
                    style={styles.input}
                    value={form.promo_end}
                    onChangeText={(value) =>
                      handleInputChange("promo_end", value)
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.saveButton}
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

      <CategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelect={selectCategory}
        categories={categories}
        colors={{
          text: colors.text,
          card: colors.card,
          border: colors.border,
        }}
      />
    </SafeAreaView>
  );
}