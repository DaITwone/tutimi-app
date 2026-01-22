import { useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    ScrollView,
    ActivityIndicator,
    Pressable,
    ImageBackground,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabaseClient";
import { Linking } from "react-native";
import { useThemeBackground } from "@/hooks/useThemeBackground";
import { getPublicImageUrl } from "@/lib/storage";


type NewsDetail = {
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    image: string | null;
    type: string;
    hashtag: string | null;
    created_at: string;
};

export default function NewsDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [news, setNews] = useState<NewsDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const { bgUrl } = useThemeBackground();


    useEffect(() => {
        if (id) fetchNewsDetail();
    }, [id]);

    async function fetchNewsDetail() {
        const { data, error } = await supabase
            .from("news")
            .select(
                "id, title, description, content, image, type, hashtag, created_at"
            )
            .eq("id", id)
            .single();

        if (error) {
            console.error("❌ Fetch news detail error:", error);
        } else {
            setNews(data);
        }

        setLoading(false);
    }

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#0E2A47" />
            </View>
        );
    }

    if (!news) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <Text className="text-gray-500">Không tìm thấy bài viết</Text>
            </View>
        );
    }

    const imageUrl = getPublicImageUrl(news.image);

    return (
        <View className="flex-1 bg-white">
            {/* HEADER */}
            <SafeAreaView edges={["top"]} className="bg-[#0E2A47]">
                <View className="h-12 flex-row items-center justify-center px-4">

                    {/* BACK BUTTON */}
                    <Pressable
                        onPress={() => router.back()}
                        className="absolute left-4 flex-row items-center"
                    >
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </Pressable>

                    {/* TITLE */}
                    <Text
                        className="text-white text-xl font-extralight"
                        numberOfLines={1}
                    >
                        {news.title}
                    </Text>

                </View>
            </SafeAreaView>

            {bgUrl && (
                <ImageBackground
                    source={{ uri: bgUrl }}
                    resizeMode="cover"
                    className="flex-1"
                >
                    {/* Overlay làm dịu nền */}
                    <View className="absolute inset-0 bg-white/90" />
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* IMAGE */}
                        {imageUrl && (
                            <Image
                                source={{ uri: imageUrl }}
                                className="w-full"
                                style={{ height: 500 }}
                                resizeMode="cover"
                            />
                        )}

                        {/* CONTENT */}
                        <View className="px-5 pt-5 pb-10">
                            {/* TYPE BADGE */}
                            <View
                                className={`self-start px-3 py-1 rounded-md ${news.type === "Tin Tức"
                                    ? "bg-blue-500"
                                    : "bg-yellow-400"
                                    }`}
                            >
                                <Text className="text-xs font-semibold text-white">
                                    {news.type === "Tin Tức" ? "TIN TỨC" : "ƯU ĐÃI"}
                                </Text>
                            </View>

                            {/* TITLE */}
                            <Text className="mt-3 text-2xl font-semibold text-blue-900">
                                {news.title}
                            </Text>

                            {/* DATE */}
                            <Text className="text-xs text-gray-400 mt-1">
                                {formatDate(news.created_at)}
                            </Text>

                            {/* DESCRIPTION */}
                            {news.description && (
                                <Text className="mt-3 font-semibold text-lg text-gray-700 leading-6">
                                    {news.description}
                                </Text>
                            )}

                            {/* CONTENT */}
                            {news.content && (
                                <Text
                                    className="mt-4 text-lg font-light text-gray-800 leading-8"
                                    style={{ textAlign: "justify" }}
                                >
                                    {renderContentWithLink(news.content)}
                                </Text>
                            )}

                            {/* HASHTAG */}
                            {news.hashtag && (
                                <Text className="mt-2 text-base font-semibold text-blue-500">
                                    {news.hashtag}
                                </Text>
                            )}
                        </View>
                    </ScrollView>
                </ImageBackground>
            )}
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

function renderContentWithLink(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <Text
                    key={index}
                    className="text-blue-600 underline"
                    onPress={() => Linking.openURL(part)}
                >
                    {part}
                </Text>
            );
        }

        return <Text key={index}>{part}</Text>;
    });
}
