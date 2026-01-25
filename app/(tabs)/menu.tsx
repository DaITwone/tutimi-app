import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  SectionList,
  ActivityIndicator,
  Pressable,
  ImageBackground,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import { fetchMenu, MenuSection } from "../../services/menuService";
import { getPublicImageUrl } from "@/lib/storage";

/* ===============================
   CATEGORY PILL (ANIMATED)
================================ */
function CategoryPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: active ? 1.08 : 1,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [active]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        className={`px-4 py-2 mr-2 rounded-full ${active ? "bg-[#1F4171]" : "bg-gray-200"
          }`}
      >
        <Text
          className={`text-sm ${active ? "text-white font-bold" : "text-gray-700"
            }`}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/* ===============================
   MAIN SCREEN
================================ */
export default function MenuScreen() {
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [filteredSections, setFilteredSections] = useState<MenuSection[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [themeBg, setThemeBg] = useState<string | null>(null);
  const bgUrl = getPublicImageUrl(themeBg);

  useEffect(() => {
    let mounted = true;

    supabase
      .from("app_themes")
      .select("background_uri")
      .eq("is_active", true)
      .single()
      .then(({ data, error }) => {
        if (!error && mounted && data?.background_uri) {
          setThemeBg(data.background_uri);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* ===============================
     FETCH MENU
  ================================ */
  useEffect(() => {
    let mounted = true;

    fetchMenu()
      .then((data) => {
        if (mounted) {
          setSections(data);
          setFilteredSections(data);
        }
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  /* ===============================
     CHANGE CATEGORY
  ================================ */
  const onChangeCategory = (category: string) => {
    setSelectedCategory(category);

    if (category === "all") {
      setFilteredSections(sections);
      return;
    }

    const filtered = sections.filter(
      (section) => section.title === category
    );

    setFilteredSections(filtered);
  };

  /* ===============================
     LOADING
  ================================ */
  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1F4171" />
        <Text className="mt-3 text-gray-500">Đang tải thực đơn...</Text>
      </SafeAreaView>
    );
  }

  /* ===============================
     UI
  ================================ */
  return (
    <>
      {bgUrl && (
        <ImageBackground
          source={{ uri: bgUrl }}
          resizeMode="cover"
          className="flex-1"
        >
          <View className="flex-1 bg-white/85">
            <SafeAreaView edges={["top"]} className="bg-transparent">
              {/* ===== PAGE HEADER (Non-sticky) ===== */}
              <View className="px-4 pb-3">
                <Text className="text-2xl font-bold text-[#1F4171]">
                  Thực đơn
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Chọn món bạn yêu thích ☕
                </Text>
              </View>

              {/* ===== STICKY CATEGORY BAR ===== */}
              <View className="shadow-sm">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="px-4 py-3"
                >
                  <CategoryPill
                    label="Tất cả"
                    active={selectedCategory === "all"}
                    onPress={() => onChangeCategory("all")}
                  />

                  {sections.map((section) => (
                    <CategoryPill
                      key={section.title}
                      label={section.title}
                      active={selectedCategory === section.title}
                      onPress={() => onChangeCategory(section.title)}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* ===== MENU LIST ===== */}
              <SectionList
                sections={filteredSections}
                keyExtractor={(item) => item.id}
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}

                /* ===== SECTION HEADER ===== */
                renderSectionHeader={({ section }) => (
                  <View className="px-4 pt-6 pb-2 mb-2">
                    <Text className="text-gray-500 font-semibold">
                      ✨{section.title}✨
                    </Text>
                  </View>
                )}

                /* ===== ITEM ===== */
                renderItem={({ item }) => {
                  const finalPrice = item.sale_price ?? item.price;
                  const hasSale = item.sale_price && item.sale_price < item.price;
                  const imageUrl = getPublicImageUrl(item.image);

                  return (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/product/[id]",
                          params: { id: item.id },
                        })
                      }
                      className="flex-row px-4 mb-5"
                    >
                      {/* IMAGE */}
                      {imageUrl && (
                        <Image
                          source={{ uri: imageUrl }}
                          className="w-20 h-20 rounded-xl mr-3"
                          resizeMode="cover"
                        />
                      )}

                      {/* INFO */}
                      <View className="flex-1">
                        <Text
                          className="font-semibold text-base text-[#1F4171]"
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>

                        {item.stats && (
                          <Text className="text-gray-400 text-xs mt-1">
                            {item.stats}
                          </Text>
                        )}

                        <View className="flex-row items-center mt-2">
                          {hasSale && (
                            <Text className="text-gray-400 line-through mr-2 text-sm">
                              {item.price.toLocaleString("vi-VN")}đ
                            </Text>
                          )}
                          <Text className="text-red-500 font-bold text-base">
                            {finalPrice.toLocaleString("vi-VN")}đ
                          </Text>
                        </View>
                      </View>

                      {/* ADD */}
                      <View className="w-8 h-8 bg-[#1F4171] rounded-md items-center justify-center">
                        <Text className="text-white text-xl font-bold">+</Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </SafeAreaView>
          </View>
        </ImageBackground>
      )}
    </>
  );
}