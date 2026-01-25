import { createContext, useContext, useState } from "react";
import { Voucher } from "@/services/voucherService";

type PaymentMethod = "cod" | "momo" | "bank";

type Bank = {
  key: string;
  name: string;
  image: any; // vì bạn dùng require(...)
};

type CartContextType = {
  refreshCart: () => void;

  selectedVoucher: Voucher | null;
  setSelectedVoucher: (v: Voucher | null) => void;

  discountAmount: number;
  setDiscountAmount: (v: number) => void;

  // ✅ NEW: payment state
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;

  selectedBank: Bank | null;
  setSelectedBank: (b: Bank | null) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({
  children,
  refreshCart,
}: {
  children: React.ReactNode;
  refreshCart: () => void;
}) => {
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // ✅ NEW
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  return (
    <CartContext.Provider
      value={{
        refreshCart,
        selectedVoucher,
        setSelectedVoucher,
        discountAmount,
        setDiscountAmount,

        // ✅ NEW
        paymentMethod,
        setPaymentMethod,
        selectedBank,
        setSelectedBank,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
