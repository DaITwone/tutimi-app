import { Link, router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    ImageBackground
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useBrandingAssets } from "@/hooks/useBrandingAssets";

export default function RegisterScreen() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { backgroundUrl, logoUrl } = useBrandingAssets();

    const handleRegister = async () => {
        setError("");

        if (!email) {
            setError("Vui lòng nhập email");
            return;
        }

        // Validate email format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            setError("Email không hợp lệ");
            return;
        }

        setLoading(true);

        try {
            // Gửi Magic Link
            const { data, error: otpError } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: true, // Tạo user mới nếu chưa tồn tại
                }
            });

            if (otpError) {
                console.error("Supabase OTP Error:", otpError);
                setError(otpError.message);
                return;
            }

            router.push({
                pathname: "/(auth)/verifyOtp",
                params: {
                    email,
                    isRegistration: "true",
                },
            });

        } catch (error: any) {
            setError(error.message || "Đã có lỗi xảy ra");
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
                {backgroundUrl && (
                    <ImageBackground
                        source={backgroundUrl}
                        resizeMode="cover"
                        className="flex-1"
                    >
                        {/* overlay để chữ dễ đọc */}
                        <View className="flex-1 px-6 justify-center bg-[#082841]/10">
                            {/* Logo */}
                            {logoUrl && (
                                <Image
                                    source={logoUrl}
                                    className="self-center mb-4"
                                    style={{ height: 240, width: 240 }}
                                    resizeMode="contain"
                                />
                            )}

                            <Text className="text-white text-2xl font-normal mb-2">
                                Chào mừng bạn 👋
                            </Text>
                            <Text className="text-gray-400 mb-10">
                                Chúng tôi sẽ gửi mã xác thực qua email
                            </Text>

                            {/* Email Input with Button */}
                            <View className="mb-8">
                                <View className="flex-row items-center border border-gray-300 rounded-xl overflow-hidden">
                                    <TextInput
                                        placeholder="yourname@gmail.com"
                                        placeholderTextColor="rgba(255,255,255,0.5)"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            setError(""); // Clear error khi người dùng nhập
                                        }}
                                        className="flex-1 py-3 px-4 text-white"
                                        editable={!loading}
                                    />
                                    <Pressable
                                        onPress={handleRegister}
                                        disabled={loading}
                                        className={`bg-white px-6 py-3 m-1 rounded-lg ${loading ? "opacity-60" : ""}`}
                                    >
                                        <Text
                                            className="font-semibold"
                                            style={{ color: "#082841" }}
                                        >
                                            {loading ? "..." : "Gửi OTP"}
                                        </Text>
                                    </Pressable>
                                </View>

                                {/* Error Message */}
                                {error ? (
                                    <View className="flex-row items-center mt-8 rounded-lg py-2">
                                        <Ionicons name="alert-circle" size={20} color="#ef4444" />
                                        <Text className="text-red-400 ml-2 text-base flex-1">{error}</Text>
                                    </View>
                                ) : null}

                                {/* Loading Indicator */}
                                {loading && (
                                    <View className="flex-row items-center justify-center mt-8 bg-white/10 rounded-lg px-4 py-3">
                                        <ActivityIndicator size="small" color="#ffffff" />
                                        <Text className="text-white ml-3 font-medium">
                                            Đang xử lý...
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Divider */}
                            <View className="flex-row items-center mb-6">
                                <View className="flex-1 h-px bg-white/20" />
                                <Text className="text-white/50 px-4 text-sm">hoặc</Text>
                                <View className="flex-1 h-px bg-white/20" />
                            </View>

                            {/* Login link */}
                            <Text className="text-center text-gray-400">
                                Đã có tài khoản?{" "}
                                <Link
                                    href="/(auth)/login"
                                    className="text-gray-200 font-semibold text-lg"
                                >
                                    Đăng nhập
                                </Link>
                            </Text>

                            {/* Privacy Notice */}
                            <View className="mt-8 bg-white/15 rounded-xl p-4">
                                <View className="flex-row">
                                    <Ionicons name="shield-checkmark" size={18} color="#10b981" />
                                    <Text className="text-white/80 text-base ml-2 flex-1">
                                        Bằng việc tiếp tục, đồng ý với Điều khoản sử dụng và Chính sách bảo mật của chúng tôi.
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