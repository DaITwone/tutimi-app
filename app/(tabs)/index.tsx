import { useNotifications } from "@/contexts/NotificationsContext";
import { useBrandingAssets } from "@/hooks/useBrandingAssets";
import { useThemeBackground } from "@/hooks/useThemeBackground";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Dimensions,
    Image,
    ImageBackground,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { getPublicImageUrl } from "../../lib/storage";


const { width } = Dimensions.get("window");

/* ================= TYPES ================= */
type HomeNews = {
    id: string;
    title: string;
    image: string | null;
    type: string;
};

type Banner = {
    id: string;
    image: string; // path trong bucket banners
    order: number;
};

type BestSellerProduct = {
    id: string;
    name: string;
    price: number;
    sale_price: number | null;
    image: string | null;
};

/* ================= SCREEN ================= */
export default function HomeScreen() {
    const scrollRef = useRef<ScrollView>(null);
    const { user, isLoggedIn, loading } = useAuth();
    const [index, setIndex] = useState(0);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [homeNews, setHomeNews] = useState<HomeNews[]>([]);
    const { unreadCount } = useNotifications();
    const { bgUrl } = useThemeBackground();
    const { backgroundUrl, logoUrl } = useBrandingAssets();
    const [bestSellers, setBestSellers] = useState<BestSellerProduct[]>([]);

    useEffect(() => {
        fetchBestSellers();
    }, []);

    async function fetchBestSellers() {
        const { data } = await supabase
            .from("products")
            .select("id, name, price, sale_price, image")
            .eq("is_best_seller", true)
            .order("created_at", { ascending: false })
            .limit(10);

        if (data) setBestSellers(data);
    }

    useEffect(() => {
        fetchBanners();
    }, []);

    async function fetchBanners() {
        // 1. Lấy theme banner đang active
        const { data: setting } = await supabase
            .from("app_banner_settings")
            .select("active_theme_key")
            .single();

        if (!setting) return;

        // 2. Lấy banner theo theme
        const { data } = await supabase
            .from("banners")
            .select("id, image, order")
            .eq("theme_key", setting.active_theme_key)
            .order("order", { ascending: true });

        if (data) setBanners(data);
    }


    /* ================= GREETING ================= */
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Chào buổi sáng✨";
        if (hour >= 12 && hour < 18) return "Chào buổi chiều✨";
        return "Chào buổi tối✨";
    };

    /* ================= NEWS ================= */
    useEffect(() => {
        fetchHomeNews();
    }, []);

    async function fetchHomeNews() {
        const { data } = await supabase
            .from("news")
            .select("id, title, image, type")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(4);

        if (data) setHomeNews(data);
    }

    /* ================= AUTO SLIDE BANNER ================= */
    useEffect(() => {
        if (banners.length === 0) return;

        const timer = setInterval(() => {
            setIndex((prev) => {
                const nextIndex = (prev + 1) % banners.length;
                scrollRef.current?.scrollTo({
                    x: nextIndex * width,
                    animated: true,
                });
                return nextIndex;
            });
        }, 3000);

        return () => clearInterval(timer);
    }, [banners.length]);

    const avatarUrl = getPublicImageUrl(user?.avatar_url);

    /* ================= RENDER ================= */
    return (
        <>
            {backgroundUrl && (
                <ImageBackground
                    source={backgroundUrl}
                    resizeMode="cover"
                    className="flex-1"
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* ===== HEADER ===== */}
                        <SafeAreaView edges={["top"]} className="px-5 py-6">
                            {logoUrl && (
                                <Image
                                    source={logoUrl}
                                    className="self-center mb-3"
                                    style={{ height: 140, width: 210 }}
                                />
                            )}

                            {!loading && isLoggedIn && user ? (
                                <View className="bg-white/15 py-4 px-5 rounded-2xl border border-white/20">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center flex-1">
                                            <Pressable
                                                onPress={() =>
                                                    router.push("/(tabs)/account/account")
                                                }
                                            >
                                                <Image
                                                    source={
                                                        avatarUrl
                                                            ? { uri: avatarUrl }
                                                            : require("../../assets/images/avt.jpg")
                                                    }
                                                    className="w-16 h-16 rounded-full"
                                                />

                                            </Pressable>

                                            <View className="ml-3 flex-1">
                                                <Text className="text-white/70 text-sm">
                                                    {getGreeting()}
                                                </Text>
                                                <Text
                                                    className="text-white font-semibold text-lg"
                                                    numberOfLines={1}
                                                >
                                                    {user.username}
                                                </Text>
                                            </View>
                                        </View>

                                        <Pressable
                                            onPress={() => router.push("/notification/notifications")} // Điều hướng đến trang thông báo
                                            className="ml-3 relative"
                                        >
                                            <Image
                                                source={require("../../assets/images/logo1.png")}
                                                className="w-14 h-10"
                                            />
                                            {unreadCount > 0 && (
                                                <View className="absolute -top-1 right-1.5 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-1 border-white">
                                                    <Text className="text-white text-[11px] font-bold text-center">
                                                        {unreadCount > 9 ? "9+" : unreadCount}
                                                    </Text>
                                                </View>
                                            )}
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                !loading && (
                                    <Pressable
                                        onPress={() => router.push("/(auth)/login")}
                                        className="bg-white/90 py-4 rounded-xl"
                                    >
                                        <Text className="text-center text-[#0E2A47] font-medium">
                                            ĐĂNG NHẬP / ĐĂNG KÝ
                                        </Text>
                                    </Pressable>
                                )
                            )}
                        </SafeAreaView>

                        {/* ===== CONTENT ===== */}
                        <View className="bg-white rounded-t-xl overflow-hidden">
                            {bgUrl && (
                                <ImageBackground
                                    source={{ uri: bgUrl }}
                                    resizeMode="cover"
                                >
                                    <View className="pt-6 pb-20 bg-white/75">
                                        {/* ===== BANNER ===== */}
                                        <View className="relative">
                                            <ScrollView
                                                ref={scrollRef}
                                                horizontal
                                                pagingEnabled
                                                showsHorizontalScrollIndicator={false}
                                                onMomentumScrollEnd={(e) =>
                                                    setIndex(
                                                        Math.round(
                                                            e.nativeEvent.contentOffset.x / width
                                                        )
                                                    )
                                                }
                                            >
                                                {banners.map((item) => {
                                                    const uri = getPublicImageUrl(item.image);

                                                    return uri ? (
                                                        <Image
                                                            key={item.id}
                                                            source={{ uri }}
                                                            style={{ width, height: 180 }}
                                                            resizeMode="cover"
                                                            className="rounded-xl px-5 mb-4"
                                                        />
                                                    ) : null;
                                                })}

                                            </ScrollView>

                                            <View className="absolute bottom-8 left-0 right-0 flex-row justify-center">
                                                {banners.map((_, i) => (
                                                    <View
                                                        key={i}
                                                        className={`mx-1 h-2 w-2 rounded-full ${i === index ? "bg-white" : "bg-white/40"
                                                            }`}
                                                    />
                                                ))}
                                            </View>
                                        </View>

                                        {/* ===== BEST SELLER ===== */}
                                        <View className="px-5 mt-1">
                                            <Text className="text-lg font-bold text-blue-900">
                                                Best Seller
                                            </Text>

                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {bestSellers.map((item) => {
                                                    const imageUrl = getPublicImageUrl(item.image);

                                                    return (
                                                        <Pressable
                                                            key={item.id}
                                                            className="mr-4 w-40 shadow-md"
                                                            onPress={() =>
                                                                router.push({
                                                                    pathname: "/product/[id]",
                                                                    params: { id: item.id },

                                                                })
                                                            }
                                                        >
                                                            {imageUrl && (
                                                                <Image
                                                                    source={{ uri: imageUrl }}
                                                                    className="w-full h-44 rounded-2xl"
                                                                />
                                                            )}

                                                            <Text className="mt-2 mb-1 font-semibold text-[#1b4f94]">
                                                                {item.name}
                                                            </Text>

                                                            <Text className="text-red-500 font-bold">
                                                                {item.sale_price
                                                                    ? `${item.sale_price.toLocaleString()}đ`
                                                                    : `${item.price.toLocaleString()}đ`}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>

                                        {/* ===== NEWS ===== */}
                                        <View className="px-5 mt-8">
                                            <Pressable onPress={() => router.push("/news")}>
                                                <Text className="text-lg font-bold text-blue-900">
                                                    Tin tức – Ưu đãi
                                                </Text>
                                            </Pressable>

                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {homeNews.map((item) => {
                                                    const imageUrl = getPublicImageUrl(item.image);

                                                    return (
                                                        <Pressable
                                                            key={item.id}
                                                            className="mr-4 w-64"
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
                                                                    className="w-full h-80 rounded-2xl"
                                                                />
                                                            )}

                                                            <View className="mt-2">
                                                                <View
                                                                    className={`self-start px-2 py-0.5 rounded ${item.type === "Tin Tức"
                                                                        ? "bg-blue-500"
                                                                        : "bg-yellow-400"
                                                                        }`}
                                                                >
                                                                    <Text className="text-[10px] font-semibold text-white">
                                                                        {item.type === "Tin Tức" ? "TIN TỨC" : "ƯU ĐÃI"}
                                                                    </Text>
                                                                </View>

                                                                <Text
                                                                    className="mt-1 text-base font-semibold text-[#1b4f94]"
                                                                    numberOfLines={2}
                                                                >
                                                                    {item.title}
                                                                </Text>
                                                            </View>
                                                        </Pressable>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                    </View>
                                </ImageBackground>
                            )}
                        </View>
                    </ScrollView>
                </ImageBackground>
            )}
        </>
    );
}
