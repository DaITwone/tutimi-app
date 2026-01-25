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
    className={`mr-3 h-9 px-5 rounded-full items-center justify-center ${active ? "bg-[#1C4273]" : "bg-gray-200"
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
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  type ConfirmState = {
    visible: boolean;
    title: string;
    desc?: string;
    confirmText?: string;
    variant?: "danger" | "primary";
    onConfirm?: () => void;
  };

  const [confirm, setConfirm] = useState<ConfirmState>({
    visible: false,
    title: "",
  });

  const openConfirm = (payload: Omit<ConfirmState, "visible">) => {
    setConfirm({ visible: true, ...payload });
  };

  const closeConfirm = () => {
    setConfirm({ visible: false, title: "" });
  };

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
        category_id: categoryId,
      })
      .eq("id", editing.id);

    setEditing(null);
    fetchProducts();
  };

  const toggleProductActive = async (item: any) => {
    const isActive = item.is_active !== false;

    const { error } = await supabase
      .from("products")
      .update({ is_active: !isActive })
      .eq("id", item.id);

    if (error) return;

    // ✅ update state tại chỗ -> item KHÔNG bị đổi vị trí
    setProducts((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, is_active: !isActive } : p
      )
    );
  };


  const setAllProductsActive = async (value: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: value })
      .not("id", "is", null); // ✅ update tất cả rows

    if (error) {
      console.log("setAllProductsActive error:", error);
      return;
    }

    setProducts((prev) => prev.map((p) => ({ ...p, is_active: value })));
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
  const renderRightActions = (item: any) => {
    const isActive = item.is_active !== false;

    return (
      <View className="h-full">
        <Pressable
          onPress={() => {
            // đóng swipe trước
            swipeRefs.current[item.id]?.close();

            openConfirm({
              title: isActive ? "Tắt món này?" : "Bật món này?",
              desc: isActive
                ? "Món sẽ không hiển thị ở phía user."
                : "Món sẽ hiển thị lại ở phía user.",
              confirmText: isActive ? "Tắt món" : "Bật món",
              variant: isActive ? "danger" : "primary",
              onConfirm: () => toggleProductActive(item),
            });
          }}
          className={`h-full w-16 items-center justify-center ${isActive ? "bg-red-600" : "bg-green-600"
            }`}
          style={{
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
          }}
        >
          <Ionicons
            name={isActive ? "power" : "refresh"}
            size={22}
            color="#fff"
          />
          <Text className="text-white text-xs mt-1 font-semibold">
            {isActive ? "OFF" : "ON"}
          </Text>
        </Pressable>
      </View>
    );
  };



  const renderItem = ({ item }: any) => {
    const imageUrl = getPublicImageUrl(item.image);
    const isActive = item.is_active !== false;

    return (
      <View className="mx-4 mb-4 rounded-2xl overflow-hidden bg-white border border-gray-100">
        <Swipeable
          ref={(ref) => {
            swipeRefs.current[item.id] = ref;
          }}
          renderRightActions={() => renderRightActions(item)}
          overshootRight={false}
        >
          <Pressable onPress={() => openEdit(item)} className="p-4 bg-white">
            {/* DOT trạng thái - không bị opacity */}
            {!isActive && (
              <View className="absolute top-3 left-3 z-50">
                <View className="w-4 h-4 rounded-full bg-red-600 border-2 border-white" />
              </View>
            )}

            {/* CATEGORY BADGE – TOP RIGHT */}
            {item.categories?.title && (
              <View className="absolute top-3 right-3 bg-[#1C4273]/10 px-3 py-1 rounded-full z-50">
                <Text className="text-[11px] text-[#1b4f94] font-semibold">
                  {item.categories.title}
                </Text>
              </View>
            )}

            {/* content opacity */}
            <View className={`${!isActive ? "opacity-60" : "opacity-100"}`}>
              <View className="flex-row gap-4">
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    className="w-20 h-20 rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-20 h-20 rounded-xl bg-gray-100 items-center justify-center">
                    <Ionicons name="image-outline" size={24} color="#9ca3af" />
                  </View>
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
                    <Text className="text-xs text-gray-400 mt-1">{item.stats}</Text>
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        </Swipeable>
      </View>
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
        <View className="flex-row items-center gap-2">
          {/* ON ALL */}
          <Pressable
            onPress={() =>
              openConfirm({
                title: "Bật tất cả món?",
                desc: "Tất cả sản phẩm sẽ được bật và hiển thị bên user.",
                confirmText: "Bật tất cả",
                variant: "primary",
                onConfirm: () => setAllProductsActive(true),
              })
            }
            className="w-8 h-8 rounded-full bg-green-600 items-center justify-center"
          >
            <Ionicons name="power" size={18} color="#fff" />
          </Pressable>

          {/* OFF ALL */}
          <Pressable
            onPress={() =>
              openConfirm({
                title: "Tắt tất cả món?",
                desc: "Tất cả sản phẩm sẽ bị tắt và ẩn khỏi user.",
                confirmText: "Tắt tất cả",
                variant: "danger",
                onConfirm: () => setAllProductsActive(false),
              })
            }
            className="w-8 h-8 rounded-full bg-red-600 items-center justify-center"
          >
            <Ionicons name="power" size={18} color="#fff" />
          </Pressable>
        </View>
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
      {/* ===== CONFIRM MODAL ===== */}
      <Modal visible={confirm.visible} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={closeConfirm}>
          <Pressable onPress={() => { }} className="bg-white rounded-t-3xl p-6">
            {/* ICON */}
            <View className="items-center mb-4">
              <View
                className={`w-14 h-14 rounded-full items-center justify-center ${confirm.variant === "danger" ? "bg-red-100" : "bg-[#1C4273]/10"
                  }`}
              >
                <Ionicons
                  name={
                    confirm.variant === "danger"
                      ? "warning-outline"
                      : "help-circle-outline"
                  }
                  size={28}
                  color={confirm.variant === "danger" ? "#dc2626" : "#1C4273"}
                />
              </View>
            </View>

            {/* TITLE */}
            <Text className="text-xl font-bold text-center text-gray-900 mb-2">
              {confirm.title}
            </Text>

            {/* DESC */}
            {!!confirm.desc && (
              <Text className="text-center text-gray-500 mb-6">{confirm.desc}</Text>
            )}

            {/* ACTIONS */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={closeConfirm}
                className="flex-1 py-3 rounded-xl border border-gray-200 items-center"
              >
                <Text className="text-gray-700 font-semibold">Huỷ</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  closeConfirm();
                  confirm.onConfirm?.();
                  // ✅ đóng tất cả swipe đang mở (trường hợp user swipe nhiều item)
                  Object.values(swipeRefs.current).forEach((ref) => ref?.close());
                }}
                className={`flex-1 py-3 rounded-xl items-center ${confirm.variant === "danger" ? "bg-red-600" : "bg-[#1C4273]"
                  }`}
              >
                <Text className="text-white font-bold">
                  {confirm.confirmText || "Xác nhận"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
