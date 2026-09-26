import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCart();
      const { items, cart_count, subtotal } = res.data || {};
      setCart(items || []);
      setCartCount(cart_count || 0);
      setCartTotal(subtotal || 0);
    } catch (err) {
      if (err.status === 401) {
        setCart([]);
        setCartCount(0);
        setCartTotal(0);
      } else {
        console.error('Failed to fetch cart from server:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (item, quantity = 1) => {
    try {
      // Extract correct food item ID (handles both FoodItem and CartItem objects or ID string)
      const foodItemId = typeof item === 'string' ? item : (item.food_item_id || item.id);
      const res = await api.addToCart(foodItemId, quantity);
      const { items, cart_count, subtotal } = res.data || {};
      setCart(items || []);
      setCartCount(cart_count || 0);
      setCartTotal(subtotal || 0);
    } catch (err) {
      if (err.status === 401) {
        alert('Please sign in to add items to your cart.');
      } else {
        alert(err.message || 'Failed to add item to cart');
      }
    }
  };

  const removeFromCart = async (target) => {
    try {
      // Extract target ID string if passed an item object
      const targetId = typeof target === 'string' ? target : (target?.food_item_id || target?.id);
      
      // Find item in cart matching either cart_item_id or food_item_id
      const cartItem = cart.find(i => i.id === targetId || i.food_item_id === targetId);
      if (!cartItem) return;

      let res;
      if (cartItem.quantity > 1) {
        res = await api.updateCartItem(cartItem.id, cartItem.quantity - 1);
      } else {
        res = await api.removeCartItem(cartItem.id);
      }

      const { items, cart_count, subtotal } = res.data || {};
      setCart(items || []);
      setCartCount(cart_count || 0);
      setCartTotal(subtotal || 0);
    } catch (err) {
      console.error('Failed to update cart item:', err);
    }
  };

  const clearCart = () => {
    setCart([]);
    setCartCount(0);
    setCartTotal(0);
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      clearCart, 
      fetchCart, 
      cartCount, 
      cartTotal, 
      loading 
    }}>
      {children}
    </CartContext.Provider>
  );
};
