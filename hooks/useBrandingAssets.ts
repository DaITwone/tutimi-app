import { useEffect, useState } from "react";
import { Image, ImageSourcePropType } from "react-native";
import { supabase } from "@/lib/supabaseClient";

/* ===============================
   LOCAL FALLBACK ASSETS
================================ */
const LOCAL_BACKGROUND = require("@/assets/images/bg-local.png");
const LOCAL_LOGO = require("@/assets/images/logo-local.png");

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
        // DB chết, ignore
      } finally {
        mounted && setLoading(false);
      }
    };

    fetchBranding();

    return () => {
      mounted = false;
    };
  }, []);

  /* ===============================
     RESOLVE IMAGE SOURCE
  ================================ */
  const backgroundUrl: ImageSourcePropType =
    backgroundUri
      ? { uri: getPublicImageUrl(backgroundUri) }
      : LOCAL_BACKGROUND;

  const logoUrl: ImageSourcePropType =
    logoUri
      ? { uri: getPublicImageUrl(logoUri) }
      : LOCAL_LOGO;

  /* ===============================
     PREFETCH REMOTE IMAGES ONLY
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
