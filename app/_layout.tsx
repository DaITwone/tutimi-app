import { Stack, usePathname } from "expo-router";
import "../global.css";
import { View } from "react-native";
import { CartProvider } from "../contexts/CartContext";
import { FloatingCart } from "../components/FloatingCart";
import { useCartSummary } from "../hooks/useCartSummary";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationsContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState } from "react";

function AppContent() {
  const { userId, loading } = useAuth();
  const pathname = usePathname();

  const { totalQty, totalPrice, refresh } = useCartSummary(userId);
  const [showFloatingCart, setShowFloatingCart] = useState(false);

  const FLOATING_CART_ROUTES = ["/", "/menu"];

  const shouldShowFloatingCartRaw =
    totalQty > 0 &&
    (
      FLOATING_CART_ROUTES.includes(pathname) ||
      pathname.startsWith("/product/")
    );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (shouldShowFloatingCartRaw) {
      timer = setTimeout(() => {
        setShowFloatingCart(true);
      }, 3000);
    } else {
      setShowFloatingCart(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [shouldShowFloatingCartRaw]);


  if (loading) return null;

  return (
    <CartProvider refreshCart={refresh}>
      <View className="flex-1">
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="cart/cart" />
        </Stack>

        {showFloatingCart && (
          <FloatingCart
            totalQty={totalQty}
            totalPrice={totalPrice}
          />
        )}
      </View>
    </CartProvider>
  );
}


export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </GestureHandlerRootView >
  );
}
