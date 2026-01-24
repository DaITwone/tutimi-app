//services/voucherService.ts
import { supabase } from "../lib/supabaseClient";

export type Voucher = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_value: number | null;
  for_new_user: boolean;
  start_hour: number | null;
  end_hour: number | null;
};

/* ================= CHECK USER IS NEW ================= */
export const isNewUser = async (userId: string): Promise<boolean> => {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "cancelled"); // ✅ chỉ cần có đơn != cancelled là không phải new user

  if (error) {
    console.error("isNewUser error:", error.message);
    return false; // hoặc true tuỳ bạn muốn fallback an toàn kiểu nào
  }

  return (count ?? 0) === 0;
};


/* ================= CHECK TIME VOUCHER ================= */
const isVoucherValidByTime = (voucher: Voucher): boolean => {
  if (voucher.start_hour == null || voucher.end_hour == null) {
    return true;
  }

  const currentHour = new Date().getHours(); // 0 - 23

  return (
    currentHour >= voucher.start_hour &&
    currentHour < voucher.end_hour
  );
};


/* ================= LOAD AVAILABLE VOUCHERS ================= */
export const loadAvailableVouchers = async (
  userId: string,
  cartTotal: number
): Promise<Voucher[]> => {
  const { data: vouchers } = await supabase
    .from("vouchers")
    .select("*")
    .eq("is_active", true);

  if (!vouchers) return [];

  const isNew = await isNewUser(userId);

  return vouchers.filter((v) => {
    if (v.for_new_user && !isNew) return false;
    if (v.min_order_value && cartTotal < v.min_order_value) return false;
    if (!isVoucherValidByTime(v)) return false;
    return true;
  });
};

/* ================= CALCULATE DISCOUNT ================= */
export const calculateDiscount = (
  voucher: Voucher,
  cartTotal: number
): number => {
  if (voucher.discount_type === "percent") {
    return Math.floor((cartTotal * voucher.discount_value) / 100);
  }
  return voucher.discount_value;
};

