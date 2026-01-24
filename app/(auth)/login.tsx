import { Ionicons } from "@expo/vector-icons";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { useBrandingAssets } from "@/hooks/useBrandingAssets";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [generalError, setGeneralError] = useState("");
    const { backgroundUrl, logoUrl } = useBrandingAssets();

    const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();

    const handleLogin = async () => {
        let hasError = false;

        setEmailError("");
        setPasswordError("");
        setGeneralError("");

        if (!email) {
            setEmailError("Vui lòng nhập email");
            hasError = true;
        }

        if (!password) {
            setPasswordError("Vui lòng nhập mật khẩu");
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);

        try {
            // 1️⃣ Thực hiện đăng nhập
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setGeneralError("Email hoặc mật khẩu không chính xác");
                return;
            }

            const user = authData?.user;
            if (!user) throw new Error("No user found");

            // 2️⃣ Lấy Role từ bảng profiles (Nhờ RLS đã cài đặt, user chỉ lấy được data của chính mình)
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profileError || !profile) {
                // Trường hợp hy hữu: Auth có nhưng Profile chưa kịp tạo qua Trigger
                console.error("Profile fetch error:", profileError);
                setGeneralError("Lỗi hệ thống: Không tìm thấy hồ sơ người dùng");
                return;
            }

            // 3️⃣ Điều hướng thông minh dựa trên Role
            if (profile.role === "admin") {
                router.replace("/(admin)");
            } else {
                // Nếu có tham số redirectTo (ví dụ từ thông báo), ưu tiên nó
                if (redirectTo) {
                    router.replace(redirectTo as any);
                } else {
                    router.replace("/(tabs)");
                }
            }
        } catch (error) {
            console.error("Login process error:", error);
            setGeneralError("Đã có lỗi xảy ra, vui lòng thử lại sau");
        } finally {
            setLoading(false);
        }
    };


    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* ===== IMAGE BACKGROUND ===== */}
                {backgroundUrl && (
                    <ImageBackground
                        source={backgroundUrl}
                        resizeMode="cover"
                        className="flex-1"
                    >
                        {/* Overlay */}
                        <View className="flex-1 bg-[#082841]/10 px-6 justify-center">
                            {/* Logo */}
                            <View className="items-center">
                                {logoUrl && (
                                    <Image
                                        source={logoUrl}
                                        className="" style={{ height: 240, width: 240 }}
                                        resizeMode="contain"
                                    />
                                )}
                            </View>

                            {/* Welcome */}
                            <View className="mb-8">
                                <Text className="text-white text-3xl font-bold mb-2">
                                    Chào mừng trở lại 👋
                                </Text>
                                <Text className="text-gray-300 text-base">
                                    Let's get started! Ngày mới, cơ hội mới.
                                </Text>
                            </View>

                            {/* Email */}
                            <View className="mb-3">
                                <Text className="text-white font-medium mb-2 ml-1">
                                    Email
                                </Text>
                                <View className="flex-row items-center border border-gray-300 rounded-xl">
                                    <TextInput
                                        placeholder="yourname@gmail.com"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            setEmailError("");
                                            setGeneralError("");
                                        }}
                                        className="flex-1 px-4 py-4 text-white"
                                    />
                                    {email.length > 0 && (
                                        <Pressable
                                            onPress={() => {
                                                setEmail("");
                                                setEmailError("");
                                            }}
                                            className="p-2"
                                        >
                                            <Ionicons
                                                name="close-circle"
                                                size={20}
                                                color="rgba(255,255,255,0.4)"
                                            />
                                        </Pressable>
                                    )}
                                </View>
                                {emailError ? (
                                    <Text className="text-red-500 mt-1 text-sm ml-1">
                                        {emailError}
                                    </Text>
                                ) : null}
                            </View>

                            {/* Password */}
                            <View className="mb-3">
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-white font-medium ml-1">
                                        Mật khẩu
                                    </Text>
                                    <Text className="font-bold text-sm" style={{ color: "#1A73E8" }}>
                                        Quên mật khẩu?
                                    </Text>
                                </View>

                                <View className="flex-row items-center border border-gray-300 rounded-xl">
                                    <TextInput
                                        placeholder="Nhập mật khẩu"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            setPasswordError("");
                                            setGeneralError("");
                                        }}
                                        className="flex-1 px-4 py-4 text-white"
                                    />
                                    <Pressable
                                        onPress={() => setShowPassword(!showPassword)}
                                        className="p-2"
                                    >
                                        <Ionicons
                                            name={showPassword ? "lock-open-outline" : "lock-closed-outline"}
                                            size={22}
                                            color="rgba(255,255,255,0.6)"
                                        />

                                    </Pressable>
                                </View>

                                {passwordError ? (
                                    <Text className="text-red-500 mt-1 text-sm ml-1">
                                        {passwordError}
                                    </Text>
                                ) : null}
                            </View>

                            {generalError ? (
                                <Text className="text-red-500 text-center mb-4 font-semibold">
                                    {generalError}
                                </Text>
                            ) : null}

                            {/* Login Button */}
                            <Pressable
                                onPress={handleLogin}
                                disabled={loading}
                                className={`bg-white py-4 rounded-xl mb-6 mt-6 ${loading ? "opacity-60" : ""
                                    }`}
                            >
                                <View className="flex-row justify-center items-center">
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#082841" />
                                    ) : (
                                        <Text className="text-[#082841] font-bold text-base">
                                            Đăng Nhập
                                        </Text>
                                    )}
                                </View>
                            </Pressable>

                            {/* Divider */}
                            <View className="flex-row items-center mb-6">
                                <View className="flex-1 h-px bg-white/20" />
                                <Text className="text-white/50 px-4 text-sm">
                                    hoặc
                                </Text>
                                <View className="flex-1 h-px bg-white/20" />
                            </View>

                            {/* Register */}
                            <View className="flex-row justify-center items-center mb-6">
                                <Text className="text-gray-300 text-base">
                                    Chưa có tài khoản?{" "}
                                </Text>
                                <Link href="/(auth)/register" asChild>
                                    <Pressable>
                                        <Text className="text-white font-bold text-lg">
                                            Đăng ký
                                        </Text>
                                    </Pressable>
                                </Link>
                            </View>

                            {/* Security */}
                            <View className="bg-white/10 rounded-xl p-4">
                                <View className="flex-row items-start">
                                    <Ionicons
                                        name="shield-checkmark"
                                        size={18}
                                        color="#10b981"
                                    />
                                    <Text className="text-white/80 text-base ml-2 flex-1">
                                        Thông tin đăng nhập của bạn được bảo mật an toàn
                                        với mã hóa end-to-end.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </ImageBackground>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
