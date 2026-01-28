import { useEffect, useState } from "react";
import { Image, ImageSourcePropType } from "react-native";
import { supabase } from "@/lib/supabaseClient";

/* ===============================
   IMAGE HELPER (SUPABASE)
================================ */
const getPublicImageUrl = (path?: string | null) => {
  if (!path) return null;
  return supabase.storage
    .from("products")
    .getPublicUrl(path).data.publicUrl;
};

/* ===============================
   BRANDING ASSETS HOOK
================================ */
export function useBrandingAssets() {
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchBranding = async () => {
      try {
        const { data, error } = await supabase
          .from("app_brandings")         
          .select("background_uri, logo_uri") 
          .eq("is_active", true)         
          .single();                     

        if (!error && data && mounted) {
          setBackgroundUri(data.background_uri ?? null);
          setLogoUri(data.logo_uri ?? null);
        }
      } catch (e) {
        // Có lỗi xảy ra hoặc không tìm thấy data
        console.error("Fetch branding error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchBranding();

    return () => {
      mounted = false;
    };
  }, []);

  /* ===============================
     RESOLVE IMAGE SOURCE (REMOTE ONLY)
  ================================ */
  // Nếu có URI từ DB thì trả về object { uri }, nếu không thì trả về null
  const backgroundUrl: ImageSourcePropType | null = backgroundUri
    ? { uri: getPublicImageUrl(backgroundUri) as string }
    : null;

  const logoUrl: ImageSourcePropType | null = logoUri
    ? { uri: getPublicImageUrl(logoUri) as string }
    : null;

  /* ===============================
     PREFETCH REMOTE IMAGES
  ================================ */
  useEffect(() => {
    const url = getPublicImageUrl(backgroundUri);
    if (url) Image.prefetch(url);
  }, [backgroundUri]);

  useEffect(() => {
    const url = getPublicImageUrl(logoUri);
    if (url) Image.prefetch(url);
  }, [logoUri]);

  return {
    backgroundUrl,
    logoUrl,
    loading,
  };
}