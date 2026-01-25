import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useEffect, useRef, useState } from "react";
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
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});
  const [openedId, setOpenedId] = useState<string | null>(null);

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


  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );

  const toggleVoucherActive = async (item: any) => {
    const isActive = item.is_active !== false;

    const { error } = await supabase
      .from("vouchers")
      .update({ is_active: !isActive })
      .eq("id", item.id);

    if (error) {
      console.log("toggleVoucherActive error:", error);
      return;
    }

    fetchVouchers();
  };


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

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      fetchVouchers();
    }, [])
  );


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
  const renderRightActions = (item: any) => {
    const isActive = item.is_active !== false;

    return (
      <Pressable
        onPress={() => {
          swipeRefs.current[item.id]?.close();

          openConfirm({
            title: isActive ? "Tắt voucher này?" : "Bật voucher này?",
            desc: isActive
              ? "Voucher sẽ không còn áp dụng cho người dùng."
              : "Voucher sẽ được áp dụng lại cho người dùng.",
            confirmText: isActive ? "Tắt" : "Bật",
            variant: isActive ? "danger" : "primary",
            onConfirm: () => toggleVoucherActive(item),
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
          name={isActive ? "power-outline" : "refresh-outline"}
          size={22}
          color="#fff"
        />
        <Text className="text-white text-xs mt-1 font-semibold">
          {isActive ? "OFF" : "ON"}
        </Text>
      </Pressable>
    );
  };


  /* ===============================
     RENDER ITEM
     =============================== */
  const renderItem = ({ item }: any) => {
    return (
      <View className="mx-4 mb-4 rounded-2xl overflow-hidden bg-white border border-gray-100">
        <Swipeable
          ref={(ref) => {
            swipeRefs.current[item.id] = ref;
          }}
          friction={2}
          rightThreshold={40}
          overshootRight={false}
          enableTrackpadTwoFingerGesture
          onSwipeableOpen={() => {
            if (openedId && openedId !== item.id) {
              swipeRefs.current[openedId]?.close();
            }
            setOpenedId(item.id);
          }}
          onSwipeableClose={() => {
            if (openedId === item.id) setOpenedId(null);
          }}
          renderRightActions={() => renderRightActions(item)}
        >
          <Pressable onPress={() => openEdit(item)} className="p-4 bg-white">
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
              <View className="flex-row items-center gap-2 mt-1">
                <View
                  className={`w-3.5 h-3.5 rounded-full border-2 border-white ${item.is_active !== false ? "bg-green-600" : "bg-red-600"
                    }`}
                />

                <Text
                  className={`text-xs font-semibold ${item.is_active !== false ? "text-green-600" : "text-red-400"
                    }`}
                >
                  {item.is_active !== false ? "Đang áp dụng" : "Tạm tắt"}
                </Text>
              </View>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          style={{ flex: 1 }}
        >
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
                  className="mb-4"
                >
                  <Text
                    className={`font-semibold ${forNewUser ? "text-green-600" : "text-gray-500"
                      }`}
                  >
                    Chỉ dành cho user mới: {forNewUser ? "Có" : "Không"}
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
        </KeyboardAvoidingView>
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
