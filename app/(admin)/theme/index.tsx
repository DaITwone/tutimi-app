import { supabase } from "@/lib/supabaseClient";
import { getPublicImageUrl } from "@/lib/storage";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ThemeManager() {
  const [themes, setThemes] = useState<any[]>([]);
  const [brandings, setBrandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [bannerTheme, setBannerTheme] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<any[]>([]);

  /* ================= FETCH ================= */
  const fetchThemes = async () => {
    const { data } = await supabase
      .from("app_themes")
      .select("*")
      .order("display_order", { ascending: true });

    setThemes(data || []);
  };

  const fetchBrandings = async () => {
    const { data } = await supabase
      .from("app_brandings")
      .select("*")
      .order("display_order", { ascending: true });

    setBrandings(data || []);
  };

  const fetchBannerPreview = async (themeKey: string) => {
    const { data } = await supabase
      .from("banners")
      .select("id, image, created_at")
      .eq("theme_key", themeKey)
      .order("created_at", { ascending: true });

    setBannerPreview(data || []);
  };

  const fetchBannerSetting = async () => {
    const { data } = await supabase
      .from("app_banner_settings")
      .select("active_theme_key")
      .single();

    if (data?.active_theme_key) {
      setBannerTheme(data.active_theme_key);
      fetchBannerPreview(data.active_theme_key);
    }
  };

  useEffect(() => {
    fetchThemes();
    fetchBrandings();
    fetchBannerSetting();
  }, []);

  /* ================= ACTION ================= */
  const updateBannerTheme = async (themeKey: string) => {
    if (themeKey === bannerTheme) return;

    setLoading(true);

    await supabase
      .from("app_banner_settings")
      .update({ active_theme_key: themeKey })
      .eq("id", 1);

    setBannerTheme(themeKey);
    await fetchBannerPreview(themeKey);

    setLoading(false);
  };

  const activateTheme = async (id: string) => {
    setLoading(true);

    await supabase.from("app_themes").update({ is_active: false }).neq("id", id);

    await supabase.from("app_themes").update({ is_active: true }).eq("id", id);

    await fetchThemes();
    setLoading(false);
  };

  const activateBranding = async (id: string) => {
    setLoading(true);

    await supabase
      .from("app_brandings")
      .update({ is_active: false })
      .neq("id", id);

    await supabase
      .from("app_brandings")
      .update({ is_active: true })
      .eq("id", id);

    await fetchBrandings();
    setLoading(false);
  };

  /* ================= UI ================= */
  return (
    <View className="flex-1 bg-white">
      {/* HEADER */}
      <SafeAreaView edges={["top"]} className="px-5 pt-4 pb-4 bg-[#1C4273]">
        <Text className="text-white text-xl font-bold">THIẾT LẬP GIAO DIỆN</Text>
      </SafeAreaView>

      <ScrollView className="px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* ================= APP THEME ================= */}
        <View className="mb-3.5">
          <Text className="text-lg font-bold text-[#1c4273]">
            Giao diện App chính
          </Text>
          <View className="h-1 w-10 bg-[#1c4273] rounded-full mt-2" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {themes.map((item) => {
            const bgUrl = getPublicImageUrl(item.background_uri);

            return (
              <Pressable
                key={item.id}
                onPress={() => !item.is_active && activateTheme(item.id)}
                className={`mr-4 rounded-2xl overflow-hidden border-2 ${
                  item.is_active ? "border-green-500" : "border-gray-200"
                }`}
              >
                {bgUrl && (
                  <Image
                    source={{ uri: bgUrl }}
                    className="w-52 h-80"
                    resizeMode="cover"
                  />
                )}

                <View className="bg-white">
                  {/* Top divider */}
                  <View
                    className={`h-px ${
                      item.is_active ? "bg-green-500 h-0.5" : "bg-gray-200"
                    }`}
                  />

                  <View className="p-2">
                    <Text className="text-sm font-semibold text-[#1b4f94]">
                      {item.name}
                    </Text>

                    {item.is_active && (
                      <Text className="text-xs text-red-600 mt-0.5 italic">
                        Đang sử dụng
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ================= AUTH BRANDING ================= */}
        <View className="mt-8 mb-3.5">
          <Text className="text-lg font-bold text-[#1c4273]">
            Giao diện Đăng nhập
          </Text>
          <View className="h-1 w-10 bg-[#1c4273] rounded-full mt-2" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {brandings.map((item) => {
            const bgUrl = getPublicImageUrl(item.background_uri);
            const logoUrl = getPublicImageUrl(item.logo_uri);

            return (
              <Pressable
                key={item.id}
                onPress={() => !item.is_active && activateBranding(item.id)}
                className={`mr-4 rounded-2xl overflow-hidden border-2 ${
                  item.is_active ? "border-green-500" : "border-gray-200"
                }`}
              >
                {/* Preview login screen */}
                <View className="w-52 h-80 relative">
                  {/* Background */}
                  {bgUrl && (
                    <Image
                      source={{ uri: bgUrl }}
                      className="absolute inset-0 w-full h-full"
                      resizeMode="cover"
                    />
                  )}

                  {/* Dark overlay */}
                  <View className="absolute inset-0 bg-black/20" />

                  {/* Logo */}
                  {logoUrl && (
                    <View className="absolute inset-0 items-center justify-center">
                      <Image
                        source={{ uri: logoUrl }}
                        resizeMode="contain"
                        className="w-28 h-28"
                      />
                    </View>
                  )}
                </View>

                <View className="bg-white">
                  {/* Top divider */}
                  <View
                    className={`h-px ${
                      item.is_active ? "bg-green-500 h-0.5" : "bg-gray-200"
                    }`}
                  />

                  <View className="p-2">
                    <Text className="text-sm font-semibold text-[#1b4f94]">
                      {item.name}
                    </Text>

                    {item.is_active && (
                      <Text className="text-xs text-red-600 mt-0.5 italic">
                        Đang sử dụng
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ================= BANNER SETTINGS ================= */}
        <View className="mt-8 mb-3.5">
          <Text className="text-lg font-bold text-[#1c4273]">
            Banner Trang chủ
          </Text>
          <View className="h-1 w-10 bg-[#1c4273] rounded-full mt-2" />
        </View>

        <View className="flex-row mb-4">
          <Pressable
            onPress={() => updateBannerTheme("standard")}
            className={`mr-3 px-4 py-2 rounded-full border ${
              bannerTheme === "standard"
                ? "bg-green-600 border-green-500"
                : "border-gray-300"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                bannerTheme === "standard" ? "text-white" : "text-gray-700"
              }`}
            >
              Standard
            </Text>
          </Pressable>

          <Pressable
            onPress={() => updateBannerTheme("spring")}
            className={`px-4 py-2 rounded-full border ${
              bannerTheme === "spring"
                ? "bg-green-600 border-green-500"
                : "border-gray-300"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                bannerTheme === "spring" ? "text-white" : "text-gray-700"
              }`}
            >
              Tết
            </Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {bannerPreview.map((item) => {
            // ✅ dùng chung bucket products => gọi thẳng
            const imageUrl = getPublicImageUrl(item.image);

            return (
              <View
                key={item.id}
                className="mr-4 rounded-xl overflow-hidden border border-gray-200"
              >
                {imageUrl && (
                  <Image
                    source={{ uri: imageUrl }}
                    className="w-60 h-32"
                    resizeMode="cover"
                  />
                )}
              </View>
            );
          })}
        </ScrollView>

        {loading && (
          <View className="mt-8">
            <ActivityIndicator size="small" />
          </View>
        )}

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
