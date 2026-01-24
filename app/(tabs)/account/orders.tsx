// app/(tabs)/account/orders.tsx
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
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
};

type OrderItem = {
    id: string;
    product_name: string;
    product_image: string | null;
    size: string | null;
    quantity: number;
    total_price: number;
    toppings: any;
    note: string | null;
    sugar_level: string | null;
    ice_level: string | null;
};

type TabType = "all" | "pending" | "confirmed" | "completed" | "cancelled";

/* ================= SCREEN ================= */

export default function UserOrdersScreen() {
    const { userId } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    /* ================= LOAD ORDERS ================= */

    const loadOrders = async (showLoader = true) => {
        if (!userId) return;

        if (showLoader) setLoading(true);

        let query = supabase
            .from("orders")
            .select(`
        *,
        order_items (*)
      `)
            .eq("user_id", userId)
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
    }, [userId, activeTab]);

    // Realtime subscription
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel("orders-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    loadOrders(false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, activeTab]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadOrders(false);
    }, [activeTab]);

    /* ================= CANCEL ORDER ================= */

    const handleCancelOrder = (orderId: string) => {
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
                            .eq("id", orderId);

                        if (error) {
                            Alert.alert("Lỗi", "Không thể hủy đơn hàng");
                        } else {
                            Alert.alert("Thành công", "Đã hủy đơn hàng");
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

    const getStatusIcon = (status: OrderStatus) => {
        switch (status) {
            case "pending":
                return "time-outline";
            case "confirmed":
                return "bicycle-outline";
            case "completed":
                return "checkmark-circle-outline";
            case "cancelled":
                return "close-circle-outline";
        }
    };

    /* ================= TABS ================= */

    const tabs: { key: TabType; label: string }[] = [
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
            <Pressable
                onPress={() =>
                    router.push({
                        pathname: "/order/[id]",
                        params: { id: order.id },
                    })
                }
                className="bg-white mb-3 rounded-2xl p-4 border border-gray-200"
            >
                {/* HEADER */}
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                        <Ionicons
                            name={getStatusIcon(order.status)}
                            size={20}
                            color={
                                order.status === "completed"
                                    ? "#16a34a"
                                    : order.status === "cancelled"
                                        ? "#dc2626"
                                        : order.status === "confirmed"
                                            ? "#2563eb"
                                            : "#ca8a04"
                            }
                        />
                        <Text
                            className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                order.status
                            )}`}
                        >
                            {getStatusText(order.status)}
                        </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString("vi-VN")}
                    </Text>
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
                            <Text className="font-semibold text-gray-800">
                                {firstItem.product_name}
                            </Text>
                            <Text className="text-sm text-gray-500">
                                {firstItem.size} • SL: {firstItem.quantity}
                            </Text>
                        </View>
                        <Text className="font-semibold text-red-500">
                            {firstItem.total_price.toLocaleString("vi-VN")}đ
                        </Text>
                    </View>
                )}

                {/* REMAINING ITEMS */}
                {remainingCount > 0 && (
                    <Text className="text-sm text-gray-500 mb-3">
                        +{remainingCount} sản phẩm khác
                    </Text>
                )}

                {/* CANCEL REASON */}
                {order.cancel_reason && (
                    <View className="bg-red-50 p-3 rounded-lg mb-3">
                        <Text className="text-sm text-red-600">
                            Lý do hủy: {order.cancel_reason}
                        </Text>
                    </View>
                )}

                {/* FOOTER */}
                <View className="border-t border-gray-200 pt-3 flex-row justify-between items-center">
                    <View>
                        <Text className="text-sm text-gray-600">Tổng thanh toán</Text>
                        <Text className="text-lg font-bold text-red-500">
                            {order.total_price.toLocaleString("vi-VN")}đ
                        </Text>
                    </View>

                    {/* ACTIONS */}
                    <View className="flex-row">
                        {order.status === "pending" && (
                            <Pressable
                                onPress={() => handleCancelOrder(order.id)}
                                className="bg-red-500 px-4 py-2 rounded-lg"
                            >
                                <Text className="text-white font-semibold">Hủy đơn</Text>
                            </Pressable>
                        )}

                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/order/[id]",
                                    params: { id: order.id },
                                })
                            }
                            className="bg-[#1F4171] px-4 py-2 rounded-lg ml-2"
                        >
                            <Text className="text-white font-semibold">Chi tiết</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-100">
            {/* HEADER */}
            <View className="bg-white px-4 py-3 border-b border-gray-200">
                <View className="flex-row items-center">
                    <Pressable onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#1F4171" />
                    </Pressable>
                    <Text className="text-xl font-bold text-[#1F4171]">
                        Đơn hàng của tôi
                    </Text>
                </View>
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
                            className={`px-4 py-2 mx-1 rounded-full ${activeTab === item.key
                                    ? "bg-[#1F4171]"
                                    : "bg-gray-100"
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
        </SafeAreaView>
    );
}