// lib/storage.ts
import { supabase } from "./supabaseClient";

/**
 * Lấy public URL từ Supabase Storage
 * @param path đường dẫn file trong bucket (vd: products/abc.jpg hoặc abc.jpg)
 */
export function getPublicImageUrl(path?: string | null) {
    if (!path) return null;

    // Nếu DB chỉ lưu tên file thì dùng trực tiếp
    // Nếu có lưu kèm folder thì vẫn OK
    const { data } = supabase.storage
        .from("products")
        .getPublicUrl(path);

    return data.publicUrl;
}
