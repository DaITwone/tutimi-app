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
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { supabase } from "@/lib/supabaseClient";
import { getPublicImageUrl } from "@/lib/storage";
import { useThemeBackground } from "@/hooks/useThemeBackground";

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
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const { bgUrl } = useThemeBackground();

  const ADMIN_CANCEL_REASONS = [
    "Hết món",
    "Quá tải đơn",
    "Không liên hệ được khách",
    "Sai thông tin giao hàng",
    "Ngoài khu vực phục vụ",
    "Khác",
  ];

  /* ================= LOAD ORDERS ================= */

  const loadOrders = async (showLoader = true) => {
    if (showLoader) setLoading(true);

    let query = supabase
      .from("orders")
      .select(
        `
        *,
        order_items (*),
        profile:profiles!orders_user_id_fkey (
          full_name,
          phone
        )
      `
      )
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

  useEffect(() => {
    const debugRole = async () => {
      const { data } = await supabase.auth.getSession();
      console.log("JWT app_metadata:", data.session?.user?.app_metadata);
    };

    debugRole();
  }, []);

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

  const handleConfirmOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "confirmed" })
        .eq("id", orderId);

      if (error) throw error;

      loadOrders(false);
    } catch (err: any) {
      console.error("Confirm order error:", err?.message || err);
    }
  };

  /* ================= COMPLETE ORDER ================= */

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", orderId);

      if (error) throw error;

      loadOrders(false);
    } catch (err: any) {
      console.error("Complete order error:", err?.message || err);
    }
  };


  /* ================= CANCEL ORDER ================= */

  const openCancelModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedReason(null);
    setCustomReason("");
    setCancelModalVisible(true);
  };

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    setSelectedOrder(null);
    setSelectedReason(null);
    setCustomReason("");
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !selectedReason) return;

    const finalReason =
      selectedReason === "Khác" ? customReason.trim() : selectedReason;

    if (!finalReason) return;

    try {
      setCancelLoading(true);

      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancel_reason: finalReason,
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      closeCancelModal();
      loadOrders(false);
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
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(
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
        <View className="border border-gray-100 p-3 rounded-lg mb-3">
          <View className="flex-row items-center mb-1">
            <Ionicons name="person" size={16} color="#6B7280" />
            <Text className="ml-2 font-semibold text-[#1c4273]">
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
                source={{
                  uri: getPublicImageUrl(firstItem.product_image) ?? undefined,
                }}
                className="w-16 h-16 rounded-lg"
              />
            )}
            <View className="flex-1 ml-3 justify-center">
              <Text className="font-semibold text-[#1b4f94]">
                {firstItem.product_name}{firstItem.size ? ` (${firstItem.size})` : ""}
              </Text>
              <Text className="text-sm text-gray-500">
                SL: {firstItem.quantity}
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
            <Text className="text-base text-gray-600">Tổng thanh toán</Text>
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
                className="flex-1 bg-[#1b4f94] py-3 rounded-lg mr-2"
              >
                <Text className="text-center font-semibold text-white">
                  Xác nhận
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { openCancelModal(order); }}
                className="bg-red-500 py-3 px-4 rounded-lg"
              >
                <Text className="text-center font-semibold text-white">
                  Hủy đơn
                </Text>
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
                  openCancelModal(order);
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
    <ImageBackground
      source={bgUrl ? { uri: bgUrl } : undefined}
      className="flex-1"
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1 bg-gray-100/80">
        {/* HEADER */}
        <View className="px-4 py-3 border-b border-gray-200">
          <Text className="text-xl font-bold text-[#1c4273]">
            Quản lý đơn hàng
          </Text>
        </View>

        {/* TABS */}
        <View className="px-2 py-4 shadow-sm">
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
            contentContainerStyle={{ padding: 14 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#1F4171"]}
              />
            }
          />
        )}

        {/* CANCEL ORDER MODAL (BOTTOM SHEET) */}
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
              {/* Sheet: stop close when tap inside */}
              <Pressable
                onPress={(e) => e.stopPropagation()}
                className="bg-white rounded-t-[28px] p-4"
              >
                {/* Handle */}
                <View className="items-center mb-3">
                  <View className="w-12 h-1.5 rounded-full bg-gray-300" />
                </View>

                <Text className="text-lg font-bold text-[#1c4273]">
                  Hủy đơn hàng
                </Text>

                {selectedOrder && (
                  <Text className="text-sm text-gray-500 mb-4 italic">
                    Mã đơn: #{selectedOrder.id.slice(0, 8)}
                  </Text>
                )}

                {/* Reasons */}
                <View className="gap-2">
                  {ADMIN_CANCEL_REASONS.map((reason) => {
                    const active = selectedReason === reason;

                    return (
                      <Pressable
                        key={reason}
                        onPress={() => setSelectedReason(reason)}
                        className={`p-3 rounded-2xl border ${active
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 bg-white"
                          }`}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text
                            className={`font-semibold ${active ? "text-red-700" : "text-gray-500"
                              }`}
                          >
                            {reason}
                          </Text>

                          {active ? (
                            <Ionicons name="radio-button-on" size={20} color="#ef4444" />
                          ) : (
                            <Ionicons name="radio-button-off" size={20} color="#9CA3AF" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom reason */}
                {selectedReason === "Khác" && (
                  <View className="mt-3">
                    <Text className="text-sm text-gray-600 mb-2">Nhập lý do</Text>
                    <TextInput
                      value={customReason}
                      onChangeText={setCustomReason}
                      placeholder="Nhập lý do cụ thể..."
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
                    onPress={handleCancelOrder}
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
