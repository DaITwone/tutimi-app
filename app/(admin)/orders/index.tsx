// app/(admin)/orders/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

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
  order_items: OrderItem[];
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  product_image: string | null;
  size: string | null;
  quantity: number;
  total_price: number;
};

type TabType = "all" | "pending" | "confirmed" | "completed" | "cancelled";

/* ================= SCREEN ================= */

export default function AdminOrdersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  /* ================= LOAD ORDERS ================= */

  const loadOrders = async (showLoader = true) => {
    if (showLoader) setLoading(true);

    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        profile:profiles (
          full_name,
          phone
        )
      `)
      .order("created_at", { ascending: false });

    // Filter by status
    if (activeTab !== "all") {
      query = query.eq("status", activeTab);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Load orders error:", error);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadOrders(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders(false);
  }, [activeTab]);

  /* ================= CONFIRM ORDER ================= */

  const handleConfirmOrder = (orderId: string) => {
    Alert.alert(
      "Xác nhận đơn hàng",
      "Bắt đầu giao hàng cho đơn này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            const { error } = await supabase
              .from("orders")
              .update({ status: "confirmed" })
              .eq("id", orderId);

            if (error) {
              Alert.alert("Lỗi", "Không thể xác nhận đơn hàng");
            } else {
              Alert.alert("Thành công", "Đã xác nhận đơn hàng");
              loadOrders(false);
            }
          },
        },
      ]
    );
  };

  /* ================= COMPLETE ORDER ================= */

  const handleCompleteOrder = (orderId: string) => {
    Alert.alert(
      "Hoàn tất đơn hàng",
      "Đánh dấu đơn này đã giao thành công?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Hoàn tất",
          onPress: async () => {
            const { error } = await supabase
              .from("orders")
              .update({ status: "completed" })
              .eq("id", orderId);

            if (error) {
              Alert.alert("Lỗi", "Không thể hoàn tất đơn hàng");
            } else {
              Alert.alert("Thành công", "Đã hoàn tất đơn hàng");
              loadOrders(false);
            }
          },
        },
      ]
    );
  };

  /* ================= CANCEL ORDER ================= */

  const handleCancelOrder = () => {
    if (!selectedOrder || !cancelReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do hủy đơn");
      return;
    }

    Alert.alert(
      "Xác nhận hủy đơn",
      `Hủy đơn với lý do: "${cancelReason}"?`,
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
                cancel_reason: cancelReason,
              })
              .eq("id", selectedOrder.id);

            if (error) {
              Alert.alert("Lỗi", "Không thể hủy đơn hàng");
            } else {
              Alert.alert("Thành công", "Đã hủy đơn hàng");
              setShowCancelModal(false);
              setSelectedOrder(null);
              setCancelReason("");
              loadOrders(false);
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
        return "bg-yellow-100 text-yellow-700";
      case "confirmed":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
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

  /* ================= TABS ================= */

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Chờ xác nhận" },
    { key: "confirmed", label: "Đang giao" },
    { key: "completed", label: "Thành công" },
    { key: "cancelled", label: "Đã hủy" },
  ];

  /* ================= RENDER ================= */

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const firstItem = order.order_items[0];
    const remainingCount = order.order_items.length - 1;

    return (
      <View className="bg-white mb-3 rounded-2xl p-4 border border-gray-200">
        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-3">
          <Text
            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
              order.status
            )}`}
          >
            {getStatusText(order.status)}
          </Text>
          <Text className="text-xs text-gray-500">
            {new Date(order.created_at).toLocaleDateString("vi-VN")}
          </Text>
        </View>

        {/* CUSTOMER INFO */}
        <View className="bg-gray-50 p-3 rounded-lg mb-3">
          <View className="flex-row items-center mb-1">
            <Ionicons name="person" size={16} color="#6B7280" />
            <Text className="ml-2 font-semibold text-gray-800">
              {order.receiver_name}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="call" size={16} color="#6B7280" />
            <Text className="ml-2 text-sm text-gray-600">
              {order.receiver_phone}
            </Text>
          </View>
          <View className="flex-row items-start mt-1">
            <Ionicons name="location" size={16} color="#6B7280" />
            <Text className="ml-2 text-sm text-gray-600 flex-1">
              {order.shipping_address}
            </Text>
          </View>
        </View>

        {/* FIRST PRODUCT */}
        {firstItem && (
          <View className="flex-row mb-3">
            {firstItem.product_image && (
              <Image
                source={{ uri: getPublicImageUrl(firstItem.product_image) ?? undefined }}
                className="w-16 h-16 rounded-lg"
              />
            )}
            <View className="flex-1 ml-3 justify-center">
              <Text className="font-semibold text-gray-800">
                {firstItem.product_name}
              </Text>
              <Text className="text-sm text-gray-500">
                {firstItem.size} • SL: {firstItem.quantity}
              </Text>
            </View>
          </View>
        )}

        {/* REMAINING ITEMS */}
        {remainingCount > 0 && (
          <Text className="text-sm text-gray-500 mb-3">
            +{remainingCount} sản phẩm khác
          </Text>
        )}

        {/* TOTAL */}
        <View className="border-t border-gray-200 pt-3 mb-3">
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Tổng thanh toán</Text>
            <Text className="text-lg font-bold text-red-500">
              {order.total_price.toLocaleString("vi-VN")}đ
            </Text>
          </View>
        </View>

        {/* ACTIONS */}
        <View className="flex-row justify-between">
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(admin)/orders/[id]",
                params: { id: order.id },
              })
            }
            className="flex-1 bg-gray-100 py-3 rounded-lg mr-2"
          >
            <Text className="text-center font-semibold text-gray-700">
              Chi tiết
            </Text>
          </Pressable>

          {order.status === "pending" && (
            <>
              <Pressable
                onPress={() => handleConfirmOrder(order.id)}
                className="flex-1 bg-blue-500 py-3 rounded-lg mr-2"
              >
                <Text className="text-center font-semibold text-white">
                  Xác nhận
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelectedOrder(order);
                  setShowCancelModal(true);
                }}
                className="bg-red-500 py-3 px-4 rounded-lg"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </>
          )}

          {order.status === "confirmed" && (
            <>
              <Pressable
                onPress={() => handleCompleteOrder(order.id)}
                className="flex-1 bg-green-500 py-3 rounded-lg mr-2"
              >
                <Text className="text-center font-semibold text-white">
                  Hoàn tất
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelectedOrder(order);
                  setShowCancelModal(true);
                }}
                className="bg-red-500 py-3 px-4 rounded-lg"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* HEADER */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-xl font-bold text-[#1F4171]">
          Quản lý đơn hàng
        </Text>
      </View>

      {/* TABS */}
      <View className="bg-white px-2 py-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tabs}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setActiveTab(item.key)}
              className={`px-4 py-2 mx-1 rounded-full ${activeTab === item.key ? "bg-[#1F4171]" : "bg-gray-100"
                }`}
            >
              <Text
                className={`font-semibold ${activeTab === item.key ? "text-white" : "text-gray-600"
                  }`}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* ORDERS LIST */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1F4171" />
        </View>
      ) : orders.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="receipt-outline" size={80} color="#D1D5DB" />
          <Text className="text-gray-500 mt-4 text-lg">
            Chưa có đơn hàng nào
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1F4171"]}
            />
          }
        />
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

            <Text className="text-gray-600 mb-4">
              Chọn lý do hủy đơn hàng:
            </Text>

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
  );
}