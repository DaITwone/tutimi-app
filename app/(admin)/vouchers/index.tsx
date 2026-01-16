import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [forNewUser, setForNewUser] = useState(false);
  const [maxUsage, setMaxUsage] = useState("1");
  const { user, isLoggedIn, loading, refreshUser } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );


  /* ===============================
     FETCH
     =============================== */
  const fetchVouchers = async () => {
    const { data } = await supabase
      .from("vouchers")
      .select("*")
      .order("created_at", { ascending: false });

    setVouchers(data || []);
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  /* ===============================
     OPEN EDIT
     =============================== */
  const openEdit = (item: any) => {
    setEditing(item);
    setCode(item.code);
    setTitle(item.title);
    setDescription(item.description || "");
    setDiscountType(item.discount_type);
    setDiscountValue(String(item.discount_value));
    setMinOrderValue(item.min_order_value ? String(item.min_order_value) : "");
    setForNewUser(item.for_new_user);
    setMaxUsage(String(item.max_usage_per_user ?? 1));
    setIsActive(item.is_active);
  };


  /* ===============================
     UPDATE
     =============================== */
  const handleUpdate = async () => {
    if (!editing) return;

    const { error } = await supabase
      .from("vouchers")
      .update({
        title,
        description: description || null,
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_value: minOrderValue ? Number(minOrderValue) : null,
        for_new_user: forNewUser,
        max_usage_per_user: Number(maxUsage),
        is_active: isActive,
      })
      .eq("id", editing.id);

    if (error) {
      Alert.alert("Lỗi", error.message);
      return;
    }

    setEditing(null);
    fetchVouchers();
  };


  /* ===============================
     DELETE
     =============================== */
  const handleDelete = (id: string) => {
    Alert.alert("Xoá voucher?", "Không thể hoàn tác", [
      { text: "Huỷ" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          await supabase.from("vouchers").delete().eq("id", id);
          fetchVouchers();
        },
      },
    ]);
  };

  /* ===============================
     SWIPE ACTION
     =============================== */
  const renderRightActions = (id: string) => (
    <View className="h-full">
      <Pressable
        onPress={() => handleDelete(id)}
        className="bg-red-600 h-full w-20 items-center justify-center"
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <Text className="text-white text-xs mt-1">Xoá</Text>
      </Pressable>
    </View>
  );

  /* ===============================
     RENDER ITEM
     =============================== */
  const renderItem = ({ item }: any) => {
    return (
      <View className="mx-4 mb-4 rounded-2xl overflow-hidden bg-white border border-gray-100">
        <Swipeable
          renderRightActions={() => renderRightActions(item.id)}
          overshootRight={false}
        >
          <Pressable
            onPress={() => openEdit(item)}
            className="p-4"
          >
            {/* CODE BADGE */}
            <View className="absolute top-3 right-3 bg-[#1b4f94]/10 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-[#1b4f94]">
                {item.code}
              </Text>
            </View>

            {/* TITLE */}
            <Text className="font-bold text-[#1b4f94] text-lg pr-20">
              {item.title}
            </Text>

            {/* META */}
            <View className="flex-row flex-wrap items-center mt-2">
              <Text className="text-sm text-gray-600">
                Giảm{" "}
                <Text className="font-semibold text-[#1b4f94]">
                  {item.discount_value}
                  {item.discount_type === "percent" ? "%" : "đ"}
                </Text>
              </Text>

              {item.min_order_value && (
                <Text className="text-sm text-gray-400 ml-2">
                  · Đơn tối thiểu {item.min_order_value.toLocaleString()}đ
                </Text>
              )}
            </View>

            {/* STATUS */}
            <View className="mt-2">
              <Text
                className={`text-xs font-semibold ${item.is_active
                  ? "text-green-600"
                  : "text-gray-400"
                  }`}
              >
                {item.is_active ? "● Đang áp dụng" : "● Tạm tắt"}
              </Text>
            </View>
          </Pressable>
        </Swipeable>
      </View>

    );
  };


  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* ===== HEADER ===== */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-[#1C4273]">
          QUẢN LÝ VOUCHER
        </Text>

        <Pressable onPress={() => router.push("/(admin)/vouchers/create")}>
          <Ionicons name="add-circle" size={28} color="#1C4273" />
        </Pressable>
      </View>

      {/* ===== LIST ===== */}
      <FlatList
        data={vouchers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16 }}
      />

      {/* ===== EDIT MODAL ===== */}
      <Modal visible={!!editing} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setEditing(null)}
        >
          <Pressable
            onPress={() => { }}
            className="bg-white rounded-t-3xl p-5 max-h-[92%]"
          >
            {/* ===== HEADER ===== */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-[#1c4273]">
                Sửa voucher
              </Text>

              <Pressable
                onPress={() => setEditing(null)}
                className="bg-gray-200 rounded-full p-1"
              >
                <Ionicons name="close" size={22} color="#1b4f94" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ================= INFO ================= */}
              <Text className="text-base font-bold text-[#1b4f94] mb-2">
                Thông tin voucher
              </Text>

              <View className="mb-3">
                <Text className="text-xs text-gray-400 mb-1">Mã voucher</Text>
                <View className="border border-gray-200 rounded-xl p-3 bg-gray-100">
                  <Text className="font-semibold text-[#1b4f94]">
                    {code}
                  </Text>
                </View>
              </View>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Tiêu đề"
                className="border border-gray-200 rounded-xl p-3 mb-3"
              />

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Mô tả"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="border border-gray-200 rounded-xl p-3 mb-4"
              />

              {/* ================= DISCOUNT TYPE ================= */}
              <Text className="text-base font-bold text-[#1b4f94] mb-2">
                Loại giảm giá
              </Text>

              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={() => setDiscountType("percent")}
                  className={`px-4 py-2 rounded-full ${discountType === "percent"
                    ? "bg-[#1b4f94]"
                    : "bg-gray-200"
                    }`}
                >
                  <Text
                    className={`text-sm ${discountType === "percent"
                      ? "text-white font-bold"
                      : "text-gray-700"
                      }`}
                  >
                    %
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setDiscountType("fixed")}
                  className={`px-4 py-2 rounded-full ${discountType === "fixed"
                    ? "bg-[#1b4f94]"
                    : "bg-gray-200"
                    }`}
                >
                  <Text
                    className={`text-sm ${discountType === "fixed"
                      ? "text-white font-bold"
                      : "text-gray-700"
                      }`}
                  >
                    VNĐ
                  </Text>
                </Pressable>
              </View>

              {/* ================= VALUES ================= */}
              <Text className="text-base font-bold text-[#1b4f94] mb-2">
                Giá trị & điều kiện
              </Text>

              <TextInput
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
                placeholder="Giá trị giảm"
                className="border border-gray-200 rounded-xl p-3 mb-3"
              />

              <TextInput
                value={minOrderValue}
                onChangeText={setMinOrderValue}
                keyboardType="numeric"
                placeholder="Đơn tối thiểu (tuỳ chọn)"
                className="border border-gray-200 rounded-xl p-3 mb-3"
              />

              <TextInput
                value={maxUsage}
                onChangeText={setMaxUsage}
                keyboardType="numeric"
                placeholder="Số lần dùng / user"
                className="border border-gray-200 rounded-xl p-3 mb-4"
              />

              {/* ================= FLAGS ================= */}
              <Text className="text-base font-bold text-[#1b4f94] mb-2">
                Trạng thái & đối tượng
              </Text>

              <Pressable
                onPress={() => setForNewUser(!forNewUser)}
                className="mb-2"
              >
                <Text
                  className={`font-semibold ${forNewUser ? "text-green-600" : "text-gray-500"
                    }`}
                >
                  Chỉ dành cho user mới: {forNewUser ? "Có" : "Không"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsActive(!isActive)}
                className="mb-6"
              >
                <Text
                  className={`font-semibold ${isActive ? "text-green-600" : "text-gray-500"
                    }`}
                >
                  Trạng thái: {isActive ? "Đang bật" : "Tắt"}
                </Text>
              </Pressable>

              {/* ================= SAVE ================= */}
              <Pressable
                onPress={handleUpdate}
                className="bg-[#1b4f94] py-3 rounded-xl items-center mb-6"
              >
                <Text className="text-white font-bold text-base">
                  Lưu thay đổi
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}
