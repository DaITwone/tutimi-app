
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { View, ActivityIndicator } from "react-native";

export default function AdminLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.replace("/(tabs)");
        return;
      }

      setChecking(false);
    };

    checkAdmin();
  }, []);

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false }}/>;
}
