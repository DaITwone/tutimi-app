import { useLocalSearchParams, usePathname } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Image, Text, View, Pressable, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/contexts/CartContext";
import { useThemeBackground } from "@/hooks/useThemeBackground";

type Category = {
    id: string;
    title: string;
    sizes: string[] | null;
};

type Product = {
    id: string;
    name: string;
    stats: string | null;
    price: number;
    sale_price: number | null;
    image: string | null;
    categories: Category | null;
};

type Topping = {
    id: string;
    name: string;
    price: number;
};

const getPublicImageUrl = (path?: string | null) => {
    if (!path) return null;

    return supabase.storage
        .from("products")
        .getPublicUrl(path).data.publicUrl;
};

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [toppings, setToppings] = useState<Topping[]>([]);
    const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const pathname = usePathname();
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const { refreshCart } = useCart();
    const [sugar, setSugar] = useState<"0%" | "50%" | "100%">("100%");
    const [ice, setIce] = useState<"0%" | "50%" | "100%">("100%");
    const [note, setNote] = useState("");
    const { bgUrl } = useThemeBackground();


    // Ref để scroll đến ô ghi chú
    const scrollViewRef = useRef<ScrollView>(null);
    const noteInputRef = useRef<TextInput>(null);

    const increaseQty = () => setQuantity((q) => q + 1);

    const decreaseQty = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

    const handleAddToCart = async () => {
        if (!userId || !product) {
            setShowAuthModal(true);
            return;
        }

        setAddingToCart(true);

        const { error } = await supabase.from("cart_items").insert({
            user_id: userId,
            product_id: product.id,
            size: selectedSize,
            quantity,
            base_price: finalPrice,
            topping_total: toppingTotal,
            total_price: totalPrice,
            note: note || null,
            sugar_level: sugar,
            ice_level: ice,
            toppings: selectedToppings.map((t) => ({
                id: t.id,
                name: t.name,
                price: t.price,
            })),
        });

        setAddingToCart(false);

        if (error) {
            console.error("❌ Add to cart error:", error);
            alert("Có lỗi xảy ra, thử lại");
            return;
        }

        // ✅ REFRESH CART
        refreshCart();

        // ✅ RESET TOÀN BỘ TUỲ CHỌN
        setQuantity(1);
        setSugar("100%");
        setIce("100%");
        setSelectedToppings([]);
        setNote("");

        if (product.categories?.sizes?.length) {
            setSelectedSize(product.categories.sizes[0]);
        }

        // ✅ TOAST VẪN HIỆN
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 1500);
    };


    useEffect(() => {
        const loadToppings = async () => {
            const { data: category } = await supabase
                .from("categories")
                .select("id")
                .eq("title", "Topping")
                .single();

            if (!category) return;

            const { data } = await supabase
                .from("products")
                .select("id, name, price")
                .eq("category_id", category.id);

            setToppings(data || []);
        };

        loadToppings();
    }, []);

    const toggleTopping = (topping: Topping) => {
        setSelectedToppings((prev) => {
            const exists = prev.find((t) => t.id === topping.id);
            if (exists) {
                return prev.filter((t) => t.id !== topping.id);
            }
            return [...prev, topping];
        });
    };

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
        });
    }, []);

    useEffect(() => {
        if (product?.categories?.sizes?.length) {
            setSelectedSize(product.categories.sizes[0]);
        }
    }, [product]);

    const checkFavorite = async (uid: string) => {
        const { data, error } = await supabase
            .from("favorites")
            .select("id")
            .eq("user_id", uid)
            .eq("product_id", id)
            .maybeSingle();

        if (error) {
            console.error("Check favorite error:", error);
            return;
        }

        setIsFavorite(!!data);
    };


    useEffect(() => {
        if (userId && id) {
            checkFavorite(userId);
        }
    }, [userId, id]);

    const toggleFavorite = async () => {
        if (!userId) {
            setShowAuthModal(true);
            return;
        }

        // Optimistic update
        setIsFavorite((prev) => !prev);

        if (isFavorite) {
            const { error } = await supabase
                .from("favorites")
                .delete()
                .eq("user_id", userId)
                .eq("product_id", id);

            if (error) {
                setIsFavorite(true); // rollback
            }
        } else {
            const { error } = await supabase.from("favorites").insert({
                user_id: userId,
                product_id: id,
            });

            if (error) {
                setIsFavorite(false); // rollback
            }
        }
    };

    useEffect(() => {
        if (!id) return;

        const loadProduct = async () => {
            try {
                const { data, error } = await supabase
                    .from("products")
                    .select(`
                        *,
                        categories (
                        id,
                        title,
                        sizes
                        )
                    `)
                    .eq("id", id)
                    .single();

                if (error) {
                    console.error("❌ Load product error:", error);
                    return;
                }

                setProduct(data);
            } catch (err) {
                console.error("❌ Unexpected error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [id]);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" />
            </SafeAreaView>
        );
    }

    if (!product) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white">
                <Text>Không tìm thấy sản phẩm</Text>
            </SafeAreaView>
        );
    }

    const BASE_UPSIZE_PRICE = 5000;
    const basePrice = product.sale_price ?? product.price;
    const sizeIndex =
        selectedSize && product.categories?.sizes
            ? product.categories.sizes.indexOf(selectedSize)
            : 0;
    const sizeExtraPrice = sizeIndex > 0 ? sizeIndex * BASE_UPSIZE_PRICE : 0;
    const finalPrice = basePrice + sizeExtraPrice;
    const hasSale = product.sale_price && product.sale_price < product.price;
    const toppingTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);
    const totalPrice = (finalPrice + toppingTotal) * quantity;
    const productImageUrl =
        product.image?.startsWith("file://") || product.image?.startsWith("http")
            ? product.image
            : getPublicImageUrl(product.image);


    return (
        <>
            {bgUrl && (
                <ImageBackground source={{ uri: bgUrl }}
                    resizeMode="cover"
                    className="flex-1">
                    <View className="flex-1 bg-white/90">
                        <KeyboardAvoidingView
                            className="flex-1"
                            behavior={Platform.OS === "ios" ? "padding" : undefined}
                            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
                        >
                            <ScrollView
                                ref={scrollViewRef}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 120 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View className="relative">
                                    <Image
                                        source={{
                                            uri: productImageUrl || "https://via.placeholder.com/300",
                                        }}
                                        className="w-full relative"
                                        resizeMode="cover"
                                        style={{ height: 420 }}
                                    />


                                    <Pressable
                                        onPress={() => router.back()}
                                        className="absolute top-14 right-3 bg-white/90 rounded-full p-2"
                                        hitSlop={10}
                                    >
                                        <Ionicons name="close" size={22} color="#1F4171" />
                                    </Pressable>
                                    <Pressable
                                        onPress={toggleFavorite}
                                        className="absolute bottom-3 right-3 bg-white/90 rounded-full p-2"
                                    >
                                        <Ionicons
                                            name={isFavorite ? "heart" : "heart-outline"}
                                            size={22}
                                            color={isFavorite ? "red" : "#1F4171"}
                                        />
                                    </Pressable>
                                </View>

                                <View className="p-4 mb-2">
                                    <Text className="text-xl font-bold text-[#1F4171]">
                                        {product.name}
                                    </Text>

                                    {product.stats && (
                                        <Text className="text-gray-500 mt-2">{product.stats}</Text>
                                    )}

                                    <View className="flex-row items-center mt-4">
                                        {hasSale && sizeIndex === 0 && (
                                            <Text className="text-gray-400 line-through mr-3 text-base">
                                                {product.price.toLocaleString("vi-VN")}đ
                                            </Text>
                                        )}

                                        <Text className="text-red-500 font-bold text-xl">
                                            {finalPrice.toLocaleString("vi-VN")}đ
                                        </Text>

                                        {sizeExtraPrice > 0 && (
                                            <Text className="ml-2 text-sm text-gray-500">
                                                (+{sizeExtraPrice.toLocaleString("vi-VN")}đ)
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {product.categories?.sizes && product.categories.sizes.length > 0 && (
                                    <View className="px-4 flex-row justify-between items-center">
                                        <View>
                                            <Text className="text-[#1F4171] font-semibold mb-2">
                                                Chọn size
                                            </Text>

                                            <View className="flex-row">
                                                {product.categories.sizes.map((size) => {
                                                    const active = selectedSize === size;

                                                    return (
                                                        <Pressable
                                                            key={size}
                                                            onPress={() => setSelectedSize(size)}
                                                            className={`px-4 py-2 mr-3 rounded-full border ${active
                                                                ? "bg-[#1F4171] border-[#1F4171]"
                                                                : "border-gray-300"
                                                                }`}
                                                        >
                                                            <Text
                                                                className={`font-semibold ${active ? "text-white" : "text-gray-700"
                                                                    }`}
                                                            >
                                                                {size}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                        <View className="">
                                            <Text className="text-[#1F4171] font-semibold mb-2 mt-2">
                                                Số lượng
                                            </Text>

                                            <View className="flex-row items-center">
                                                <Pressable
                                                    onPress={decreaseQty}
                                                    className="w-10 h-10 rounded-full border border-gray-300 items-center justify-center"
                                                >
                                                    <Ionicons name="remove" size={20} color="#1F4171" />
                                                </Pressable>

                                                <Text className="mx-6 text-lg font-bold text-[#1F4171]">
                                                    {quantity}
                                                </Text>

                                                <Pressable
                                                    onPress={increaseQty}
                                                    className="w-10 h-10 rounded-full bg-[#1F4171] items-center justify-center"
                                                >
                                                    <Ionicons name="add" size={20} color="white" />
                                                </Pressable>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* SUGAR & ICE */}
                                {(["Lượng đường", "Lượng đá"] as const).map((label, idx) => {
                                    const value = idx === 0 ? sugar : ice;
                                    const setValue = idx === 0 ? setSugar : setIce;

                                    return (
                                        <View key={label} className="px-4 mt-4">
                                            <Text className="font-semibold text-[#1F4171] mb-2">
                                                {label}
                                            </Text>
                                            <View className="flex-row mb-2">
                                                {["0%", "50%", "100%"].map((v) => (
                                                    <Pressable
                                                        key={v}
                                                        onPress={() => setValue(v as any)}
                                                        className={`px-4 py-2 mr-3 rounded-full border ${value === v
                                                            ? "bg-[#1F4171] border-[#1F4171]"
                                                            : "border-gray-300"
                                                            }`}
                                                    >
                                                        <Text
                                                            className={`font-semibold ${value === v ? "text-white" : "text-gray-700"
                                                                }`}
                                                        >
                                                            {v}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })}

                                {toppings.length > 0 && (
                                    <View className="p-4 -mb-4 mt-4">
                                        <Text className="text-[#1F4171] font-semibold">
                                            Chọn topping
                                        </Text>

                                        {toppings.map((topping) => {
                                            const active = selectedToppings.some(
                                                (t) => t.id === topping.id
                                            );

                                            return (
                                                <Pressable
                                                    key={topping.id}
                                                    onPress={() => toggleTopping(topping)}
                                                    className="flex-row items-center justify-between py-5 border-b border-gray-100"
                                                >
                                                    <View className="flex-row items-center">
                                                        <Ionicons
                                                            name={active ? "checkbox" : "square-outline"}
                                                            size={26}
                                                            color={active ? "#1F4171" : "#999"}
                                                        />
                                                        <Text className="ml-3 text-base font-semibold text-gray-500">
                                                            {topping.name}
                                                        </Text>
                                                    </View>

                                                    <Text className="text-gray-600">
                                                        {topping.price.toLocaleString("vi-VN")}đ
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* NOTE - Thêm onFocus để scroll */}
                                <View className="px-4 mt-2 py-4 mb-4">
                                    <Text className="font-semibold text-[#1F4171] mb-2">
                                        Ghi chú cho món
                                    </Text>
                                    <TextInput
                                        ref={noteInputRef}
                                        placeholder="Đá riêng, topping riêng, không ống hút..."
                                        value={note}
                                        onChangeText={setNote}
                                        multiline
                                        numberOfLines={3}
                                        className="border border-gray-300 rounded-xl px-4 py-3 text-gray-700"
                                        style={{ textAlignVertical: 'top', minHeight: 80 }}
                                        onFocus={() => {
                                            // Scroll đến cuối khi focus vào ô ghi chú
                                            setTimeout(() => {
                                                scrollViewRef.current?.scrollToEnd({ animated: true });
                                            }, 100);
                                        }}
                                    />
                                </View>
                                {/* Footer cố định */}
                                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-8">
                                    <View className="flex-row items-center justify-between">
                                        <View>
                                            <Text className="text-gray-500 text-base">
                                                Tổng thanh toán
                                            </Text>
                                            <Text className="text-red-500 font-bold text-xl">
                                                {totalPrice.toLocaleString("vi-VN")}đ
                                            </Text>
                                        </View>

                                        <Pressable
                                            onPress={handleAddToCart}
                                            disabled={addingToCart}
                                            className={`px-6 py-4 rounded-2xl flex-row items-center ${addingToCart ? "bg-gray-400" : "bg-[#1F4171]"
                                                }`}
                                        >
                                            {addingToCart ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <>
                                                    <Ionicons name="cart" size={20} color="white" />
                                                    <Text className="text-white font-bold ml-2">
                                                        Thêm giỏ hàng
                                                    </Text>
                                                </>
                                            )}
                                        </Pressable>
                                    </View>
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>

                        <Modal visible={showAuthModal} transparent animationType="fade">
                            <View className="flex-1 bg-black/40 items-center justify-center">
                                <View className="bg-white w-[85%] rounded-2xl p-5">
                                    <Text className="text-lg font-bold text-[#1F4171] text-center">
                                        Thông báo
                                    </Text>

                                    <Text className="text-gray-600 text-center mt-3">
                                        Vui lòng đăng nhập!
                                    </Text>

                                    <View className="flex-row mt-6">
                                        <Pressable
                                            onPress={() => setShowAuthModal(false)}
                                            className="flex-1 mr-2 py-3 rounded-xl border border-gray-300"
                                        >
                                            <Text className="text-center text-gray-600 font-semibold">
                                                Huỷ
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => {
                                                setShowAuthModal(false);
                                                router.replace({
                                                    pathname: "/login",
                                                    params: { redirectTo: pathname },
                                                });
                                            }}
                                            className="flex-1 ml-2 py-3 rounded-xl bg-[#1F4171]"
                                        >
                                            <Text className="text-center text-white font-semibold">
                                                Đăng nhập
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        </Modal>

                        <Modal visible={showSuccessToast} transparent animationType="fade">
                            <View className="flex-1 justify-end items-end pb-24 m-4">
                                <View className="bg-green-500 px-6 py-4 rounded-2xl flex-row items-center">
                                    <Ionicons name="checkmark-circle" size={22} color="white" />
                                    <Text className="text-white font-semibold ml-2">
                                        Đã thêm vào giỏ hàng
                                    </Text>
                                </View>
                            </View>
                        </Modal>
                    </View>
                </ImageBackground>
            )}
        </>
    );
}