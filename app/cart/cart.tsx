import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { supabase } from "../../lib/supabaseClient";
import VoucherModal from "../../components/VoucherModal";
import {
  Voucher,
  loadAvailableVouchers,
  calculateDiscount,
} from "../../services/voucherService";
import { useThemeBackground } from "@/hooks/useThemeBackground";
import { Swipeable } from "react-native-gesture-handler";


type CartItem = {
  id: string;
  quantity: number;
  size: string | null;
  total_price: number;
  base_price: number;
  topping_total: number;
  note?: string | null;
  sugar_level?: string | null;
  ice_level?: string | null;
  toppings: {
    id: string;
    name: string;
    price: number;
  }[] | null;
  products: {
    id: string;
    name: string;
    image: string | null;
  };
};

export default function CartScreen() {
  const { userId } = useAuth();
  const { refreshCart } = useCart();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const { bgUrl } = useThemeBackground();

  const getPublicImageUrl = (path?: string | null) => {
    if (!path) return null;
    return supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
  };

  const openVoucherModal = async () => {
    if (!userId) return;

    const list = await loadAvailableVouchers(userId, totalPrice);
    setVouchers(list);
    setShowVoucherModal(true);
  };
  const applyVoucher = (voucher: Voucher) => {
    const discount = calculateDiscount(voucher, totalPrice);
    setSelectedVoucher(voucher);
    setDiscountAmount(discount);
    setShowVoucherModal(false);
  };


  /* ================= LOAD CART ================= */
  const loadCart = async () => {
    if (!userId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("cart_items")
      .select(`
        id,
        quantity,
        size,
        total_price,
        base_price,
        topping_total,
        toppings,
        note,
        sugar_level,
        ice_level,
        products (
          id,
          name,
          image
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Load cart error:", error);
    } else {
      setItems(data as unknown as CartItem[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadCart();
  }, [userId]);

  /* ================= UPDATE QTY ================= */
  const updateQty = async (item: CartItem, newQty: number) => {
    if (newQty < 1) return;

    const newTotal =
      (item.base_price + item.topping_total) * newQty;

    // 1️⃣ Optimistic UI – update local state trước
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, quantity: newQty, total_price: newTotal }
          : i
      )
    );

    // 2️⃣ Update DB phía sau
    const { error } = await supabase
      .from("cart_items")
      .update({
        quantity: newQty,
        total_price: newTotal,
      })
      .eq("id", item.id);

    if (error) {
      console.error("❌ Update qty error:", error);
      Alert.alert("Lỗi", "Không thể cập nhật số lượng");
      loadCart(); // fallback nếu lỗi
    }

    // 3️⃣ Refresh cart badge (nhẹ, không UI)
    refreshCart();
  };


  /* ================= REMOVE ITEM ================= */
  const confirmRemoveItem = async () => {
    if (!selectedItem) return;

    await supabase
      .from("cart_items")
      .delete()
      .eq("id", selectedItem.id);

    setItems((prev) =>
      prev.filter((i) => i.id !== selectedItem.id)
    );

    refreshCart();
    setShowDeleteModal(false);
    setSelectedItem(null);
  };

  const renderRightActions = (item: CartItem) => (
    <View className="h-full">
      <Pressable
        onPress={() => {
          setSelectedItem(item);
          setShowDeleteModal(true);
        }}
        className="bg-red-600 h-full w-20 items-center justify-center"
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <Text className="text-white text-xs mt-1">Xoá</Text>
      </Pressable>
    </View>
  );


  /* ================= CHECKOUT ================= */
  const checkout = async () => {
    if (!userId || items.length === 0) return;

    setCheckingOut(true);

    try {
      const totalPrice = items.reduce(
        (sum, i) => sum + i.total_price,
        0
      );

      /* 1️⃣ create order */
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          total_price: totalPrice,
          status: "pending",
        })
        .select()
        .single();

      if (orderError || !order) {
        throw orderError;
      }

      /* 2️⃣ create order_items */
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.products.id,
        product_name: item.products.name,
        product_image: item.products.image,
        size: item.size,
        quantity: item.quantity,
        base_price: item.base_price,
        topping_total: item.topping_total,
        total_price: item.total_price,
        toppings: item.toppings,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        throw itemsError;
      }

      /* 3️⃣ clear cart */
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      refreshCart();
      setItems([]);

      Alert.alert("🎉 Thành công", "Đặt hàng thành công!");
    } catch (err) {
      console.error("❌ Checkout error:", err);
      Alert.alert("Lỗi", "Không thể đặt hàng, vui lòng thử lại");
    } finally {
      setCheckingOut(false);
    }
  };

  const totalPrice = items.reduce(
    (sum, i) => sum + i.total_price,
    0
  );

  /* ================= UI ================= */
  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <>
        {bgUrl && (
          <ImageBackground
            source={{ uri: bgUrl }}
            resizeMode="cover"
            className="flex-1"
          >
            {/* Overlay để chữ nổi */}
            <View className="flex-1 bg-white/80">
              <SafeAreaView className="flex-1 items-center justify-center">
                <Ionicons name="cart-outline" size={48} color="#999" />
                <Text className="mt-4 text-gray-600">
                  Giỏ hàng trống
                </Text>
              </SafeAreaView>
            </View>
          </ImageBackground>
        )}
      </>
    );
  }

  return (
    <View className="flex-1">
      {/* ===== BACKGROUND PHỦ TOÀN MÀN ===== */}
      {bgUrl && (
        <ImageBackground
          source={{ uri: bgUrl }}
          resizeMode="cover"
          className="absolute inset-0"
        >
          {/* Overlay làm mờ */}
          <View className="flex-1 bg-white/30">
            <SafeAreaView className="flex-1">
              {loading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" />
                </View>
              ) : items.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="cart-outline" size={48} color="#999" />
                  <Text className="mt-4 text-gray-500">Giỏ hàng trống</Text>
                </View>
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{
                    padding: 16,
                    paddingBottom: 220,
                  }}
                  renderItem={({ item }) => {
                    const productImageUrl =
                      getPublicImageUrl(item.products.image) ||
                      "https://via.placeholder.com/100";

                    return (
                      <View className="mb-4 rounded-2xl overflow-hidden">
                        <Swipeable
                          renderRightActions={() => renderRightActions(item)}
                          overshootRight={false}
                        >
                          <View className="flex-row bg-gray-50 rounded-2xl p-3">
                            {/* IMAGE */}
                            <Image
                              source={{ uri: productImageUrl }}
                              className="w-28 h-32 rounded-xl"
                            />

                            {/* RIGHT CONTENT */}
                            <View className="flex-1 ml-3 relative pr-20 pb-8">
                              {/* NAME */}
                              <Text className="font-bold text-[#1F4171]">
                                {item.products.name}
                              </Text>

                              {/* SIZE */}
                              {item.size && (
                                <Text className="text-sm text-gray-500 mt-1">
                                  Size: {item.size}
                                </Text>
                              )}

                              {/* TOPPING */}
                              {item.toppings && item.toppings.length > 0 && (
                                <Text className="text-sm text-gray-500">
                                  Topping: {item.toppings.map((t) => t.name).join(", ")}
                                </Text>
                              )}

                              {/* SUGAR + ICE (TOP RIGHT) */}
                              <View className="absolute top-0 right-0 items-end">
                                {item.sugar_level && (
                                  <Text className="text-xs text-gray-500">
                                    Đường: {item.sugar_level}
                                  </Text>
                                )}

                                {item.ice_level && (
                                  <Text className="text-xs text-gray-500">
                                    Đá: {item.ice_level}
                                  </Text>
                                )}
                              </View>

                              {/* QUANTITY */}
                              <View className="flex-row items-center justify-between mt-3">
                                <View className="flex-row items-center">
                                  <Pressable
                                    onPress={() => updateQty(item, item.quantity - 1)}
                                    className="w-8 h-8 border border-gray-300 rounded-full items-center justify-center"
                                  >
                                    <Ionicons name="remove" size={16} />
                                  </Pressable>

                                  <Text className="mx-4 font-bold">
                                    {item.quantity}
                                  </Text>

                                  <Pressable
                                    onPress={() => updateQty(item, item.quantity + 1)}
                                    className="w-8 h-8 bg-[#1F4171] rounded-full items-center justify-center"
                                  >
                                    <Ionicons name="add" size={16} color="white" />
                                  </Pressable>
                                </View>
                              </View>

                              {/* PRICE */}
                              <View className="flex-row justify-between pr-1 mt-2">
                                <Text className="font-bold text-red-500">
                                  {item.total_price.toLocaleString("vi-VN")}đ
                                </Text>
                              </View>

                              {/* NOTE (BOTTOM RIGHT) */}
                              {item.note && (
                                <Text
                                  className="absolute bottom-0 right-0 text-xs text-gray-400 italic max-w-[70%] text-right"
                                  numberOfLines={2}
                                >
                                  Ghi chú: {item.note}
                                </Text>
                              )}
                            </View>
                          </View>

                        </Swipeable>
                      </View>
                    );
                  }}
                />
              )}
            </SafeAreaView>
          </View>
        </ImageBackground>
      )}

      {/* ===== FOOTER ===== */}
      {items.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl">
          <View className="px-6 pt-6 pb-8">
            <View className="mb-4">
              {/* Tạm tính */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-600">Tạm tính</Text>
                <Text className="font-semibold text-gray-800">
                  {totalPrice.toLocaleString("vi-VN")}đ
                </Text>
              </View>

              {/* Phí ship */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-600">Phí vận chuyển</Text>
                <Text className="font-semibold text-green-600">
                  Miễn phí
                </Text>
              </View>

              {/* ===== VOUCHER ===== */}
              <Pressable
                onPress={openVoucherModal}
                className="flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="ticket-outline"
                    size={20}
                    color="#1F4171"
                  />
                  <Text className="ml-2 text-gray-600">
                    {selectedVoucher
                      ? selectedVoucher.title
                      : "Chọn voucher"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#999"
                />
              </Pressable>

              {/* Giảm giá */}
              {discountAmount > 0 && (
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-gray-600">Giảm giá</Text>
                  <Text className="font-semibold text-green-600">
                    -{discountAmount.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
              )}

              {/* Tổng cộng */}
              <View className="border-t border-gray-200 pt-3 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900">
                  Tổng cộng
                </Text>
                <Text className="text-2xl font-bold text-red-500">
                  {(totalPrice - discountAmount).toLocaleString("vi-VN")}đ
                </Text>
              </View>
            </View>

            <Pressable
              onPress={checkout}
              disabled={checkingOut}
              className="rounded-2xl overflow-hidden"
            >
              {checkingOut ? (
                <View className="bg-gray-400 py-4 rounded-2xl">
                  <ActivityIndicator color="white" />
                </View>
              ) : (
                <View className="bg-[#1F4171] py-4 rounded-2xl items-center">
                  <Text className="text-white font-bold text-lg">
                    Đặt hàng ngay
                  </Text>
                </View>
              )}
            </Pressable>

            <View className="flex-row items-center justify-center mt-5">
              <Ionicons
                name="shield-checkmark"
                size={22}
                color="#10b981"
              />
              <Text className="text-base text-gray-500 ml-1">
                Thanh toán an toàn và bảo mật
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== DELETE MODAL ===== */}
      {showDeleteModal && (
        <View className="absolute inset-0 bg-black/40 items-center justify-center">
          <View className="bg-white w-[85%] rounded-2xl p-5">
            <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center self-center">
              <Ionicons
                name="trash-outline"
                size={28}
                color="white"
              />
            </View>
            <Text className="text-lg font-bold text-center text-red-500 mt-3">
              Bạn muốn xóa sản phẩm?
            </Text>
            <Text className="text-gray-500 text-center mt-2 text-lg">
              {selectedItem?.products.name}
            </Text>
            <View className="flex-row mt-6">
              <Pressable
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedItem(null);
                }}
                className="flex-1 mr-2 py-3 rounded-xl border border-gray-300"
              >
                <Text className="text-center font-semibold text-gray-600">
                  Huỷ
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmRemoveItem}
                className="flex-1 ml-2 py-3 rounded-xl bg-red-500"
              >
                <Text className="text-center font-semibold text-white">
                  Xoá
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      {/* ===== VOUCHER MODAL ===== */}
      <VoucherModal
        visible={showVoucherModal}
        vouchers={vouchers}
        selectedVoucher={selectedVoucher}
        onSelect={applyVoucher}
        onRemove={() => {
          setSelectedVoucher(null);
          setDiscountAmount(0);
        }}
        onClose={() => setShowVoucherModal(false)}
      />
    </View>
  );
}
