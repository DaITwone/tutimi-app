import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  ScrollView,
  Modal,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { getPublicImageUrl } from "@/lib/storage";
import { TextInput } from "react-native-gesture-handler";
import { useThemeBackground } from "@/hooks/useThemeBackground";

/* ================= TYPES ================= */

type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
};

type CartItem = {
  id: string;
  quantity: number;
  size: string | null;
  total_price: number;
  base_price: number;
  topping_total: number;

  // ✅ ADD
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

type PaymentMethod = "cod" | "momo" | "bank";

type Bank = {
  key: string;
  name: string;
  image: any;
};

/* ================= SCREEN ================= */

export default function CheckoutScreen() {
  const BANKS: Bank[] = [
    {
      key: "vietcombank",
      name: "Vietcombank",
      image: require("@/assets/images/vietcombank.png"),
    },
    {
      key: "techcombank",
      name: "Techcombank",
      image: require("@/assets/images/techcombank.png"),
    },
    {
      key: "mbbank",
      name: "MB Bank",
      image: require("@/assets/images/mb.png"),
    },
    {
      key: "acb",
      name: "ACB",
      image: require("@/assets/images/acb.png"),
    },
    {
      key: "vpbank",
      name: "VPBank",
      image: require("@/assets/images/vpbank.png"),
    },
    {
      key: "vietinbank",
      name: "VietinBank",
      image: require("@/assets/images/vietinbank.png"),
    },
    {
      key: "bidv",
      name: "BIDV",
      image: require("@/assets/images/bidv.png"),
    },
    {
      key: "agribank",
      name: "Agribank",
      image: require("@/assets/images/agribank.png"),
    },
    {
      key: "tpbank",
      name: "TPBank",
      image: require("@/assets/images/tpbank.png"),
    },
    {
      key: "scb",
      name: "Scb",
      image: require("@/assets/images/scb.png"),
    },
  ];

  const { userId } = useAuth();
  const {
    refreshCart,
    discountAmount,
    selectedVoucher,
    setDiscountAmount,
    setSelectedVoucher,
  } = useCart();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { bgUrl } = useThemeBackground();

  /* ================= LOAD DATA ================= */

  const loadData = async () => {
    if (!userId) return;

    setLoading(true);

    const [{ data: user }, { data: cart }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, phone, address")
        .single<UserProfile>(), // ✅ không cần eq(id, userId), RLS tự lọc

      supabase
        .from("cart_items")
        .select(
          `
        id,
        quantity,
        size,
        total_price,
        base_price,
        topping_total,
        note,
        sugar_level,
        ice_level,
        toppings,
        products (
          id,
          name,
          image
        )
      `
        )
        .order("created_at", { ascending: false })
        .returns<CartItem[]>(),
    ]);

    setProfile(user as UserProfile);
    setItems(cart as CartItem[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  /* ================= HELPERS ================= */

  const isProfileComplete = () => {
    if (!profile) return false;
    return !!(profile.full_name && profile.phone && profile.address);
  };

  const totalPrice = items.reduce((sum, i) => sum + i.total_price, 0);

  const finalPrice = Math.max(totalPrice - discountAmount, 0);

  /* ================= CHECKOUT ================= */

  const handleCheckout = async () => {
    if (!userId || items.length === 0) return;

    if (!isProfileComplete()) {
      setShowProfileModal(true);
      return;
    }

    setPaying(true);

    try {
      /* 1️⃣ Create order */
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          total_price: finalPrice,
          discount_amount: discountAmount,
          voucher_id: selectedVoucher?.id ?? null,
          payment_method: paymentMethod,
          receiver_name: profile!.full_name,
          receiver_phone: profile!.phone,
          shipping_address: profile!.address,
          status: "pending",
        })
        .select()
        .single();

      if (error || !order) throw error;

      /* 2️⃣ Create order items */
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

        // ✅ SNAPSHOT
        toppings: item.toppings,
        note: item.note,
        sugar_level: item.sugar_level,
        ice_level: item.ice_level,
      }));

      await supabase.from("order_items").insert(orderItems);

      /* 3️⃣ Clear cart */
      await supabase.from("cart_items").delete().eq("user_id", userId);

      refreshCart();
      setDiscountAmount(0);
      setSelectedVoucher(null);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Checkout error:", err);
      Alert.alert("Lỗi", "Không thể thanh toán");
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (paymentMethod !== "bank") {
      setSelectedBank(null);
    }
  }, [paymentMethod]);

  /* ================= UI ================= */

  if (loading) {
    return (
      <ImageBackground
        source={bgUrl ? { uri: bgUrl } : undefined}
        className="flex-1"
        resizeMode="cover"
      >
        <SafeAreaView className="flex-1 items-center justify-center bg-white/80">
          <ActivityIndicator size="large" />
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
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
          {/* ===== USER INFO ===== */}
          <View className="bg-white/60 p-4 mb-3 border border-gray-200">
            <View className="flex-row items-center justify-between">
              {/* LEFT: ICON + TITLE */}
              <View className="flex-row items-center">
                <Text className="font-bold text-lg text-[#1c4273]">
                  Thông tin nhận hàng
                </Text>
              </View>

              {/* RIGHT: STATUS */}
              {!isProfileComplete() ? (
                <View className="px-3 py-1 rounded-full bg-red-50 border border-red-200">
                  <Text className="text-red-500 text-xs font-semibold">
                    Chưa đầy đủ
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center px-3 py-1 rounded-full bg-green-50 border border-green-200">
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                </View>
              )}
            </View>

            {/* INFO */}
            <View className="mt-3 space-y-2">
              <View className="flex-row items-center mb-1">
                <Ionicons name="person-outline" size={16} color="#6b7280" />
                <Text className="ml-2 text-gray-500">
                  {profile?.full_name || "Chưa có họ tên"}
                </Text>
              </View>

              <View className="flex-row items-center mb-1">
                <Ionicons name="call-outline" size={16} color="#6b7280" />
                <Text className="ml-2 text-gray-500">
                  {profile?.phone || "Chưa có số điện thoại"}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="home-outline" size={16} color="#6b7280" />
                <Text className="ml-2 text-gray-500">
                  {profile?.address || "Chưa có địa chỉ"}
                </Text>
              </View>
            </View>
          </View>

          {/* ===== PAYMENT METHOD ===== */}
          <View className="bg-white/60 p-4 mb-3">
            <Text className="font-bold text-lg mb-3 text-[#1c4273]">
              Phương thức thanh toán
            </Text>

            {[
              {
                key: "cod",
                label: "Thanh toán khi nhận hàng",
                image: require("@/assets/images/money.png"),
              },
              {
                key: "momo",
                label: "Ví MoMo",
                image: require("@/assets/images/momo.png"),
              },
              {
                key: "bank",
                label: "Chuyển khoản ngân hàng",
                image: require("@/assets/images/card.png"),
              },
            ].map((m) => {
              const active = paymentMethod === m.key;

              return (
                <Pressable
                  key={m.key}
                  onPress={() => {
                    setPaymentMethod(m.key as PaymentMethod);

                    if (m.key === "bank") {
                      setShowBankModal(true);
                    }
                  }}
                  className={`flex-row items-center mb-3 p-3 rounded-xl border ${
                    active
                      ? "border-[#1F4171] bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  {/* STICKER IMAGE */}
                  <View className="w-10 h-10 mr-3 items-center justify-center bg-white rounded-full">
                    <Image
                      source={m.image}
                      className="w-6 h-6"
                      resizeMode="contain"
                    />
                  </View>

                  {/* LABEL */}
                  <View className="flex-1">
                    <Text className="font-medium text-gray-600">{m.label}</Text>

                    {m.key === "bank" && selectedBank && (
                      <View className="flex-row items-center mt-1">
                        <Image
                          source={selectedBank.image}
                          className="w-4 h-4 mr-1"
                          resizeMode="contain"
                        />
                        <Text className="text-sm text-gray-500">
                          {selectedBank.name}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* RADIO */}
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color="#1F4171"
                  />
                </Pressable>
              );
            })}
          </View>

          {/* ===== ITEMS ===== */}
          <View className="bg-white/60 p-4">
            <Text className="font-bold text-lg mb-3 text-[#1c4273]">
              Sản phẩm
            </Text>

            <FlatList
              className="bg-white border border-gray-200 shadow-sm rounded-2xl"
              data={items}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const img = getPublicImageUrl(item.products.image);
                return (
                  <View className="m-1 p-3">
                    {/* TOP: IMAGE + INFO */}
                    <View className="flex-row">
                      {img && (
                        <Image
                          source={{ uri: img }}
                          className="w-20 h-20 rounded-lg bg-gray-100"
                        />
                      )}

                      {/* INFO + OPTIONS */}
                      <View className="flex-1 ml-3 mt-1 flex-row justify-between">
                        {/* LEFT: NAME + QTY */}
                        <View className="flex-1 pr-2">
                          <Text className="font-semibold text-[#1b4f94]">
                            {item.products.name} ({item.size})
                          </Text>

                          <Text className="text-sm text-gray-500 mt-1">
                            SL: {item.quantity}
                          </Text>
                          <Text className="mt-1 font-bold text-sm text-red-500">
                            {item.total_price.toLocaleString("vi-VN")}đ
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
            />

            {/* ===== PAYMENT SUMMARY ===== */}
            <View className="mt-4">
              <Text className="font-bold text-lg mb-3 text-[#1c4273]">
                Chi tiết thanh toán
              </Text>

              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Tổng đơn hàng</Text>
                <Text className="font-semibold">
                  {totalPrice.toLocaleString("vi-VN")}đ
                </Text>
              </View>

              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Phí vận chuyển</Text>
                <Text className="font-semibold text-green-600">Miễn phí</Text>
              </View>

              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Voucher giảm giá</Text>
                <Text className="font-semibold text-green-600">
                  -{discountAmount.toLocaleString("vi-VN")}đ
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ===== FOOTER ===== */}
        <View className="absolute bottom-0 left-0 right-0 bg-white p-5 border-t border-gray-200">
          <View className="flex-row justify-between mb-3">
            <Text className="text-lg font-bold">Tổng cộng</Text>
            <Text className="text-2xl font-bold text-red-500">
              {finalPrice.toLocaleString("vi-VN")}đ
            </Text>
          </View>

          <Pressable
            onPress={handleCheckout}
            disabled={paying}
            className="bg-[#1F4171] py-4 rounded-2xl items-center"
          >
            {paying ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Thanh toán</Text>
            )}
          </Pressable>
        </View>

        <Modal
          visible={showProfileModal}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setShowProfileModal(false)}
        >
          <View className="flex-1 justify-end">
            {/* OVERLAY */}
            <Pressable
              className="absolute inset-0 bg-black/40"
              onPress={() => setShowProfileModal(false)}
            />

            {/* BOTTOM SHEET */}
            <View className="bg-white rounded-t-[28px] px-6 pt-5 pb-8 overflow-hidden">
              {/* ICON */}
              <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center self-center mb-3">
                <Ionicons name="alert-circle" size={28} color="#ef4444" />
              </View>

              {/* TITLE */}
              <Text className="text-lg font-bold text-center text-[#1c4273]">
                THIẾU THÔNG TIN CÁ NHÂN
              </Text>

              {/* DESC */}
              <Text className="text-center text-gray-600 mt-2">
                Vui lòng cập nhật đầy đủ họ tên, số điện thoại và địa chỉ để tiếp
                tục thanh toán.
              </Text>

              {/* ACTIONS */}
              <View className="flex-row mt-6">
                <Pressable
                  onPress={() => setShowProfileModal(false)}
                  className="flex-1 mr-2 py-3 rounded-xl border border-gray-300"
                >
                  <Text className="text-center font-semibold text-gray-600">
                    Để sau
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowProfileModal(false);
                    router.push({
                      pathname: "/(tabs)/account/edit-profile",
                      params: { from: "checkout" },
                    });
                  }}
                  className="flex-1 ml-2 py-3 rounded-xl bg-[#1F4171]"
                >
                  <Text className="text-center font-semibold text-white">
                    Cập nhật ngay
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {showBankModal && (
          <View className="absolute inset-0 z-50">
            {/* OVERLAY */}
            <Pressable
              onPress={() => setShowBankModal(false)}
              className="absolute inset-0 bg-black/50"
            />

            {/* BOTTOM SHEET */}
            <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6">
              <View className="items-center mb-4">
                <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </View>
              <Text className="text-xl font-bold text-center text-[#1c4273] mb-4">
                Chọn ngân hàng
              </Text>

              {BANKS.map((bank) => (
                <Pressable
                  key={bank.key}
                  onPress={() => {
                    setSelectedBank(bank);
                    setShowBankModal(false);
                  }}
                  className="flex-row items-center py-3 border-b border-gray-200"
                >
                  <Image
                    source={bank.image}
                    className="w-10 h-10 rounded-lg mr-3"
                  />
                  <Text className="text-sm font-medium flex-1 text-[#1b4f94]">
                    {bank.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View className="flex-1 items-center justify-center px-6">
            {/* OVERLAY */}
            <Pressable
              className="absolute inset-0 bg-black/40"
              onPress={() => setShowSuccessModal(false)}
            />

            {/* CARD */}
            <View className="bg-white w-full rounded-3xl px-6 pt-6 pb-5 overflow-hidden">
              {/* ICON */}
              <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center self-center">
                <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
              </View>

              <Text className="text-xl font-bold text-center text-[#1c4273] mt-4">
                Đặt hàng thành công 🎉
              </Text>

              <Text className="text-center text-gray-600 mt-2">
                Cảm ơn bạn đã đặt hàng.
              </Text>

              <View className="flex-row mt-6 gap-2">
                {/* Về trang chủ */}
                <Pressable
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.replace("/(tabs)");
                  }}
                  className="flex-1 ml-2 bg-[#1F4171] py-3 rounded-2xl items-center"
                >
                  <Text className="text-white font-bold text-base">
                    Về trang chủ
                  </Text>
                </Pressable>

                {/* Đơn mua */}
                <Pressable
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.replace("/(tabs)/account/orders");
                  }}
                  className="flex-1 mr-2 py-3 rounded-2xl border border-gray-300 items-center bg-gray-200"
                >
                  <Text className="font-bold text-[#1c4273] text-base">
                    Đơn mua
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}
