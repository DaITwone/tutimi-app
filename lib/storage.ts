import { supabase } from "./supabaseClient";
import * as FileSystem from "expo-file-system/legacy";

export function getPublicImageUrl(path?: string | null) {
    if (!path) return null;

    const { data } = supabase.storage
        .from("products")
        .getPublicUrl(path);

    return data.publicUrl;
}

export async function uploadImageToStorage(
    source: string,
    fileName: string
): Promise<string | null> {
    try {
        let base64: string;

        // Ảnh từ URL
        if (source.startsWith("http")) {
            const res = await fetch(source);
            const blob = await res.blob();
            base64 = await blobToBase64(blob);
        }
        // Ảnh local (ImagePicker)
        else {
            base64 = await FileSystem.readAsStringAsync(source, {
                encoding: "base64",
            });
        }

        const filePath = `${fileName}.png`;

        const { error } = await supabase.storage
            .from("products")
            .upload(filePath, decode(base64), {
                contentType: "image/png",
                upsert: true,
            });

        if (error) throw error;

        return filePath;
    } catch (err) {
        console.error("Upload image error:", err);
        return null;
    }
}

/* ===== helpers ===== */
function decode(base64: string) {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(",")[1]);
        };
        reader.readAsDataURL(blob);
    });
}

export async function deleteImageFromStorage(path?: string | null) {
    if (!path) return;

    const { error } = await supabase.storage
        .from("products")
        .remove([path]);

    if (error) {
        console.error("Delete image error:", error);
    }
}
