import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    Alert,
    ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeBackground } from "@/hooks/useThemeBackground";

/* ================= TYPES ================= */

type Product = {
    id: string;
    name: string;
    price: number;
    sale_price: number | null;
    image: string | null;
    stats: string | null;
};

type FavoriteItem = {
    id: string;
    product_id: string;
    products: Product | null; // ⚠️ Có thể là object hoặc null
};

/* ================= SCREEN ================= */

export default function FavoritesScreen() {
    const { userId } = useAuth();

    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { bgUrl } = useThemeBackground();

    useEffect(() => {
        if (userId) {
            loadFavorites();
        } else {
            setFavorites([]);
            setLoading(false);
        }
    }, [userId]);

    /* ===== LOAD FAVORITES ===== */
    const loadFavorites = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("favorites")
            .select(`
                id,
                product_id,
                products (
                    id,
                    name,
                    price,
                    sale_price,
                    image, stats
                )
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Load favorites error:", error);
            Alert.alert("Lỗi", "Không thể tải danh sách yêu thích");
            setLoading(false);
            return;
        }

        console.log("Favorites data:", JSON.stringify(data, null, 2));
        setFavorites(data || []);
        setLoading(false);
    };

    /* ===== REMOVE FAVORITE ===== */
    const handleRemove = async (favoriteId: string) => {
        const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("id", favoriteId);

        if (error) {
            Alert.alert("Lỗi", "Không thể xoá sản phẩm yêu thích");
            return;
        }

        setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    };



    /* ===== CHƯA ĐĂNG NHẬP ===== */
    if (!userId && !loading) {
        return (
            <>
                {bgUrl && (
                    <ImageBackground
                        source={{ uri: bgUrl }}
                        resizeMode="cover"
                        className="flex-1"
                    >
                        <View className="absolute inset-0 bg-white/60" />

                        <SafeAreaView className="flex-1 items-center justify-center px-6">
                            <Ionicons name="heart-outline" size={64} color="#9ca3af" />

                            <Text className="text-lg font-semibold mt-4 text-gray-700">
                                Bạn chưa đăng nhập
                            </Text>

                            <Text className="text-gray-500 text-center mt-2">
                                Đăng nhập để xem danh sách sản phẩm yêu thích
                            </Text>

                            <Pressable
                                onPress={() => router.push("/login")}
                                className="mt-6 px-6 py-3 bg-blue-600 rounded-full"
                            >
                                <Text className="text-white font-semibold">Đăng nhập</Text>
                            </Pressable>
                        </SafeAreaView>
                    </ImageBackground>
                )}
            </>
        );
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
                    <View className="absolute inset-0 bg-white/60" />

                    <SafeAreaView edges={["top"]} className="flex-1">
                        {/* HEADER */}
                        <View className="flex-row items-center px-5 pt-4 pb-3">
                            <Pressable
                                onPress={() => router.back()}
                                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                            >
                                <Ionicons name="arrow-back" size={22} color="#1F4171" />
                            </Pressable>

                            <Text className="ml-3 text-2xl font-bold text-blue-900">
                                Yêu thích
                            </Text>
                        </View>

                        {/* CONTENT */}
                        <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
                            {loading && (
                                <View className="items-center py-12">
                                    <Text className="text-gray-400">Đang tải...</Text>
                                </View>
                            )}

                            {!loading && favorites.length === 0 && (
                                <View className="items-center py-20">
                                    <Ionicons name="heart-outline" size={48} color="#9ca3af" />
                                    <Text className="mt-4 text-gray-600">
                                        Chưa có sản phẩm yêu thích
                                    </Text>
                                </View>
                            )}

                            {!loading &&
                                favorites.map((item) => {
                                    // ⚠️ Kiểm tra products tồn tại
                                    if (!item.products) {
                                        console.warn("Product not found for favorite:", item.id);
                                        return null;
                                    }

                                    const p = item.products;
                                    const imageUrl =
                                        p.image &&
                                        (p.image.startsWith("file://") || p.image.startsWith("http")
                                            ? p.image
                                            : supabase.storage
                                                .from("products")
                                                .getPublicUrl(p.image).data.publicUrl);

                                    return (
                                        <View
                                            key={item.id}
                                            className="bg-white/85 rounded-2xl p-4 mb-4 shadow-sm"
                                        >
                                            <View className="flex-row">
                                                {/* IMAGE */}

                                                {imageUrl && (
                                                    <Image
                                                        source={{ uri: imageUrl }}
                                                        className="w-20 h-20 rounded-xl"
                                                        resizeMode="cover"
                                                    />
                                                )}


                                                {/* INFO */}
                                                <View className="ml-3 flex-1">
                                                    <Text className="font-semibold text-blue-900">
                                                        {p.name}
                                                    </Text>
                                                    <Text className="text-sm text-gray-500">
                                                        {p.stats}
                                                    </Text>

                                                    <View className="flex-row items-center mt-1">
                                                        {p.sale_price ? (
                                                            <>
                                                                <Text className="text-red-500 font-bold mr-2">
                                                                    {p.sale_price.toLocaleString()}₫
                                                                </Text>
                                                                <Text className="text-gray-400 line-through text-xs">
                                                                    {p.price.toLocaleString()}₫
                                                                </Text>
                                                            </>
                                                        ) : (
                                                            <Text className="font-bold text-blue-700">
                                                                {p.price.toLocaleString()}₫
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>

                                                {/* REMOVE */}
                                                <Pressable
                                                    onPress={() => handleRemove(item.id)}
                                                    className="p-2"
                                                >
                                                    <Ionicons name="heart" size={22} color="#ef4444" />
                                                </Pressable>
                                            </View>
                                        </View>
                                    );
                                })}
                        </ScrollView>
                    </SafeAreaView>
                </ImageBackground>
            )}
        </>
    );
}