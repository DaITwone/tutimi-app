// app/order/[id].tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  ImageBackground,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabaseClient";
import { getPublicImageUrl } from "@/lib/storage";
import { useThemeBackground } from "@/hooks/useThemeBackground";
import { KeyboardAvoidingView } from "react-native";
import { TextInput } from "react-native-gesture-handler";

/* ================= TYPES ================= */

type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

type Order = {
  id: string;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  discount_amount: number;
  payment_method: string;
  receiver_name: string;
  receiver_phone: string;
  shipping_address: string;
  cancel_reason: string | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  product_image: string | null;
  size: string | null;
  quantity: number;
  base_price: number;
  topping_total: number;
  total_price: number;
  toppings: any;
  note: string | null;
  sugar_level: string | null;
  ice_level: string | null;
};

/* ================= SCREEN ================= */

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { bgUrl } = useThemeBackground();

  /* ================= LOAD ORDER ================= */

  const loadOrder = async () => {
    if (!id) return;

    setLoading(true);

    const [{ data: orderData }, { data: itemsData }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).single<Order>(),
      supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id)
        .returns<OrderItem[]>(),
    ]);

    setOrder(orderData);
    setItems(itemsData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  // Realtime
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        () => {
          loadOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  /* ================= CANCEL ORDER ================= */

  const openCancelModal = () => {
    setSelectedReason(null);
    setCustomReason("");
    setCancelModalVisible(true);
  };

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    setSelectedReason(null);
    setCustomReason("");
  };

  const confirmCancelOrder = async () => {
    if (!order) return;
    if (!selectedReason) return;

    const reason =
      selectedReason === "Khác" ? customReason.trim() : selectedReason;

    if (!reason) return;

    try {
      setCancelLoading(true);

      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancel_reason: reason,
        })
        .eq("id", order.id);

      if (error) throw error;

      closeCancelModal();
      loadOrder();
    } catch (err: any) {
      console.error("Cancel order error:", err?.message || err);
    } finally {
      setCancelLoading(false);
    }
  };

  /* ================= UI HELPERS ================= */

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "confirmed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return "Chờ xác nhận";
      case "confirmed":
        return "Đang giao";
      case "completed":
        return "Đã giao";
      case "cancelled":
        return "Đã hủy";
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "cod":
        return "Thanh toán khi nhận hàng";
      case "momo":
        return "Ví MoMo";
      case "bank":
        return "Chuyển khoản ngân hàng";
      default:
        return method;
    }
  };

  type StepKey = "pending" | "confirmed" | "completed";

  const ORDER_STEPS: {
    key: StepKey;
    label: string;
    icon: any;
  }[] = [
      {
        key: "pending",
        label: "Đã đặt",
        icon: "check-decagram-outline",
      },
      {
        key: "confirmed",
        label: "Đang giao",
        icon: "truck-delivery-outline",
      },
      {
        key: "completed",
        label: "Hoàn tất",
        icon: "package-variant-closed",
      },
    ];

  const getStepIndexByStatus = (status: OrderStatus): number => {
    if (status === "cancelled") return -1;
    return ORDER_STEPS.findIndex((s) => s.key === status);
  };

  /* ================= CANCEL MODAL ================= */

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const CANCEL_REASONS = [
    "Đặt nhầm sản phẩm",
    "Muốn đổi địa chỉ nhận hàng",
    "Muốn đổi món / số lượng",
    "Thời gian giao quá lâu",
    "Không còn nhu cầu",
    "Khác",
  ];

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <ImageBackground
        source={bgUrl ? { uri: bgUrl } : undefined}
        className="flex-1"
        resizeMode="cover"
      >
        <SafeAreaView className="flex-1 items-center justify-center bg-white/80">
          <ActivityIndicator size="large" color="#1F4171" />
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (!order) {
    return (
      <ImageBackground
        source={bgUrl ? { uri: bgUrl } : undefined}
        className="flex-1"
        resizeMode="cover"
      >
        <SafeAreaView className="flex-1 items-center justify-center bg-white/80">
          <Text className="text-gray-500">Không tìm thấy đơn hàng</Text>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={bgUrl ? { uri: bgUrl } : undefined}
      className="flex-1"
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1 bg-gray-100/80">
        {/* HEADER */}
        <View className="px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Pressable onPress={() => router.back()} className="mr-3">
                <Ionicons name="arrow-back" size={24} color="#1F4171" />
              </Pressable>
              <Text className="text-xl font-bold text-[#1F4171]">
                Chi tiết đơn hàng
              </Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* STATUS STEPPER */}
          <View className="bg-white p-4 rounded-2xl mb-4 border border-gray-200">
            {/* Title + Time */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-bold text-[#1b4f94]">
                  {getStatusText(order.status)}
                </Text>
                <Text className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString("vi-VN")}
                </Text>
              </View>

              {/* Icon right */}
              {order.status === "confirmed" && (
                <Ionicons name="car" size={30} color="#2563eb" />
              )}
              {order.status === "completed" && (
                <Ionicons name="checkmark-circle" size={30} color="#16a34a" />
              )}
              {order.status === "pending" && (
                <Ionicons name="time-outline" size={30} color="#f59e0b" />
              )}
            </View>

            {/* Cancel badge */}
            {order.status === "cancelled" ? (
              <View className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-3">
                <View className="flex-row items-center">
                  <Ionicons name="close-circle" size={18} color="#dc2626" />
                  <Text className="ml-2 font-semibold text-red-700">Lý do hủy đơn</Text>
                </View>
                {!!order.cancel_reason && (
                  <Text className="text-sm text-red-600 mt-1">{order.cancel_reason}</Text>
                )}
              </View>
            ) : (
              <>
                {/* Stepper line */}
                <View className="mt-4 flex-row items-center justify-between">
                  {ORDER_STEPS.map((step, idx) => {
                    const activeIndex = getStepIndexByStatus(order.status);
                    const isDone = idx <= activeIndex;

                    return (
                      <View key={step.key} className="flex-1 items-center">
                        {/* line left */}
                        {idx !== 0 && (
                          <View
                            className={`absolute left-0 right-1/2 top-[14px] h-[2px] ${isDone ? "bg-green-500" : "bg-gray-300"
                              }`}
                          />
                        )}

                        {/* line right */}
                        {idx !== ORDER_STEPS.length - 1 && (
                          <View
                            className={`absolute left-1/2 right-0 top-[14px] h-[2px] ${idx < activeIndex ? "bg-green-500" : "bg-gray-300"
                              }`}
                          />
                        )}

                        {/* circle */}
                        <View
                          className={`w-7 h-7 rounded-full items-center justify-center border-2 ${isDone
                            ? "bg-green-500 border-green-500"
                            : "bg-white border-gray-300"
                            }`}
                        >
                          <MaterialCommunityIcons
                            name={step.icon}
                            size={14}
                            color={isDone ? "#fff" : "#6B7280"}
                          />
                        </View>

                        {/* label */}
                        <Text
                          className={`text-[11px] mt-1 text-center ${isDone ? "text-green-700 font-semibold" : "text-gray-500"
                            }`}
                        >
                          {step.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {/* RECEIVER INFO */}
          <View className="bg-white p-4 rounded-2xl mb-4">
            <Text className="font-bold text-lg text-[#1c4273] mb-3">
              Thông tin nhận hàng
            </Text>
            <View className="space-y-2">
              <View className="flex-row items-center">
                <Ionicons name="person-outline" size={15} color="#6B7280" />
                <Text className="ml-2 text-gray-500">
                  {order.receiver_name}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="call-outline" size={15} color="#6B7280" />
                <Text className="ml-2 mt-1 text-gray-500">
                  {order.receiver_phone}
                </Text>
              </View>
              <View className="flex-row items-start mt-1">
                <Ionicons name="location-outline" size={15} color="#6B7280" />
                <Text className="ml-2 text-gray-500 flex-1">
                  {order.shipping_address}
                </Text>
              </View>
            </View>
          </View>

          {/* PRODUCTS */}
          <View className="bg-white p-4 rounded-2xl mb-4">
            <Text className="font-bold text-lg text-[#1c4273] mb-3">
              Sản phẩm
            </Text>

            {items.map((item, index) => (
              <View
                key={item.id}
                className={`py-3 ${index !== items.length - 1 ? "border-b border-gray-200" : ""
                  }`}
              >
                <View className="flex-row">
                  {item.product_image && (
                    <Image
                      source={{
                        uri: getPublicImageUrl(item.product_image) ?? undefined,
                      }}
                      className="w-20 h-20 rounded-lg"
                    />
                  )}
                  <View className="flex-row ml-3 flex-1">
                    {/* LEFT CONTENT */}
                    <View className="flex-1">
                      <Text className="font-semibold text-[#1b4f94]">
                        {item.product_name}{item.size ? ` (${item.size})` : ""}
                      </Text>

                      <Text className="text-sm text-gray-500 mt-1">
                        SL: {item.quantity}
                      </Text>

                      {/* TOPPINGS */}
                      {item.toppings &&
                        Array.isArray(item.toppings) &&
                        item.toppings.length > 0 && (
                          <Text className="text-xs text-gray-500 mt-1">
                            + {item.toppings.map((t: any) => t.name).join(", ")}
                          </Text>
                        )}

                      {/* NOTE */}
                      {item.note && (
                        <Text className="text-xs text-gray-500 italic mt-1">
                          Ghi chú: {item.note}
                        </Text>
                      )}

                      <Text className="font-semibold text-red-500 mt-2">
                        {item.total_price.toLocaleString("vi-VN")}đ
                      </Text>
                    </View>

                    {/* RIGHT OPTIONS (hide if default 100%) */}
                    {(() => {
                      const isDefaultSugar = item.sugar_level === "100%";
                      const isDefaultIce = item.ice_level === "100%";

                      const shouldShowLevel =
                        (item.sugar_level && !isDefaultSugar) || (item.ice_level && !isDefaultIce);

                      if (!shouldShowLevel) return null;

                      return (
                        <View className="items-end ml-2">
                          {item.sugar_level && item.sugar_level !== "100%" && (
                            <View className="flex-row items-center gap-1">
                              <MaterialCommunityIcons
                                name="candy-outline"
                                size={14}
                                color="#6B7280"
                              />
                              <Text className="text-xs text-gray-500">{item.sugar_level}</Text>
                            </View>
                          )}

                          {item.ice_level && item.ice_level !== "100%" && (
                            <View className="flex-row items-center gap-1 mt-1">
                              <MaterialCommunityIcons name="snowflake" size={14} color="#6B7280" />
                              <Text className="text-xs text-gray-500">{item.ice_level}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* PAYMENT INFO */}
          <View className="bg-white p-4 rounded-2xl mb-4">
            <Text className="font-bold text-lg text-[#1c4273] mb-3">
              Thanh toán
            </Text>

            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Tạm tính</Text>
                <Text className="font-semibold">
                  {(order.total_price + order.discount_amount).toLocaleString(
                    "vi-VN"
                  )}
                  đ
                </Text>
              </View>

              {order.discount_amount > 0 && (
                <View className="flex-row justify-between mt-2">
                  <Text className="text-gray-600">Giảm giá</Text>
                  <Text className="font-semibold text-green-600">
                    -{order.discount_amount.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between border-t border-gray-200 mt-2 pt-1">
                <Text className="font-bold text-lg">Tổng cộng</Text>
                <Text className="font-bold text-lg text-red-500">
                  {order.total_price.toLocaleString("vi-VN")}đ
                </Text>
              </View>

              <View className="flex-row justify-between mt-4">
                <Text className="text-gray-600">Phương thức</Text>
                <Text className="font-semibold italic text-[#1b4f94]">
                  {getPaymentMethodText(order.payment_method)}
                </Text>
              </View>
            </View>
          </View>

          {/* ACTIONS */}
          {order.status === "pending" && (
            <Pressable
              onPress={openCancelModal}
              className="bg-red-500 py-4 rounded-2xl items-center mb-4"
            >
              <Text className="text-white font-bold text-lg">Hủy đơn hàng</Text>
            </Pressable>
          )}
        </ScrollView>
        {/* CANCEL ORDER MODAL */}
        <Modal
          visible={cancelModalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeCancelModal}
        >
          {/* Overlay: tap outside to close */}
          <Pressable
            className="flex-1 bg-black/40 justify-end"
            onPress={closeCancelModal}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              {/* Sheet */}
              <Pressable
                onPress={(e) => e.stopPropagation()}
                className="bg-white rounded-t-[28px] p-4"
              >
                {/* Handle */}
                <View className="items-center mb-3">
                  <View className="w-12 h-1.5 rounded-full bg-gray-300" />
                </View>

                <Text className="text-lg font-bold text-[#1c4273]">
                  Lý do hủy đơn
                </Text>

                <Text className="text-sm text-gray-500 mb-4">
                  Vui lòng chọn lý do để chúng tôi cải thiện dịch vụ.
                </Text>

                {/* Reasons */}
                <View className="gap-2">
                  {CANCEL_REASONS.map((reason) => {
                    const active = selectedReason === reason;

                    return (
                      <Pressable
                        key={reason}
                        onPress={() => setSelectedReason(reason)}
                        className={`p-3 rounded-2xl border ${active
                          ? "border-[#1F4171] bg-blue-50"
                          : "border-gray-200 bg-white"
                          }`}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text
                            className={`font-semibold ${active ? "text-[#1b4f94]" : "text-gray-500"
                              }`}
                          >
                            {reason}
                          </Text>

                          {active ? (
                            <Ionicons
                              name="radio-button-on"
                              size={20}
                              color="#1F4171"
                            />
                          ) : (
                            <Ionicons
                              name="radio-button-off"
                              size={20}
                              color="#9CA3AF"
                            />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom */}
                {selectedReason === "Khác" && (
                  <View className="mt-3">
                    <Text className="text-sm text-gray-600 mb-2">Nhập lý do</Text>

                    <TextInput
                      value={customReason}
                      onChangeText={setCustomReason}
                      placeholder="Ví dụ: Tôi muốn đổi địa chỉ..."
                      className="border border-gray-200 rounded-2xl px-4 py-3 text-gray-700"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                )}

                {/* Actions */}
                <View className="flex-row mt-4">
                  <Pressable
                    onPress={closeCancelModal}
                    className="flex-1 border border-gray-200 py-3 rounded-2xl items-center"
                  >
                    <Text className="font-bold text-gray-600">Đóng</Text>
                  </Pressable>

                  <Pressable
                    onPress={confirmCancelOrder}
                    disabled={
                      cancelLoading ||
                      !selectedReason ||
                      (selectedReason === "Khác" && customReason.trim().length === 0)
                    }
                    className={`flex-1 py-3 rounded-2xl items-center ml-3 ${cancelLoading ||
                      !selectedReason ||
                      (selectedReason === "Khác" && customReason.trim().length === 0)
                      ? "bg-gray-300"
                      : "bg-red-500"
                      }`}
                  >
                    {cancelLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-bold">Xác nhận hủy</Text>
                    )}
                  </Pressable>
                </View>

                <View className="h-2" />
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}
