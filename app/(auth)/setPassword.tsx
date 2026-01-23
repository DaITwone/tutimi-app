import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useBrandingAssets } from "@/hooks/useBrandingAssets";

export default function SetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { backgroundUrl, logoUrl } = useBrandingAssets();

  /* ================= PASSWORD RULES ================= */
  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    match: password && confirmPassword && password === confirmPassword,
  };

  const isPasswordStrong =
    passwordRules.length &&
    passwordRules.uppercase &&
    passwordRules.lowercase &&
    passwordRules.number &&
    passwordRules.match;

  /* ================= SUBMIT ================= */
  const handleSetPassword = async () => {
    setError("");
    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!sessionData.session) {
        setError("Phiên đăng nhập không hợp lệ. Vui lòng mở lại link từ email.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        router.replace("/(tabs)");
      }, 1500);
    } catch (err) {
      setError("Có lỗi xảy ra, vui lòng thử lại.");
      setLoading(false);
    }
  };


  /* ================= UI ================= */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
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
            <View className="flex-1 px-6 justify-center">
              {/* Header */}
              <View className="items-center mb-8">
                {logoUrl && (
                  <Image
                    source={logoUrl}
                    className="w-56 h-44"
                    resizeMode="cover"
                  />
                )}

                <Text className="text-white text-3xl font-bold text-center">
                  Thiết Lập Mật Khẩu
                </Text>

                {email ? (
                  <Text className="text-white text-sm mt-2">{email}</Text>
                ) : null}
              </View>

              {/* ERROR */}
              {error ? (
                <View className="bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 mb-6 flex-row items-center">
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text className="text-red-400 ml-2 flex-1">{error}</Text>
                </View>
              ) : null}

              {/* SUCCESS */}
              {success ? (
                <View className="bg-green-500/20 border border-green-500/40 rounded-xl px-4 py-3 mb-6 flex-row items-center">
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color="#22c55e"
                  />
                  <Text className="text-green-400 ml-2 flex-1">
                    Mật khẩu đã được tạo thành công. Đang chuyển hướng…
                  </Text>
                </View>
              ) : null}

              {/* PASSWORD */}
              <View className="mb-4">
                <Text className="text-white font-medium mb-2">
                  Mật khẩu
                </Text>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (error) setError("");
                    }}
                    secureTextEntry={!showPassword}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    className="border border-gray-300 rounded-xl px-4 py-4 pr-12 text-white"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4"
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={22}
                      color="rgba(255,255,255,0.6)"
                    />
                  </Pressable>
                </View>
              </View>

              {/* CONFIRM PASSWORD */}
              <View className="mb-6">
                <Text className="text-white font-medium mb-2">
                  Xác nhận mật khẩu
                </Text>
                <View className="relative">
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      if (error) setError("");
                    }}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    className="border border-gray-300 rounded-xl px-4 py-4 pr-12 text-white"
                  />
                  <Pressable
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-4 top-4"
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                      size={22}
                      color="rgba(255,255,255,0.6)"
                    />
                  </Pressable>
                </View>
              </View>

              {/* PASSWORD RULES */}
              <View className="bg-white/20 rounded-xl p-4 mb-6">
                <Text className="text-white/90 mb-3 font-medium">
                  Yêu cầu mật khẩu:
                </Text>

                {[
                  { ok: passwordRules.length, text: "Tối thiểu 8 ký tự" },
                  { ok: passwordRules.uppercase, text: "Ít nhất 1 chữ hoa (A–Z)" },
                  { ok: passwordRules.lowercase, text: "Ít nhất 1 chữ thường (a–z)" },
                  { ok: passwordRules.number, text: "Ít nhất 1 chữ số (0–9)" },
                  { ok: passwordRules.match, text: "Mật khẩu khớp nhau" },
                ].map((rule, i) => (
                  <View key={i} className="flex-row items-center mb-2">
                    <Ionicons
                      name={rule.ok ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={rule.ok ? "#10b981" : "rgba(255,255,255,0.4)"}
                    />
                    <Text
                      className={`ml-2 text-sm ${rule.ok ? "text-green-400" : "text-white/60"
                        }`}
                    >
                      {rule.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* SUBMIT */}
              <Pressable
                onPress={handleSetPassword}
                disabled={loading || !isPasswordStrong}
                className={`bg-white py-4 rounded-xl ${loading || !isPasswordStrong ? "opacity-50" : ""
                  }`}
              >
                {loading ? (
                  <View className="flex-row justify-center items-center">
                    <ActivityIndicator color="#082841" />
                    <Text className="ml-2 font-bold text-[#082841]">
                      Đang xử lý...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-center font-bold text-[#082841]">
                    Xác nhận
                  </Text>
                )}
              </Pressable>
            </View>
          </ImageBackground>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}