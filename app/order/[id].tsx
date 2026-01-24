// app/order/[id].tsx
import { Ionicons } from "@expo/vector-icons";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabaseClient";
import { getPublicImageUrl } from "@/lib/storage";

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

  /* ================= LOAD ORDER ================= */

  const loadOrder = async () => {
    if (!id) return;

    setLoading(true);

    const [{ data: orderData }, { data: itemsData }] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single<Order>(),
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

  const handleCancelOrder = () => {
    if (!order) return;

    Alert.alert(
      "Xác nhận hủy đơn",
      "Bạn có chắc muốn hủy đơn hàng này?",
      [
        { text: "Không", style: "cancel" },
        {
          text: "Hủy đơn",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("orders")
              .update({
                status: "cancelled",
                cancel_reason: "Khách hàng hủy đơn",
              })
              .eq("id", order.id);

            if (error) {
              Alert.alert("Lỗi", "Không thể hủy đơn hàng");
            } else {
              Alert.alert("Thành công", "Đã hủy đơn hàng");
              loadOrder();
            }
          },
        },
      ]
    );
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
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1F4171" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Không tìm thấy đơn hàng</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* HEADER */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
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
        {/* STATUS */}
        <View className={`p-4 rounded-2xl mb-4 border ${getStatusColor(order.status)}`}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-gray-800">
                {getStatusText(order.status)}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                {new Date(order.created_at).toLocaleString("vi-VN")}
              </Text>
            </View>
            {order.status === "confirmed" && (
              <Ionicons name="bicycle" size={40} color="#2563eb" />
            )}
            {order.status === "completed" && (
              <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
            )}
          </View>
        </View>

        {/* CANCEL REASON */}
        {order.cancel_reason && (
          <View className="bg-red-50 p-4 rounded-2xl mb-4 border border-red-200">
            <View className="flex-row items-start">
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <View className="flex-1 ml-2">
                <Text className="font-semibold text-red-700">Lý do hủy đơn</Text>
                <Text className="text-sm text-red-600 mt-1">
                  {order.cancel_reason}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* RECEIVER INFO */}
        <View className="bg-white p-4 rounded-2xl mb-4">
          <Text className="font-bold text-lg text-[#1F4171] mb-3">
            Thông tin nhận hàng
          </Text>
          <View className="space-y-2">
            <View className="flex-row items-center">
              <Ionicons name="person" size={18} color="#6B7280" />
              <Text className="ml-2 text-gray-700">{order.receiver_name}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="call" size={18} color="#6B7280" />
              <Text className="ml-2 text-gray-700">{order.receiver_phone}</Text>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="location" size={18} color="#6B7280" />
              <Text className="ml-2 text-gray-700 flex-1">
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
              className={`py-3 ${
                index !== items.length - 1 ? "border-b border-gray-200" : ""
              }`}
            >
              <View className="flex-row">
                {item.product_image && (
                  <Image
                    source={{ uri: getPublicImageUrl(item.product_image) ?? undefined }}
                    className="w-20 h-20 rounded-lg"
                  />
                )}
                <View className="flex-1 ml-3">
                  <Text className="font-semibold text-gray-800">
                    {item.product_name}
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    {item.size} • SL: {item.quantity}
                  </Text>

                  {/* OPTIONS */}
                  {(item.sugar_level || item.ice_level) && (
                    <View className="flex-row mt-1">
                      {item.sugar_level && (
                        <Text className="text-xs text-gray-500 mr-2">
                          🧊 {item.sugar_level}
                        </Text>
                      )}
                      {item.ice_level && (
                        <Text className="text-xs text-gray-500">
                          🧊 {item.ice_level}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* TOPPINGS */}
                  {item.toppings && Array.isArray(item.toppings) && item.toppings.length > 0 && (
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
                {(order.total_price + order.discount_amount).toLocaleString("vi-VN")}đ
              </Text>
            </View>

            {order.discount_amount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Giảm giá</Text>
                <Text className="font-semibold text-green-600">
                  -{order.discount_amount.toLocaleString("vi-VN")}đ
                </Text>
              </View>
            )}

            <View className="flex-row justify-between border-t border-gray-200 pt-2">
              <Text className="font-bold text-lg">Tổng cộng</Text>
              <Text className="font-bold text-xl text-red-500">
                {order.total_price.toLocaleString("vi-VN")}đ
              </Text>
            </View>

            <View className="flex-row justify-between mt-2">
              <Text className="text-gray-600">Phương thức</Text>
              <Text className="font-semibold">
                {getPaymentMethodText(order.payment_method)}
              </Text>
            </View>
          </View>
        </View>

        {/* ACTIONS */}
        {order.status === "pending" && (
          <Pressable
            onPress={handleCancelOrder}
            className="bg-red-500 py-4 rounded-2xl items-center mb-4"
          >
            <Text className="text-white font-bold text-lg">Hủy đơn hàng</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}