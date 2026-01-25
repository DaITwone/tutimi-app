import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ImageBackground,
  ScrollView,
  Modal,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabaseClient";
import * as ImagePicker from "expo-image-picker";
import { useThemeBackground } from "@/hooks/useThemeBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalSearchParams } from "expo-router";
import { getPublicImageUrl, uploadImageToStorage } from "@/lib/storage";


type UserProfile = {
  id: string;
  email: string | null; // từ auth
  username: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  address: string | null;
};


type ToastType = "success" | "error" | "info";

export default function EditProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const { bgUrl } = useThemeBackground();
  const { user: authUser, userId, refreshUser } = useAuth();
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const { from } = useLocalSearchParams<{ from?: string }>();

  const handleBack = () => {
    if (from === "checkout") {
      router.replace("/checkout/checkout");
    } else {
      router.back();
    }
  };

  /* ================= TOAST HANDLER ================= */
  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  };

  /* ================= LOAD USER ================= */
  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, phone, avatar_url, address")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Load profile error:", error);
      return;
    }

    const profile: UserProfile = {
      ...data,
      email: authUser?.email ?? null, // ✅ lấy email từ AuthContext
    };

    setUser(profile);
    setFullName(profile.full_name || "");
    setUsername(profile.username || "");
    setPhone(profile.phone || "");
    setAddress(profile.address || "");
  }


  /* ================= AVATAR HANDLERS ================= */
  const handlePickImageFromDevice = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      showToast("Cần cấp quyền truy cập thư viện ảnh", "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setPendingAvatar(result.assets[0].uri);
      setShowAvatarModal(false);
    }
  };

  const handleUseImageUrl = async () => {
    const url = imageUrlInput.trim();

    if (!url.startsWith("http")) {
      showToast("URL không hợp lệ", "error");
      return;
    }

    setPendingAvatar(url);
    setImageUrlInput("");
    setShowAvatarModal(false);
  };


  const updateAvatar = async (avatarUrl: string) => {
    if (!user) return;

    setLoading(true);
    setShowAvatarModal(false);

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      showToast("Không thể cập nhật ảnh đại diện", "error");
      return;
    }

    await loadProfile();
    await refreshUser();
    showToast("Đã cập nhật ảnh đại diện", "success");
  };

  /* ================= UPDATE PROFILE ================= */
  async function handleSave() {
    if (!user) return;

    if (!fullName.trim()) {
      showToast("Họ tên không được để trống", "error");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        full_name: fullName.trim(),
        username: username.trim() || null,
        phone: phone.trim() || null,
        address: address.trim(),
      };

      // ✅ LOGIC MỚI: Xử lý upload ảnh nếu có thay đổi
      if (pendingAvatar) {
        const fileName = `avatar_${user.id}`;

        const uploadedPath = await uploadImageToStorage(
          pendingAvatar,
          fileName
        );

        if (!uploadedPath) {
          showToast("Lỗi khi tải ảnh lên hệ thống", "error");
          setLoading(false);
          return;
        }

        payload.avatar_url = uploadedPath;
      }

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id);

      if (error) throw error;

      await refreshUser();
      showToast("Thông tin đã được cập nhật", "success");

      setTimeout(() => {
        handleBack();
      }, 800);
    } catch (err) {
      showToast("Không thể cập nhật thông tin", "error");
    } finally {
      setLoading(false);
    }
  }


  /* ================= UI ================= */
  return (
    <>
      {bgUrl && (
        <ImageBackground
          source={{ uri: bgUrl }}
          resizeMode="cover"
          className="flex-1"
        >
          {/* Overlay */}
          <View className="absolute inset-0 bg-white/70" />

          {/* Loading Overlay */}
          {loading && (
            <View className="absolute inset-0 bg-black/30 z-50 items-center justify-center">
              <View className="bg-white rounded-3xl p-8 items-center shadow-xl">
                <ActivityIndicator size="large" color="#1F4171" />
                <Text className="text-gray-700 font-semibold mt-4">Đang xử lý...</Text>
              </View>
            </View>
          )}
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

              <SafeAreaView className="flex-1" edges={["top"]}>
                {/* ===== HEADER ===== */}
                <View className="flex-row items-center px-5 pt-4 backdrop-blur-xl">
                  <Pressable
                    onPress={handleBack}
                    className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 active:scale-95"
                  >
                    <Ionicons name="arrow-back" size={22} color="#1F4171" />
                  </Pressable>

                  <Text className="flex-1 text-center text-xl font-bold mr-10" style={{ color: "#1C4273" }}>
                    Chỉnh sửa thông tin
                  </Text>
                </View>

                <ScrollView
                  className="flex-1 px-5"
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  automaticallyAdjustKeyboardInsets={true} // iOS
                  contentContainerStyle={{ paddingBottom: 40 }}
                >
                  {/* ===== AVATAR SECTION ===== */}
                  <View className="items-center my-2">
                    <View className="relative">
                      <Image
                        source={
                          pendingAvatar
                            ? { uri: pendingAvatar }
                            : user?.avatar_url
                              ? { uri: getPublicImageUrl(user.avatar_url)! }
                              : require("../../../assets/images/avt.jpg")
                        }
                        className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                      />

                      {/* Camera button overlay */}
                      <Pressable
                        onPress={() => setShowAvatarModal(true)}
                        className="absolute bottom-0 right-0 w-10 h-10 bg-blue-900 rounded-full items-center justify-center border-4 border-white shadow-md active:scale-95"
                      >
                        <Ionicons name="camera" size={18} color="white" />
                      </Pressable>
                    </View>
                    <Text className="text-gray-500 text-sm mb-2 mt-2">
                      Nhấn để thay đổi ảnh đại diện
                    </Text>
                  </View>

                  {/* ===== FORM CARD ===== */}
                  <View className="rounded-3xl mb-6">
                    {/* Full Name */}
                    <View className="mb-5">
                      <Text className="font-bold mb-2 ml-1 text-blue-900">
                        Họ và tên *
                      </Text>
                      <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 bg-white focus:border-blue-500">
                        <Ionicons name="person-outline" size={20} color="#6B7280" />
                        <TextInput
                          value={fullName}
                          onChangeText={setFullName}
                          placeholder="Nhập họ và tên"
                          className="flex-1 py-3 px-3 text-gray-900"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>

                    {/* Username */}
                    <View className="mb-5">
                      <Text className="text-blue-900 font-bold mb-2 ml-1">
                        Username
                      </Text>
                      <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 bg-white focus:border-blue-500">
                        <Ionicons name="at-outline" size={20} color="#6B7280" />
                        <TextInput
                          value={username}
                          onChangeText={setUsername}
                          placeholder="Nhập username"
                          className="flex-1 py-3 px-3 text-gray-900"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>

                    {/* Phone */}
                    <View className="mb-5">
                      <Text className="text-blue-900 font-bold mb-2 ml-1">
                        Số điện thoại
                      </Text>
                      <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 bg-white focus:border-blue-500">
                        <Ionicons name="call-outline" size={20} color="#6B7280" />
                        <TextInput
                          value={phone}
                          onChangeText={setPhone}
                          placeholder="Nhập số điện thoại"
                          keyboardType="phone-pad"
                          className="flex-1 py-3 px-3 text-gray-900"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>

                    {/* Address */}
                    <View className="mb-5">
                      <Text className="text-blue-900 font-bold mb-2 ml-1">
                        Địa chỉ nhận hàng *
                      </Text>
                      <View className="flex-row items-start border-2 border-gray-200 rounded-xl px-4 bg-white">
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color="#6B7280"
                          style={{ marginTop: 8 }}
                        />
                        <TextInput
                          value={address}
                          onChangeText={setAddress}
                          placeholder="Nhập địa chỉ nhận hàng"
                          className="flex-1 py-3 px-3 text-gray-900"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>

                    {/* Email (disabled) */}
                    <View>
                      <Text className="text-blue-900 font-bold mb-2 ml-1">
                        Email
                      </Text>
                      <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 bg-gray-50 ">
                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                        <TextInput
                          value={user?.email || ""}
                          editable={false}
                          className="flex-1 py-3 px-3 text-gray-400"
                        />
                        <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                      </View>
                      <Text className="text-gray-400 text-xs mt-2 ml-1">
                        Email không thể thay đổi
                      </Text>
                    </View>
                  </View>

                  {/* ===== SAVE BUTTON ===== */}
                  <Pressable
                    onPress={handleSave}
                    disabled={loading}
                    className={`py-4 rounded-2xl shadow-lg ${loading ? "bg-gray-400" : "bg-blue-900 active:bg-blue-700"
                      }`}
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                      <Text className="text-center text-white font-bold text-base ml-2">
                        Lưu thay đổi
                      </Text>
                    </View>
                  </Pressable>
                </ScrollView>
              </SafeAreaView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>

          {/* ===== AVATAR MODAL ===== */}
          <Modal
            visible={showAvatarModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAvatarModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="flex-1"
            >
              <Pressable
                className="flex-1 bg-black/50 justify-end"
                onPress={() => setShowAvatarModal(false)}
              >
                <Pressable
                  className="bg-white rounded-t-3xl p-6"
                  onPress={(e) => e.stopPropagation()}
                >
                  {/* Handle bar */}
                  <View className="items-center mb-4">
                    <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
                  </View>

                  <Text className="text-xl font-bold mb-6 text-center" style={{ color: "#1C4273" }}>
                    Chọn ảnh đại diện
                  </Text>

                  {/* Option 1: Pick from device */}
                  <Pressable
                    onPress={handlePickImageFromDevice}
                    className="flex-row items-center bg-blue-50 p-4 rounded-2xl mb-4 active:bg-blue-100"
                  >
                    <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center">
                      <Ionicons name="image-outline" size={24} color="white" />
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className="text-blue-900 font-bold text-base">
                        Chọn từ thiết bị
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        Tải ảnh từ thư viện của bạn
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                  </Pressable>

                  {/* Option 2: Use URL */}
                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-3">
                      Hoặc dùng link ảnh
                    </Text>
                    <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 bg-white mb-4">
                      <Ionicons name="link-outline" size={20} color="#6B7280" />
                      <TextInput
                        value={imageUrlInput}
                        onChangeText={setImageUrlInput}
                        placeholder="https://example.com/avatar.jpg"
                        className="flex-1 py-3 px-3 text-gray-900"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                    </View>
                    <Pressable
                      onPress={handleUseImageUrl}
                      className="bg-blue-900 py-3 rounded-xl active:bg-blue-700"
                    >
                      <Text className="text-white font-bold text-center">
                        Sử dụng URL này
                      </Text>
                    </Pressable>
                  </View>

                  {/* Cancel button */}
                  <Pressable
                    onPress={() => {
                      setShowAvatarModal(false);
                      setImageUrlInput("");
                    }}
                    className="py-3 rounded-xl bg-gray-100 active:bg-gray-200"
                  >
                    <Text className="text-gray-700 font-semibold text-center">
                      Hủy
                    </Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          </Modal>

          {/* ===== TOAST NOTIFICATION ===== */}
          {toast && (
            <Animated.View
              style={{
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              }}
              className="absolute top-20 left-5 right-5 z-50"
            >
              <View
                className={`flex-row items-center p-4 rounded-2xl shadow-xl ${toast.type === "success"
                  ? "bg-green-500"
                  : toast.type === "error"
                    ? "bg-red-500"
                    : "bg-blue-500"
                  }`}
              >
                <Ionicons
                  name={
                    toast.type === "success"
                      ? "checkmark-circle"
                      : toast.type === "error"
                        ? "close-circle"
                        : "information-circle"
                  }
                  size={24}
                  color="white"
                />
                <Text className="text-white font-semibold ml-3 flex-1">
                  {toast.message}
                </Text>
              </View>
            </Animated.View>
          )}
        </ImageBackground>
      )}
    </>
  );
}