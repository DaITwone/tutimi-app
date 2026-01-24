import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const [countdown, setCountdown] = useState(0);

  const { backgroundUrl, logoUrl } = useBrandingAssets();

  /* ================= COUNTDOWN ================= */
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /* ================= CHECK EMAIL ================= */
  useEffect(() => {
    if (!email) {
      setError("Không tìm thấy email. Vui lòng đăng ký lại.");
      setTimeout(() => {
        router.replace("/(auth)/register");
      }, 1500);
      return;
    }
    inputRefs.current[0]?.focus();
  }, [email]);

  /* ================= OTP INPUT ================= */
  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    if (error) setError("");

    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /* ================= VERIFY OTP ================= */
  const handleVerifyOtp = async () => {
    const token = otp.join("");

    if (token.length !== 6) {
      setError("Vui lòng nhập đủ 6 số");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });

      if (error) {
        setError("Mã OTP không hợp lệ hoặc đã hết hạn");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        for (let i = 0; i < 3; i++) {
          const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (data) break;
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      router.replace({
        pathname: "/(auth)/setPassword",
        params: { email },
      });
    } catch {
      setError("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RESEND OTP ================= */
  const handleResendOtp = async () => {
    if (!email) return;

    setResendLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36),
      });

      if (error && !error.message.includes("User already registered")) {
        setError(error.message);
        return;
      }

      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Không thể gửi lại mã OTP.");
    } finally {
      setResendLoading(false);
    }
  };


  /* ================= UI ================= */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {backgroundUrl && (
          <ImageBackground
            source={backgroundUrl}
            resizeMode="cover"
            className="flex-1"
          >
            {/* overlay để chữ dễ đọc */}
            <View className="flex-1 px-6 justify-center">

              {/* Logo */}
              {logoUrl && (
                <Image
                  source={logoUrl}
                  className="self-center"
                  style={{ height: 180, width: 180 }}
                  resizeMode="cover"
                />
              )}

              <Text className="text-white text-2xl font-bold text-center mb-2">
                Xác thực OTP
              </Text>
              <Text className="text-white text-center mb-12">
                {email}
              </Text>

              {error ? (
                <Text className="text-white text-center mb-6">
                  ⚠️ {error}
                </Text>
              ) : null}

              {/* OTP INPUT */}
              <View className="flex-row justify-center gap-2 mb-6">
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => {
                      inputRefs.current[i] = r;
                    }}
                    value={digit}
                    editable={!loading}
                    onChangeText={(v) => handleOtpChange(v, i)}
                    onKeyPress={({ nativeEvent }) => {
                      if (
                        nativeEvent.key === "Backspace" &&
                        otp[i] === "" &&
                        i > 0
                      ) {
                        const next = [...otp];
                        next[i - 1] = "";
                        setOtp(next);
                        inputRefs.current[i - 1]?.focus();
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    className={`w-12 h-14 rounded-xl text-white text-center text-xl
                  ${error ? "border-2 border-red-500" : "border border-white"}
                `}
                  />
                ))}
              </View>

              {/* VERIFY BUTTON */}
              <Pressable
                onPress={handleVerifyOtp}
                disabled={loading}
                className="bg-white mb-4 py-3 rounded-xl self-center"
                style={{ width: 290 }}
              >
                <View className="flex-row items-center justify-center">
                  {loading ? (
                    <>
                      <ActivityIndicator color="#082841" />
                      <Text className="text-[#082841] font-bold ml-2">
                        Đang xác thực...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#082841"
                      />
                      <Text className="ml-2 font-semibold text-[#082841]">
                        Xác thực
                      </Text>
                    </>
                  )}
                </View>
              </Pressable>

              {/* RESEND */}
              <View className="items-center mt-4">
                <Text className="text-gray-300 mb-2">
                  Không nhận được mã?
                </Text>

                <Pressable
                  onPress={handleResendOtp}
                  disabled={resendLoading || countdown > 0}
                  className={`flex-row items-center ${resendLoading || countdown > 0 ? "opacity-50" : ""
                    }`}
                >
                  {resendLoading ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text className="text-white font-semibold ml-2">
                        Đang gửi...
                      </Text>
                    </>
                  ) : countdown > 0 ? (
                    <>
                      <Ionicons name="time-outline" size={18} color="#fff" />
                      <Text className="text-white font-semibold ml-2">
                        Gửi lại sau {countdown}s
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="refresh" size={18} color="#fff" />
                      <Text className="text-white font-bold ml-2 underline">
                        Gửi lại mã OTP
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* HELPER */}
              <View className="mt-8 bg-white/20 rounded-xl p-4">
                <View className="flex-row items-start">
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#FACC15"
                  />
                  <Text
                    className="text-white text-base ml-2 flex-1"
                    style={{ textAlign: "justify" }}
                  >
                    Mã OTP có hiệu lực trong 60 giây. Vui lòng kiểm tra thư mục spam nếu không thấy email.
                  </Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        )}
      </ScrollView>
    </KeyboardAvoidingView >
  );
}
