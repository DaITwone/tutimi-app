import { Stack, usePathname } from "expo-router";
import "../global.css";
import { View } from "react-native";
import { CartProvider } from "../contexts/CartContext";
import { FloatingCart } from "../components/FloatingCart";
import { useCartSummary } from "../hooks/useCartSummary";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationsContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function AppContent() {
  const { userId, loading } = useAuth();
  const pathname = usePathname();

  const { totalQty, totalPrice, refresh } = useCartSummary(userId);

  const FLOATING_CART_ROUTES = ["/", "/menu"];

  const shouldShowFloatingCart =
    totalQty > 0 &&
    (
      FLOATING_CART_ROUTES.includes(pathname) ||
      pathname.startsWith("/product/")
    );

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

        {shouldShowFloatingCart && (
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
