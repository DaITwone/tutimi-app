import {
  View,
  Text,
  ScrollView,
  Pressable,
  ImageBackground,
  Alert,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import { Voucher } from "@/services/voucherService";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeBackground } from "@/hooks/useThemeBackground";

export default function VoucherScreen() {
  const { userId } = useAuth();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthToast, setShowAuthToast] = useState(false);

  // Track voucher đã lưu
  const [savedVoucherIds, setSavedVoucherIds] = useState<Set<string>>(new Set());

  // Animation cho icon +1
  const [animatingVoucherId, setAnimatingVoucherId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const { bgUrl } = useThemeBackground();
  const isLightBackground = bgUrl?.includes("theme-bg-06");


  useEffect(() => {
    loadVouchers();
  }, []);

  // ===== LOAD VOUCHERS =====
  const loadVouchers = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("vouchers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    setVouchers(data || []);

    // Load danh sách voucher đã lưu của user
    await loadSavedVouchers();

    setLoading(false);

  };

  // ===== LOAD SAVED VOUCHERS =====
  const loadSavedVouchers = async () => {
    if (!userId) {
      setSavedVoucherIds(new Set());
      return;
    }

    const { data } = await supabase
      .from("user_vouchers")
      .select("voucher_id")
      .eq("user_id", userId);

    if (data) {
      setSavedVoucherIds(new Set(data.map((item) => item.voucher_id)));
    }
  };

  // ===== ANIMATION +1 ICON =====
  const playPlusOneAnimation = () => {
    // Reset
    fadeAnim.setValue(0);
    translateY.setValue(0);

    // Animate
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -50,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setAnimatingVoucherId(null);
      });
    });
  };

  // ===== SAVE VOUCHER =====
  const handleSaveVoucher = async (voucherId: string) => {
    // Chưa đăng nhập
    if (!userId) {
      setShowAuthToast(true);
      setTimeout(() => {
        setShowAuthToast(false);
      }, 2000);
      return;
    }

    // Check đã lưu chưa
    const { data: existed } = await supabase
      .from("user_vouchers")
      .select("id")
      .eq("user_id", userId)
      .eq("voucher_id", voucherId)
      .maybeSingle();

    if (existed) {
      Alert.alert("Thông báo", "Bạn đã lưu voucher này rồi");
      return;
    }

    // Lưu voucher
    const { error } = await supabase.from("user_vouchers").insert({
      user_id: userId,
      voucher_id: voucherId,
    });

    if (error) {
      Alert.alert("Lỗi", "Không thể lưu voucher");
      return;
    }

    // ✅ Cập nhật state
    setSavedVoucherIds((prev) => new Set(prev).add(voucherId));

    // ✅ Play animation +1
    setAnimatingVoucherId(voucherId);
    playPlusOneAnimation();
  };

  // ===== HANDLE USE NOW =====
  const handleUseNow = (voucherId: string) => {
    // Navigate đến trang menu
    router.push("/menu");
  };

  return (
    <>
      {bgUrl && (
        <ImageBackground
          source={{ uri: bgUrl }}
          resizeMode="cover"
          className="flex-1"
        >
          {/* Overlay */}
          <View className="absolute inset-0 bg-white/60" />

          <SafeAreaView edges={["top"]} className="flex-1">
            {/* ===== HEADER ===== */}
            <View className="flex-row items-center px-5 pt-4 pb-3">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 active:scale-95"
              >
                <Ionicons name="arrow-back" size={22} color="#1F4171" />
              </Pressable>

              <View className="ml-3">
                <Text className="text-2xl font-bold text-blue-900">
                  Kho voucher
                </Text>
                <Text className="text-gray-500 text-base">
                  Săn mã giảm giá mới mỗi ngày
                </Text>
              </View>
            </View>

            {/* ===== CONTENT ===== */}
            <ScrollView
              className="px-6 py-4"
              showsVerticalScrollIndicator={false}
            >
              {/* Loading */}
              {loading && (
                <View className="items-center py-10">
                  <Text className="text-gray-400">Đang tải voucher...</Text>
                </View>
              )}

              {/* Empty */}
              {!loading && vouchers.length === 0 && (
                <View className="items-center py-16">
                  <Ionicons name="ticket-outline" size={48} color="#9ca3af" />
                  <Text className="mt-4 text-gray-600">
                    Hiện chưa có voucher nào
                  </Text>
                </View>
              )}

              {/* Voucher list */}
              {!loading &&
                vouchers.map((v) => {
                  const isSaved = savedVoucherIds.has(v.id);
                  const isAnimating = animatingVoucherId === v.id;

                  return (
                    <View
                      key={v.id}
                      className="mb-4 rounded-2xl overflow-hidden"
                    >
                      <View
                        className={`
                        rounded-2xl p-4
                        ${isLightBackground
                          ? "bg-white/85 shadow-sm"
                          : "bg-white/85"}
                      `}
                      >

                        {/* Title */}
                        <View className="flex-row items-start">
                          <Ionicons name="pricetag" size={30} color="#3b82f6" />
                          <View className="ml-2 flex-1">
                            <Text className="text-base font-bold text-blue-900">
                              {v.title}
                            </Text>

                            {v.description && (
                              <Text className="text-sm text-gray-600 mt-1">
                                {v.description}
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Code + Action */}
                        <View className="flex-row items-center justify-between mt-4">
                          <View>
                            <Text className="text-xs text-gray-500">
                              Mã voucher
                            </Text>
                            <Text className="font-mono font-bold text-blue-700">
                              {v.code}
                            </Text>
                          </View>

                          {/* Button: Lưu mã hoặc Dùng ngay */}
                          <View className="relative">
                            <Pressable
                              onPress={() =>
                                isSaved
                                  ? handleUseNow(v.id)
                                  : handleSaveVoucher(v.id)
                              }
                              className={`px-4 py-2 rounded-full ${isSaved
                                ? "bg-green-500 active:bg-green-600"
                                : "bg-blue-500 active:bg-blue-600"
                                }`}
                            >
                              <Text className="text-white font-semibold text-xs">
                                {isSaved ? "Dùng ngay" : "Lưu mã"}
                              </Text>
                            </Pressable>

                            {/* ✨ Animation +1 Icon */}
                            {isAnimating && (
                              <Animated.View
                                style={{
                                  position: "absolute",
                                  top: -10,
                                  right: 10,
                                  opacity: fadeAnim,
                                  transform: [{ translateY }],
                                }}
                                className="flex-row items-center"
                              >
                                <Text className="text-green-500 font-bold text-lg mr-1">
                                  +1
                                </Text>
                                <Ionicons
                                  name="ticket"
                                  size={24}
                                  color="#22c55e"
                                />
                              </Animated.View>
                            )}
                          </View>
                        </View>

                        {/* Min order */}
                        {v.min_order_value && (
                          <View className="flex-row items-center mt-3 pt-3 border-t border-gray-200">
                            <Ionicons
                              name="information-circle-outline"
                              size={14}
                              color="#6b7280"
                            />
                            <Text className="text-xs text-gray-500 ml-1.5">
                              Áp dụng cho đơn từ{" "}
                              {v.min_order_value.toLocaleString()}₫
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
            </ScrollView>
          </SafeAreaView>

          {/* ===== AUTH TOAST (CHƯA ĐĂNG NHẬP) ===== */}
          <Modal visible={showAuthToast} transparent animationType="fade">
            <View className="flex-1 justify-end items-end pb-20 m-4">
              <View className="bg-black/80 px-6 py-4 rounded-2xl flex-row items-center">
                <Ionicons name="information-circle" size={22} color="#4ade80" />
                <Text className="text-white font-semibold ml-2">
                  Vui lòng đăng nhập để lưu voucher
                </Text>
              </View>
            </View>
          </Modal>
        </ImageBackground>
      )}
    </>
  );
}