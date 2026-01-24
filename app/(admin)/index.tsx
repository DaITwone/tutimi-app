import { supabase } from "@/lib/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminDashboard() {
  /* ===============================
     REAL COUNTS
  =============================== */
  const [userCount, setUserCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [newsCount, setNewsCount] = useState(0);

  /* ===============================
     DISPLAY COUNTS (ANIMATED)
  =============================== */
  const [userDisplay, setUserDisplay] = useState(0);
  const [productDisplay, setProductDisplay] = useState(0);
  const [newsDisplay, setNewsDisplay] = useState(0);

  /* ===============================
     ANIMATED VALUES
  =============================== */
  const userAnim = useRef(new Animated.Value(0)).current;
  const productAnim = useRef(new Animated.Value(0)).current;
  const newsAnim = useRef(new Animated.Value(0)).current;

  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  const [showMenu, setShowMenu] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setShowMenu(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setShowMenu(false));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    closeMenu();
    router.replace("/Splash");
  };


  /* ===============================
     FETCH STATS
  =============================== */
  const fetchStats = async () => {
    const [
      { data: userData },
      { count: products },
      { count: news },
    ] = await Promise.all([
      supabase
        .from("admin_user_count")
        .select("total")
        .single(),

      supabase
        .from("products")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("news")
        .select("*", { count: "exact", head: true }),
    ]);

    const u = userData?.total ?? 0;
    const p = products ?? 0;
    const n = news ?? 0;

    setUserCount(u);
    setProductCount(p);
    setNewsCount(n);

    Animated.parallel([
      Animated.timing(userAnim, {
        toValue: u,
        duration: 1600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),

      Animated.timing(productAnim, {
        toValue: p,
        duration: 1900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),

      Animated.timing(newsAnim, {
        toValue: n,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };


  /* ===============================
     EFFECTS
  =============================== */
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const u = userAnim.addListener(({ value }) =>
      setUserDisplay(Math.floor(value))
    );
    const p = productAnim.addListener(({ value }) =>
      setProductDisplay(Math.floor(value))
    );
    const n = newsAnim.addListener(({ value }) =>
      setNewsDisplay(Math.floor(value))
    );

    return () => {
      userAnim.removeListener(u);
      productAnim.removeListener(p);
      newsAnim.removeListener(n);
    };
  }, []);

  /* ===============================
     UI
  =============================== */
  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ===== HEADER ===== */}
        <SafeAreaView
          edges={["top"]}
          className="px-5 pt-6 pb-10 bg-[#1C4273]"
        >
          <Pressable onPress={openMenu}>
            <Image
              source={require("../../assets/images/logo-local.png")}
              className="self-center"
              style={{ height: 140, width: 210 }}
            />
          </Pressable>

        </SafeAreaView>

        {/* ===== CONTENT ===== */}
        <View className="bg-white rounded-t-3xl -mt-6 px-5 pt-6 pb-10">
          {/* TITLE */}
          <View className="mb-5">
            <Text className="text-2xl font-bold text-[#1b4f94]">
              Admin Dashboard
            </Text>
            <Text className="text-base text-gray-500">
              Tổng quan hệ thống & quản lý nội dung
            </Text>
          </View>

          {/* ===== STATS ===== */}
          <Animated.View
            style={{ transform: [{ scale: scaleAnim }] }}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6"
          >
            <View className="flex-row justify-between">
              {/* USERS */}
              <View className="items-center flex-1">
                <View className="h-10 w-10 rounded-xl bg-blue-100 items-center justify-center mb-1">
                  <Ionicons name="people-outline" size={20} color="#2563eb" />
                </View>
                <Text className="text-xl font-bold text-[#082841]">
                  {userDisplay}
                </Text>
                <Text className="text-xs text-gray-500">Người dùng</Text>
              </View>


              {/* NEWS */}
              <View className="items-center flex-1">
                <View className="h-10 w-10 rounded-xl bg-emerald-100 items-center justify-center mb-1">
                  <Ionicons
                    name="newspaper-outline"
                    size={20}
                    color="#059669"
                  />
                </View>
                <Text className="text-xl font-bold text-[#082841]">
                  {newsDisplay}
                </Text>
                <Text className="text-xs text-gray-500">Tin tức</Text>
              </View>


              {/* PRODUCTS */}
              <View className="items-center flex-1">
                <View className="h-10 w-10 rounded-xl bg-[#082841]/10 items-center justify-center mb-1">
                  <Ionicons name="cafe-outline" size={20} color="#082841" />
                </View>
                <Text className="text-xl font-bold text-[#082841]">
                  {productDisplay}
                </Text>
                <Text className="text-xs text-gray-500">Sản phẩm</Text>
              </View>
            </View>
          </Animated.View>

          {/* ===== NAVIGATION ===== */}
          <View className="gap-4">
            <Pressable
              onPress={() => router.push("/products")}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="h-12 w-12 rounded-xl bg-[#082841]/10 items-center justify-center">
                  <Ionicons name="cafe-outline" size={24} color="#082841" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[#082841] font-bold text-lg">
                    Quản Lý Sản Phẩm
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Thêm, sửa, xoá nước uống
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push("/news")}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="h-12 w-12 rounded-xl bg-[#0f766e]/10 items-center justify-center">
                  <Ionicons name="newspaper-outline" size={24} color="#0f766e" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[#0f766e] font-bold text-lg">
                    Quản Lý Tin Tức - Ưu Đãi
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Bài viết, thông báo
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push("/vouchers")}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="h-12 w-12 rounded-xl bg-[#7c2d12]/10 items-center justify-center">
                  <Ionicons name="pricetag-outline" size={24} color="#7c2d12" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[#7c2d12] font-bold text-lg">
                    Quản Lý Voucher
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Mã giảm giá, khuyến mãi
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push("/theme")}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="h-12 w-12 rounded-xl bg-blue-900/10 items-center justify-center">
                  <Ionicons name="color-palette-outline" size={24} color="#1b4f94" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[#1b4f94] font-bold text-lg">
                    Thiết Lập Giao Diện
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Đổi nền, logo, banding
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push("/orders")}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="h-12 w-12 rounded-xl bg-blue-900/10 items-center justify-center">
                  <Ionicons name="color-palette-outline" size={24} color="#1b4f94" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[#1b4f94] font-bold text-lg">
                    Quản lý đơn hàng
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Đổi nền, logo, banding
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      {showMenu && (
        <View className="absolute inset-0 justify-end">
          {/* Overlay */}
          <Pressable
            onPress={closeMenu}
            className="absolute inset-0 bg-black/30"
          />

          {/* Bottom Sheet */}
          <Animated.View
            style={{
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            }}
            className="bg-white rounded-t-3xl px-6 pt-4 pb-8"
          >
            {/* Drag handle */}
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />

            {/* Go to user home */}
            <Pressable
              onPress={() => {
                closeMenu();
                router.replace("/Splash");
              }}
              className="flex-row items-center py-4"
            >
              <Ionicons name="home-outline" size={22} color="#1b4f94" />
              <Text className="ml-4 text-lg font-semibold text-[#1b4f94]">
                Trang chủ người dùng
              </Text>
            </Pressable>

            {/* Divider */}
            <View className="h-px bg-gray-200" />

            {/* Logout */}
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center py-4"
            >
              <Ionicons name="log-out-outline" size={22} color="#dc2626" />
              <Text className="ml-4 text-lg font-semibold text-red-600">
                Đăng xuất
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
