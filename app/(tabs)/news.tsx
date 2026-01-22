import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeBackground } from "@/hooks/useThemeBackground";
import { getPublicImageUrl } from "@/lib/storage";

type News = {
  type: string;
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  created_at: string;
};

export default function NewsScreen() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const { bgUrl } = useThemeBackground();

  useEffect(() => {
    fetchNews();
  }, []);

  async function fetchNews() {
    const { data, error } = await supabase
      .from("news")
      .select("id, title, description, image, type, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Fetch news error:", error);
    } else {
      setNews(data ?? []);
    }

    setLoading(false);
  }

  return (
    <View className="flex-1 bg-[#0E2A47]">
      <SafeAreaView edges={["top"]} className="bg-[#0E2A47]">
        <View className="h-12 flex-row items-center justify-center px-4">
          <Text className="text-white text-xl font-extralight">
            TIN TỨC - ƯU ĐÃI
          </Text>
        </View>
      </SafeAreaView>

      {/* Nội dung chính */}
      <View className="flex-1 bg-white pt-3">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0E2A47" />
            <Text className="mt-3 text-gray-500">
              Đang tải tin tức...
            </Text>
          </View>
        ) : (
          <>
            {bgUrl && (
              <ImageBackground
                source={{ uri: bgUrl }}
                resizeMode="cover"
                className="flex-1"
              >
                {/* Overlay làm dịu nền */}
                <View className="absolute inset-0 bg-white/80" />

                <ScrollView showsVerticalScrollIndicator={false} className="px-5 pt-4">
                  {news.map((item) => {
                    const imageUrl = getPublicImageUrl(item.image);

                    return (
                      <Pressable
                        key={item.id}
                        className="mb-6"
                        onPress={() =>
                          router.push({
                            pathname: "/new/[id]",
                            params: { id: item.id },
                          })
                        }
                      >
                        {imageUrl && (
                          <Image
                            source={{ uri: imageUrl }}
                            className="w-full rounded-lg"
                            style={{ height: 480 }}
                            resizeMode="cover"
                          />
                        )}

                        <View className="mt-3">
                          <View
                            className={`self-start px-3 py-1 rounded-md ${item.type === "Tin Tức"
                                ? "bg-blue-500"
                                : "bg-yellow-400"
                              }`}
                          >
                            <Text className="text-xs font-semibold text-white">
                              {item.type === "Tin Tức" ? "TIN TỨC" : "ƯU ĐÃI"}
                            </Text>
                          </View>

                          <Text className="mt-1.5 text-xl font-bold text-blue-900">
                            {item.title}
                          </Text>

                          {item.description && (
                            <Text className="text-gray-600 leading-5">
                              {item.description}
                            </Text>
                          )}

                          <Text className="text-xs text-gray-400 mt-1">
                            {formatDate(item.created_at)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}


                  {news.length === 0 && (
                    <View className="items-center mt-20">
                      <Text className="text-gray-500">
                        Hiện chưa có ưu đãi nào
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </ImageBackground>
            )}
          </>

        )}
      </View>
    </View>
  );
}

/* ===== HELPER ===== */

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
