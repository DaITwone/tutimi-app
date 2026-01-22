import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Image,
  ScrollView,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { getPublicImageUrl } from "@/lib/storage";

/* ===============================
   CATEGORY PILL
================================ */
const CategoryPill = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`mr-3 h-10 px-5 rounded-full items-center justify-center ${active ? "bg-[#1C4273]" : "bg-gray-200"
      }`}
  >
    <Text
      className={`text-sm ${active ? "text-white font-bold" : "text-gray-700"
        }`}
    >
      {label}
    </Text>
  </Pressable>
);

export default function AdminProducts() {
  /* ===============================
     STATE
  ================================ */
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [stats, setStats] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [deleteId, setDeleteId] = useState<string | null>(null);


  /* ===============================
     FETCH DATA
  ================================ */
  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, categories(title)")
      .order("created_at", { ascending: false });

    setProducts(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");

    setCategories(data || []);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  /* ===============================
     FILTER
  ================================ */
  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter(
        (p) => p.category_id === selectedCategory
      );

  /* ===============================
     CATEGORY CHANGE (ANIMATE)
  ================================ */
  const onChangeCategory = (id: string) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedCategory(id);
  };

  /* ===============================
     EDIT MODAL LOGIC
  ================================ */
  const openEdit = (item: any) => {
    setEditing(item);
    setName(item.name);
    setStats(item.stats || "");
    setPrice(String(item.price));
    setSalePrice(item.sale_price ? String(item.sale_price) : "");
    setImage(item.image || null);
    setCategoryId(item.category_id || null);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!res.canceled) {
      setImage(res.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;

    let imagePath = editing.image;

    if (image && image.startsWith("file://")) {
      const blob = await (await fetch(image)).blob();
      const path = `${editing.id}.png`;

      await supabase.storage.from("products").upload(path, blob, {
        upsert: true,
        contentType: "image/png",
      });

      imagePath = path;
    }

    await supabase
      .from("products")
      .update({
        name,
        stats,
        price: Number(price),
        sale_price: salePrice ? Number(salePrice) : null,
        image: imagePath,
      })
      .eq("id", editing.id);

    setEditing(null);
    fetchProducts();
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    await supabase.from("products").delete().eq("id", deleteId);
    setDeleteId(null);
    fetchProducts();
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchCategories();
    }, [])
  );



  /* ===============================
     RENDER ITEM
  ================================ */
  const renderRightActions = (id: string) => (
    <Pressable
      onPress={() => handleDelete(id)}
      className="bg-red-600 w-20 h-full items-center justify-center"
    >
      <Ionicons name="trash-outline" size={24} color="white" />
      <Text className="text-white text-xs mt-1">Xoá</Text>
    </Pressable>
  );

  const renderItem = ({ item }: any) => {
    const imageUrl = getPublicImageUrl(item.image);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View className="mx-4 mb-4 rounded-2xl overflow-hidden bg-white border border-gray-100">
          <Swipeable
            renderRightActions={() => renderRightActions(item.id)}
            overshootRight={false}
          >
            <Pressable onPress={() => openEdit(item)} className="p-4 relative">
              {/* CATEGORY BADGE – TOP RIGHT */}
              {item.categories?.title && (
                <View className="absolute top-3 right-3 bg-[#1C4273]/10 px-3 py-1 rounded-full">
                  <Text className="text-[11px] text-[#1b4f94] font-semibold">
                    {item.categories.title}
                  </Text>
                </View>
              )}

              <View className="flex-row gap-4">
                {imageUrl && (
                  <Image
                    source={{ uri: imageUrl }}
                    className="w-20 h-20 rounded-xl"
                    resizeMode="cover"
                  />
                )}

                <View className="flex-1 pr-6">
                  <Text className="font-bold text-[#1b4f94] text-base">
                    {item.name}
                  </Text>

                  <Text className="text-gray-500 mt-1">
                    {item.sale_price ? (
                      <>
                        <Text className="line-through">
                          {item.price.toLocaleString()} đ
                        </Text>{" "}
                        <Text className="text-red-600 font-bold">
                          {item.sale_price.toLocaleString()} đ
                        </Text>
                      </>
                    ) : (
                      `${item.price.toLocaleString()} đ`
                    )}
                  </Text>

                  {item.stats && (
                    <Text className="text-xs text-gray-400 mt-1">
                      {item.stats}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          </Swipeable>
        </View>
      </Animated.View>

    );
  };

  /* ===============================
     UI
  ================================ */
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-[#1C4273]">
          QUẢN LÝ SẢN PHẨM
        </Text>
        <Pressable onPress={() => router.push("/(admin)/products/create")}>
          <Ionicons name="add-circle" size={28} color="#1C4273" />
        </Pressable>
      </View>

      {/* LIST */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
        ListHeaderComponent={
          <View className="bg-gray-50">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="px-4 py-3 mb-2 shadow-sm"
            >
              <CategoryPill
                label="Tất cả"
                active={selectedCategory === "all"}
                onPress={() => onChangeCategory("all")}
              />

              {categories.map((cat) => (
                <CategoryPill
                  key={cat.id}
                  label={cat.title}
                  active={selectedCategory === cat.id}
                  onPress={() => onChangeCategory(cat.id)}
                />
              ))}
            </ScrollView>
          </View>
        }
      />


      {/* ===== EDIT MODAL ===== */}
      <Modal visible={!!editing} transparent animationType="slide">
        {/* BACKDROP */}
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => {
            Keyboard.dismiss();
            setEditing(null);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* CONTENT */}
            <Pressable
              onPress={() => Keyboard.dismiss()}
              className="bg-white rounded-t-3xl p-5"
            >
              {/* HEADER */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-[#1b4f94]">
                  Sửa sản phẩm
                </Text>

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setEditing(null);
                  }}
                  className="bg-gray-200 rounded-full p-1"
                >
                  <Ionicons name="close" size={22} color="#1b4f94" />
                </Pressable>
              </View>

              {/* IMAGE */}
              <View className="mb-4">
                <View className="h-40 rounded-2xl bg-gray-100 overflow-hidden items-center justify-center">
                  {image ? (
                    <Image
                      source={{
                        uri: image.startsWith("file://")
                          ? image
                          : getPublicImageUrl(image) || image,
                      }}
                      className="w-full h-full"
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="image-outline" size={36} color="#9ca3af" />
                  )}
                </View>

                <View className="flex-row gap-3 mt-3">
                  <Pressable
                    onPress={pickImage}
                    className="flex-1 border border-gray-200 rounded-xl py-2 items-center"
                  >
                    <Text className="text-sm text-[#082841]">
                      Chọn ảnh
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setImage(null)}
                    className="flex-1 border border-gray-200 rounded-xl py-2 items-center"
                  >
                    <Text className="text-sm text-[#082841]">
                      Dán link ảnh
                    </Text>
                  </Pressable>
                </View>
              </View>

              {image === "" && (
                <TextInput
                  placeholder="Dán link ảnh (https://...)"
                  className="border border-gray-200 rounded-xl p-3 mb-3"
                  value={image || ""}
                  onChangeText={setImage}
                />
              )}

              {/* FORM */}
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Tên sản phẩm"
                className="border border-gray-200 rounded-xl p-3 mb-3"
              />

              <TextInput
                value={stats}
                onChangeText={setStats}
                placeholder="Mô tả / stats"
                className="border border-gray-200 rounded-xl p-3 mb-3"
              />

              <View className="flex-row gap-3 mb-3">
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="Giá"
                  className="border border-gray-200 rounded-xl p-3 flex-1"
                />
                <TextInput
                  value={salePrice}
                  onChangeText={setSalePrice}
                  keyboardType="numeric"
                  placeholder="Giá sale"
                  className="border border-gray-200 rounded-xl p-3 flex-1"
                />
              </View>

              {/* CATEGORY */}
              <View>
                <Text className="text-base font-bold text-[#1b4f94] mb-2">
                  Danh mục
                </Text>
                <View className="border border-gray-200 rounded-xl overflow-hidden">
                  {categories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      className={`p-3 ${categoryId === cat.id ? "bg-[#1C4273]/10" : ""
                        }`}
                    >
                      <Text
                        className={`${categoryId === cat.id
                          ? "text-[#1C4273] font-bold"
                          : "text-gray-700"
                          }`}
                      >
                        {cat.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* SAVE */}
              <View className="mt-6">
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    handleUpdate();
                  }}
                  className="bg-[#1b4f94] py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-bold text-base">
                    Lưu thay đổi
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      <Modal visible={!!deleteId} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setDeleteId(null)}
        >
          <Pressable
            onPress={() => { }}
            className="bg-white rounded-t-3xl p-6"
          >
            {/* ICON */}
            <View className="items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center">
                <Ionicons name="trash-outline" size={28} color="#dc2626" />
              </View>
            </View>

            {/* TITLE */}
            <Text className="text-xl font-bold text-center text-gray-900 mb-2">
              Xoá sản phẩm?
            </Text>

            {/* DESC */}
            <Text className="text-center text-gray-500 mb-6">
              Hành động này không thể hoàn tác. Dữ liệu sẽ bị xoá vĩnh viễn.
            </Text>

            {/* ACTIONS */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 items-center"
              >
                <Text className="text-gray-700 font-semibold">
                  Huỷ
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 items-center"
              >
                <Text className="text-white font-bold">
                  Xoá
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}
