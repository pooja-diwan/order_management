import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cartApi } from "./utils/api";

const CartContext = createContext(null);

export function CartProvider({ children, userId }) {
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!userId) { setCartItems([]); return; }
    setCartLoading(true);
    try {
      const data = await cartApi.get(userId);
      setCartItems(data.items || []);
    } catch {
      setCartItems([]);
    } finally {
      setCartLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    const data = await cartApi.add(productId, quantity);
    setCartItems(data.items || []);
    setCartOpen(true);
    return data;
  }, []);

  const updateItem = useCallback(async (itemId, quantity) => {
    const data = await cartApi.update(itemId, quantity);
    setCartItems(data.items || []);
    return data;
  }, []);

  const removeItem = useCallback(async (itemId) => {
    const data = await cartApi.remove(itemId);
    setCartItems(data.items || []);
    return data;
  }, []);

  const clearCart = useCallback(async () => {
    if (!userId) return;
    await cartApi.clear(userId);
    setCartItems([]);
  }, [userId]);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, i) => sum + (i.product?.price || 0) * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems, cartCount, cartTotal, cartLoading,
        cartOpen, setCartOpen,
        addToCart, updateItem, removeItem, clearCart, fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
