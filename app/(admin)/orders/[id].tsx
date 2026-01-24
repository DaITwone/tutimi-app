// app/(admin)/orders/[id].tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabaseClient";
import { getPublicImageUrl } from "@/lib/storage";
import { useThemeBackground } from "@/hooks/useThemeBackground";

/* ================= TYPES ================= */

type StepKey = "pending" | "confirmed" | "completed";

const ORDER_STEPS: {
  key: StepKey;
  label: string;
  icon: any;
}[] = [
    { key: "pending", label: "Đã đặt", icon: "check-decagram-outline" },
    { key: "confirmed", label: "Đang giao", icon: "truck-delivery-outline" },
    { key: "completed", label: "Hoàn tất", icon: "package-variant-closed" },
  ];

const getStepIndexByStatus = (status: OrderStatus): number => {
  if (status === "cancelled") return -1;
  return ORDER_STEPS.findIndex((s) => s.key === status);
};

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

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

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
      .channel(`admin-order-${id}`)
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

  /* ================= ACTIONS ================= */

  const handleConfirmOrder = () => {
    if (!order) return;

    Alert.alert("Xác nhận đơn hàng", "Bắt đầu giao hàng cho đơn này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        onPress: async () => {
          const { error } = await supabase
            .from("orders")
            .update({ status: "confirmed" })
            .eq("id", order.id);

          if (error) {
            Alert.alert("Lỗi", "Không thể xác nhận đơn hàng");
          } else {
            Alert.alert("Thành công", "Đã xác nhận đơn hàng");
            loadOrder();
          }
        },
      },
    ]);
  };

  const handleCompleteOrder = () => {
    if (!order) return;

    Alert.alert("Hoàn tất đơn hàng", "Đánh dấu đơn này đã giao thành công?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Hoàn tất",
        onPress: async () => {
          const { error } = await supabase
            .from("orders")
            .update({ status: "completed" })
            .eq("id", order.id);

          if (error) {
            Alert.alert("Lỗi", "Không thể hoàn tất đơn hàng");
          } else {
            Alert.alert("Thành công", "Đã hoàn tất đơn hàng");
            loadOrder();
          }
        },
      },
    ]);
  };

  const handleCancelOrder = () => {
    if (!order || !cancelReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do hủy đơn");
      return;
    }

    Alert.alert("Xác nhận hủy đơn", `Hủy đơn với lý do: "${cancelReason}"?`, [
      { text: "Không", style: "cancel" },
      {
        text: "Hủy đơn",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("orders")
            .update({
              status: "cancelled",
              cancel_reason: cancelReason,
            })
            .eq("id", order.id);

          if (error) {
            Alert.alert("Lỗi", "Không thể hủy đơn hàng");
          } else {
            Alert.alert("Thành công", "Đã hủy đơn hàng");
            setShowCancelModal(false);
            setCancelReason("");
            loadOrder();
          }
        },
      },
    ]);
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
          <View className="flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#1F4171" />
            </Pressable>
            <Text className="text-xl font-bold text-[#1F4171]">
              Chi tiết đơn hàng
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* STATUS STEPPER */}
          <View className="bg-white p-4 rounded-2xl mb-4 border border-gray-200">
            {/* Title + Time */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-bold text-[#1b4f94]">
                  {getStatusText(order.status)}
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
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
                  <Text className="ml-2 font-semibold text-red-700">
                    Lý do hủy đơn
                  </Text>
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

          {/* CUSTOMER INFO */}
          <View className="bg-white p-4 rounded-2xl mb-4">
            <Text className="font-bold text-lg text-[#1F4171] mb-3">
              Thông tin khách hàng
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
            <Text className="font-bold text-lg text-[#1F4171] mb-3">
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
            <Text className="font-bold text-lg text-[#1F4171] mb-3">
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
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-600">Giảm giá</Text>
                  <Text className="font-semibold text-green-600">
                    -{order.discount_amount.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between border-t border-gray-200 pt-1 mt-2">
                <Text className="font-bold text-lg">Tổng cộng</Text>
                <Text className="font-bold text-xl text-red-500">
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
        </ScrollView>

        {/* FOOTER ACTIONS */}
        {(order.status === "pending" || order.status === "confirmed") && (
          <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200">
            <View className="flex-row">
              <Pressable
                onPress={() => setShowCancelModal(true)}
                className="flex-1 bg-red-500 py-4 rounded-2xl items-center mr-2"
              >
                <Text className="text-white font-bold text-lg">Hủy đơn</Text>
              </Pressable>

              {order.status === "pending" && (
                <Pressable
                  onPress={handleConfirmOrder}
                  className="flex-1 bg-blue-500 py-4 rounded-2xl items-center ml-2"
                >
                  <Text className="text-white font-bold text-lg">Xác nhận</Text>
                </Pressable>
              )}

              {order.status === "confirmed" && (
                <Pressable
                  onPress={handleCompleteOrder}
                  className="flex-1 bg-green-500 py-4 rounded-2xl items-center ml-2"
                >
                  <Text className="text-white font-bold text-lg">Hoàn tất</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* CANCEL MODAL */}
        <Modal
          visible={showCancelModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-center items-center"
            onPress={() => setShowCancelModal(false)}
          >
            <Pressable
              className="bg-white rounded-3xl p-6 w-[90%] max-w-md"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="items-center mb-4">
                <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center">
                  <Ionicons name="close-circle" size={32} color="#dc2626" />
                </View>
                <Text className="text-xl font-bold text-gray-800 mt-3">
                  Hủy đơn hàng
                </Text>
              </View>

              <Text className="text-gray-600 mb-4">Chọn lý do hủy đơn hàng:</Text>

              {[
                "Hết món",
                "Hết topping",
                "Chưa tắt món trên hệ thống",
                "Hết khuyến mãi",
                "Khách hàng yêu cầu",
                "Lý do khác",
              ].map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setCancelReason(reason)}
                  className={`p-3 rounded-lg mb-2 border ${cancelReason === reason
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200"
                    }`}
                >
                  <Text
                    className={`${cancelReason === reason
                      ? "text-red-700 font-semibold"
                      : "text-gray-700"
                      }`}
                  >
                    {reason}
                  </Text>
                </Pressable>
              ))}

              {cancelReason === "Lý do khác" && (
                <TextInput
                  placeholder="Nhập lý do..."
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  className="border border-gray-300 rounded-lg p-3 mt-2"
                  multiline
                />
              )}

              <View className="flex-row mt-4">
                <Pressable
                  onPress={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="flex-1 bg-gray-200 py-3 rounded-lg mr-2"
                >
                  <Text className="text-center font-semibold text-gray-700">
                    Đóng
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleCancelOrder}
                  className="flex-1 bg-red-500 py-3 rounded-lg ml-2"
                >
                  <Text className="text-center font-semibold text-white">
                    Xác nhận hủy
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}
