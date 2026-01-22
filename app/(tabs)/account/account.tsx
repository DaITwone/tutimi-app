import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabaseClient";
import { useThemeBackground } from "@/hooks/useThemeBackground";
import { getPublicImageUrl } from "@/lib/storage";

type User = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role?: string; // 👈 thêm
};


export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const { bgUrl } = useThemeBackground();
  const isAdmin = user?.role === "admin";

  // Sử dụng useFocusEffect thay vì useEffect để reload mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [])
  );

  async function fetchUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      if (user !== null) setUser(null);
      return;
    }

    const { data } = await supabase
      .from("users")
      .select("id, username, full_name, avatar_url, email, role")
      .eq("id", session.user.id)
      .single();

    if (data) setUser(data);
  }

  const logout = async () => {
    setShowMenu(false);
    setUser(null); // clear UI ngay
    await supabase.auth.signOut();
  };

  const avatarUrl = getPublicImageUrl(user?.avatar_url);

  return (
    <>
      {bgUrl && (
        <ImageBackground
          source={{ uri: bgUrl }}
          resizeMode="cover"
          className="flex-1"
        >
          {/* ===== OVERLAY ===== */}
          <View className="absolute inset-0 bg-white/30" />
          <ScrollView showsVerticalScrollIndicator={false}>
            <SafeAreaView edges={["top"]} className="px-5 pt-6">
              {/* ===== PROFILE CARD ===== */}
              <View className="bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl p-6 mb-6 shadow-lg">
                {user ? (
                  /* GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP */
                  <View className="flex-row items-center">
                    {/* Avatar + online dot */}
                    <View className="relative">
                      {avatarUrl ? (
                        <Image
                          source={{ uri: avatarUrl }}
                          className="w-16 h-16 rounded-full"
                        />
                      ) : (
                        <Image
                          source={require("../../../assets/images/avt.jpg")}
                          className="w-16 h-16 rounded-full"
                        />
                      )}

                      {/* Online dot */}
                      <View className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
                    </View>

                    {/* User info */}
                    <View className="ml-4 flex-1">
                      <Text className="text-blue-900 text-xl font-bold">
                        {user?.username}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        {user?.email}
                      </Text>
                    </View>

                    {/* Settings */}
                    <Pressable
                      onPress={() => setShowMenu(true)}
                      className="w-11 h-11 rounded-full items-center justify-center shadow-md active:scale-95"
                    >
                      <Ionicons name="settings-outline" size={24} color="#1C4273" />
                    </Pressable>
                  </View>

                ) : (
                  /* GIAO DIỆN KHI CHƯA ĐĂNG NHẬP */
                  <View className="flex-row items-center">
                    {/* Avatar với overlay gradient */}
                    <View className="relative">
                      <Image
                        source={require("../../../assets/images/avt.jpg")}
                        className="w-20 h-20 rounded-full"
                      />
                      {/* Gradient overlay cho avatar mờ */}
                      <View className="absolute inset-0 rounded-full bg-black/30" />
                      {/* Offline indicator */}
                      <View className="absolute bottom-0 right-0 w-6 h-6 bg-gray-400 rounded-full border-4 border-white" />
                    </View>

                    {/* Text & Button */}
                    <View className="ml-4 flex-1">
                      <Text className="text-xl font-bold italic" style={{ color: "#1C4273" }}>
                        Chào mừng bạn! 👋
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1 mb-3 italic">
                        Đăng nhập để mở khóa tất cả tính năng
                      </Text>

                      <Pressable
                        onPress={() => router.push("/(auth)/login")}
                        className="py-3 px-5 rounded-xl self-center shadow-lg active:scale-95 flex-row items-center" style={{ backgroundColor: "#1C4273" }}
                      >
                        <Ionicons name="log-in-outline" size={18} color="white" />
                        <Text className="text-white font-bold text-sm ml-2">
                          ĐĂNG NHẬP / ĐĂNG KÝ
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              {/* ===== MENU CARD ===== */}
              <View className="bg-white/90 backdrop-blur-xl rounded-3xl px-4 py-3 mb-6 shadow-lg">
                <AccountItem
                  icon="receipt-outline"
                  label="Đơn hàng của tôi"
                  onPress={() => router.push("/")}
                />
                <AccountItem
                  icon="ticket-outline"
                  label="Kho voucher"
                  onPress={() => router.push("/(tabs)/account/voucher")}
                />
                <AccountItem
                  icon="location-outline"
                  label="Địa chỉ giao hàng"
                  onPress={() => router.push("/")}
                />
                <AccountItem
                  icon="heart-outline"
                  label="Yêu thích"
                  onPress={() => router.push("/(tabs)/account/favorites")}
                />
              </View>

              {/* ===== SETTINGS ===== */}
              <View className="bg-white/90 backdrop-blur-xl rounded-3xl px-4 py-3 mb-6 shadow-lg">
                <AccountItem
                  icon="person-outline"
                  label="Thông tin tài khoản"
                  onPress={() => router.push("/")}
                />
                <AccountItem
                  icon="lock-closed-outline"
                  label="Đổi mật khẩu"
                  onPress={() => router.push("/")}
                />
              </View>
            </SafeAreaView>
          </ScrollView>
          <Modal
            visible={showMenu}
            transparent
            animationType="slide"
            onRequestClose={() => setShowMenu(false)}
          >
            {/* overlay */}
            <Pressable
              className="flex-1 bg-black/40 justify-end"
              onPress={() => setShowMenu(false)}
            >
              {/* card */}
              <Pressable
                className=" bg-white rounded-3xl p-5"
                onPress={() => { }}
              >
                {/* Handle bar */}
                <View className="items-center mb-4">
                  <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </View>
                {/* header */}
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-semibold text-blue-900">
                    Tài khoản
                  </Text>
                </View>

                {isAdmin && (
                  <>
                    <Pressable
                      onPress={() => {
                        setShowMenu(false);
                        router.push("/(admin)");
                      }}
                      className="flex-row items-center py-3"
                    >
                      <Ionicons name="speedometer-outline" size={20} color="#1C4273" />
                      <Text className="ml-3 text-gray-800 font-medium text-lg">
                        Admin Dashboard
                      </Text>
                    </Pressable>

                    <View className="h-px bg-gray-100 my-2" />
                  </>
                )}

                {/* actions */}
                <Pressable
                  onPress={() => {
                    setShowMenu(false);
                    router.push("/account/edit-profile");
                  }}
                  className="flex-row items-center py-3"
                >
                  <Ionicons name="person-outline" size={20} color="#1F4171" />
                  <Text className="ml-3 text-gray-800 font-medium text-lg">
                    Chỉnh sửa thông tin cá nhân
                  </Text>
                </Pressable>

                <View className="h-px bg-gray-100 my-2" />

                <Pressable
                  onPress={async () => {
                    setShowMenu(false);
                    await logout();
                  }}
                  className="flex-row items-center py-3"
                >
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text className="ml-3 text-red-500 font-medium text-lg">
                    Đăng xuất
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </ImageBackground>
      )}
    </>
  );
}

/* ===== ITEM COMPONENT ===== */
function AccountItem({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 border-b border-gray-100 last:border-b-0"
    >
      <Ionicons name={icon} size={22} color="#8A94A6" />
      <Text className="ml-3 flex-1 font-semibold" style={{ color: "#1C4273" }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </Pressable>
  );
}
