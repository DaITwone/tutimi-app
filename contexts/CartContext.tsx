import { createContext, useContext, useState } from "react";
import { Voucher } from "@/services/voucherService";

type CartContextType = {
  refreshCart: () => void;

  // 🔽 NEW
  selectedVoucher: Voucher | null;
  setSelectedVoucher: (v: Voucher | null) => void;

  discountAmount: number;
  setDiscountAmount: (v: number) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({
  children,
  refreshCart,
}: {
  children: React.ReactNode;
  refreshCart: () => void;
}) => {
  const [selectedVoucher, setSelectedVoucher] =
    useState<Voucher | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  return (
    <CartContext.Provider
      value={{
        refreshCart,
        selectedVoucher,
        setSelectedVoucher,
        discountAmount,
        setDiscountAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
};
