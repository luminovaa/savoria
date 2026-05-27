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
  Image,
  Platform,
  Dimensions,
  PermissionsAndroid,
} from "react-native";
import ImageResizer from 'react-native-image-resizer';
import { api } from "@/utils/api";
import { request } from "@/services/api-client";
import { useTheme } from "@/hooks/use-theme";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { capitalizeText, formatCurrency, parseCurrency } from "@/utils/format";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import CategoryModal from "../add-menu/_component/category-modal";
import { Asset, ImageLibraryOptions, launchImageLibrary } from "react-native-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

const menuFormSchema = z.object({
  name_menu: z.string().min(1, "Nama menu wajib diisi"),
  description: z.string().nullable().optional().transform((value) => value ?? ""),
  price: z.number().positive("Harga harus lebih dari 0"),
  category_id: z.number().positive("Kategori wajib dipilih"),
  stock: z.number().default(0),
  promo: z.boolean().default(false),
  promo_price: z.number().optional(),
  promo_start: z.string().optional(),
  promo_end: z.string().optional(),
});

type MenuFormData = z.infer<typeof menuFormSchema>;

function appendMenuFormValue(body: FormData, key: string, value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return;
  body.append(key, String(value));
}

interface Category {
  id: number;
  name_category: string;
}


export default function EditMenuScreen() {
  const queryClient = useQueryClient();
  const { colors, theme } = useTheme();
  const router = useRouter();
  const { menuId } = useLocalSearchParams(); // Get menuId from route params
  const [form, setForm] = useState<MenuFormData>({
    name_menu: "",
    description: "",
    price: 0,
    category_id: 0,
    stock: 0,
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
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [isTablet, setIsTablet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState({
    start: false,
    end: false,
  });
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    if (!menuId || isNaN(Number(menuId))) {
      Alert.alert("Error", "ID menu tidak valid");
      console.log(menuId);
      router.back();
      return;
    }
    checkIfTablet();
    requestStoragePermission();
    fetchData();

    const subscription = Dimensions.addEventListener("change", () => {
      checkIfTablet();
    });

    return () => {
      subscription.remove();
    };
  }, [menuId]);

  const checkIfTablet = () => {
    const { width, height } = Dimensions.get("window");
    const screenWidth = Math.min(width, height);
    setIsTablet(screenWidth >= 768);
  };
  async function fetchData() {
    try {
      setLoading(true);

      const { data: categories, error: catError } = await api
        .from("category")
        .select("id, name_category")
        .order("name_category");

      if (catError) throw catError;
      setCategories(categories || []);

      // Kemudian ambil data menu
      const { data: menu, error: menuError } = await api
        .from("menu")
        .select("*")
        .eq("id", Number(menuId))
        .single();

      if (menuError) throw menuError;

      if (menu) {
        setForm({
          name_menu: menu.name_menu,
          description: menu.description ?? "",
          price: menu.price,
          category_id: menu.category_id,
          stock: menu.stock || 0,
          promo: menu.promo,
          promo_price: menu.promo_price || 0,
          promo_start: menu.promo_start || "",
          promo_end: menu.promo_end || "",
        });
        setImage(menu.images);

        const selected = categories?.find((cat: Category) => cat.id === menu.category_id);
        setSelectedCategory(selected || null);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  const requestStoragePermission = async () => {
      try {
        // Untuk Android 13 (API level 33) dan di atasnya
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          ]);
          
          return (
            granted['android.permission.READ_MEDIA_IMAGES'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.READ_MEDIA_VIDEO'] === PermissionsAndroid.RESULTS.GRANTED
          );
        }
        else if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: "Izin Akses Penyimpanan",
              message: "Aplikasi membutuhkan akses ke penyimpanan untuk memilih gambar",
              buttonNeutral: "Tanya Nanti",
              buttonNegative: "Batal",
              buttonPositive: "OK"
            }
          );
          
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        // Untuk iOS, izin sudah ditangani oleh ImagePicker
        return true;
      } catch (err) {
        console.warn(err);
        return false;
      }
    };

    const compressImage = async (uri: string): Promise<string> => {
  try {
    const compressedImage = await ImageResizer.createResizedImage(
      uri,
      1024, // Lebar maksimum
      1024, // Tinggi maksimum
      'JPEG', // Format output (JPEG atau PNG)
      50, // Kualitas (0-100)
      0, // Rotasi (0 untuk tidak memutar)
      undefined, // Path output (biarkan undefined untuk temporary file)
      true // keep metadata
    );
    return compressedImage.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Gagal mengompresi gambar');
  }
};
const pickImage = () => {
  const options: ImageLibraryOptions = {
    mediaType: 'photo',
    quality: 1, // Kualitas awal tinggi, karena akan dikompresi setelahnya
    selectionLimit: 1,
  };

  launchImageLibrary(options, async (response) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
    } else if (response.errorCode) {
      console.log('ImagePicker Error: ', response.errorMessage);
      Alert.alert('Error', response.errorMessage || 'Gagal memilih gambar');
    } else if (response.assets && response.assets.length > 0) {
      const selectedImage: Asset = response.assets[0];
      if (selectedImage.uri) {
        try {
          const compressedUri = await compressImage(selectedImage.uri);
          setImage(compressedUri);
        } catch (error: any) {
          Alert.alert('Error', error.message);
        }
      }
    }
  });
};

  const uploadImage = async (uri: string) => {
    try {
      const fileType = uri.split(".").pop()?.toLowerCase() ?? "jpeg";
      if (!["jpeg", "png", "jpg"].includes(fileType)) {
        throw new Error(
          "Tipe file tidak didukung. Gunakan JPEG, PNG, atau JPG"
        );
      }
  
      const fileName = `menu-${Date.now()}.${fileType}`;
      const mimeType = fileType === "jpg" ? "image/jpeg" : `image/${fileType}`;
  
      const { data, error } = await api.storage
        .from("file")
        .upload(fileName, {
          uri,
          name: fileName,
          type: mimeType,
        }, {
          contentType: mimeType,
          cacheControl: "3600",
          upsert: false,
        });
  
      if (error) {
        throw new Error("Gagal mengupload gambar: " + error.message);
      }
  
      const {
        data: { publicUrl },
      } = api.storage.from("file").getPublicUrl(fileName);
  
      return publicUrl;
    } catch (error: any) {
      throw new Error("Gagal mengupload gambar: " + error.message);
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

  async function handleUpdateMenu() {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);
      const body = new FormData();
      appendMenuFormValue(body, "name_menu", form.name_menu.trim());
      appendMenuFormValue(body, "description", form.description?.trim());
      appendMenuFormValue(body, "price", form.price);
      appendMenuFormValue(body, "category_id", form.category_id);
      appendMenuFormValue(body, "stock", form.stock);
      appendMenuFormValue(body, "promo", form.promo);
      appendMenuFormValue(body, "promo_price", form.promo ? form.promo_price : null);
      appendMenuFormValue(body, "promo_start", form.promo ? form.promo_start : null);
      appendMenuFormValue(body, "promo_end", form.promo ? form.promo_end : null);
      if (image && !image.startsWith("http")) {
        const extension = image.split(".").pop()?.toLowerCase() || "jpg";
        const type = extension === "png" ? "image/png" : "image/jpeg";
        body.append("image", {
          uri: image,
          name: `menu-${Date.now()}.${extension}`,
          type,
        } as any);
      }

      await request(`/v1/menus/${Number(menuId)}`, { method: "PATCH", body });
      await queryClient.invalidateQueries({ queryKey: ["menus"] });

      Alert.alert("Sukses", "Menu berhasil diperbarui");
      router.back();
    } catch (error: any) {
      console.error("Error detail:", error);
      Alert.alert("Error", "Gagal memperbarui menu: " + error.message);
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

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateForStorage = (date: Date): string => {
    return date.toISOString().split("T")[0]; // Format to YYYY-MM-DD
  };

  const parseDateFromDisplay = (displayDate: string): string => {
    if (!displayDate) return "";
    const [day, month, year] = displayDate.split("-");
    return `${year}-${month}-${day}`; // Convert DD-MM-YYYY to YYYY-MM-DD
  };

  const handleDateChange = (
    event: any,
    selectedDate: Date | undefined,
    field: "promo_start" | "promo_end"
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker({
        ...showDatePicker,
        [field === "promo_start" ? "start" : "end"]: false,
      });
    }
    if (selectedDate) {
      handleInputChange(field, formatDateForStorage(selectedDate));
      setTempDate(selectedDate);
    }
  };

  const showDatePickerModal = (field: "promo_start" | "promo_end") => {
    setShowDatePicker({
      ...showDatePicker,
      [field === "promo_start" ? "start" : "end"]: true,
    });
    setTempDate(
      form[field]
        ? new Date(parseDateFromDisplay(formatDateForDisplay(form[field])))
        : new Date()
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
      alignItems: isTablet ? "center" : "stretch",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      width: isTablet ? wp("70%") : wp("100%") - 40,
      alignSelf: isTablet ? "center" : "flex-start",
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
      width: isTablet ? wp("70%") : wp("100%") - 40,
      alignSelf: "center",
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
    dateInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
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
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: "600",
    },
    imageUploadContainer: {
      width: 300,
      height: 300,
      marginBottom: 20,
      borderRadius: 8,
      overflow: "hidden",
      alignSelf: "center",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    imagePreview: {
      width: 400,
      height: 400,
      resizeMode: "contain",
      alignSelf: "center",
    },
    imagePlaceholder: {
      width: 400,
      height: 400,
      backgroundColor: "#f0f0f0",
      justifyContent: "center",
      alignItems: "center",
    },
    imagePlaceholderText: {
      marginTop: 10,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
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
      marginLeft: form.promo ? 24 : 0,
    },
    promoField: {
      marginTop: 10,
    },
    promoLabel: {
      fontSize: 15,
      fontWeight: "600",
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 10 }}>
            Memuat data menu...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Edit Menu</Text>
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
              <Text style={styles.label}>Deskripsi (disarankan)</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                formErrors.description && styles.inputError,
              ]}
              value={form.description}
              onChangeText={(value) => handleInputChange("description", value)}
              placeholder="Masukkan deskripsi menu agar lebih jelas"
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
                {capitalizeText(
                  selectedCategory
                    ? selectedCategory.name_category
                    : "Pilih kategori"
                )}
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
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => showDatePickerModal("promo_start")}
                  >
                    <Text
                      style={{
                        color: form.promo_start
                          ? colors.text
                          : colors.textSecondary,
                      }}
                    >
                      {form.promo_start
                        ? formatDateForDisplay(form.promo_start)
                        : "Pilih tanggal mulai"}
                    </Text>
                    <Feather
                      name="calendar"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {showDatePicker.start && (
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(event, date) =>
                        handleDateChange(event, date, "promo_start")
                      }
                    />
                  )}
                </View>

                <View style={styles.promoField}>
                  <Text style={styles.promoLabel}>Akhir Promo</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => showDatePickerModal("promo_end")}
                  >
                    <Text
                      style={{
                        color: form.promo_end
                          ? colors.text
                          : colors.textSecondary,
                      }}
                    >
                      {form.promo_end
                        ? formatDateForDisplay(form.promo_end)
                        : "Pilih tanggal akhir"}
                    </Text>
                    <Feather
                      name="calendar"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {showDatePicker.end && (
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(event, date) =>
                        handleDateChange(event, date, "promo_end")
                      }
                    />
                  )}
                </View>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleUpdateMenu}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
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
