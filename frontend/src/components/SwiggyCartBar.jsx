import { useState } from 'react';
import { ShoppingCart, ArrowRight, UserCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import './SwiggyCartBar.css';

const SwiggyCartBar = ({ onOpenCart }) => {
  const { cartCount, cartTotal } = useCart();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (cartCount === 0) return null;

  const handleClick = () => {
    const stored = localStorage.getItem('user');
    
    let isCustomer = false;
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role === 'customer') isCustomer = true;
      } catch {
        isCustomer = false;
      }
    }

    if (isCustomer) {
      if (onOpenCart) {
        onOpenCart();
      } else {
        navigate('/dashboard/customer');
      }
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <div className="swiggy-cart-bar-container">
        <button 
          type="button" 
          className="swiggy-cart-bar glass-panel" 
          onClick={handleClick}
          aria-label={`View cart containing ${cartCount} items, total price ${cartTotal.toFixed(2)} rupees`}
        >
          <div className="swiggy-cart-left">
            <span className="swiggy-cart-count">{cartCount} ITEM{cartCount > 1 ? 'S' : ''}</span>
            <span className="swiggy-cart-divider">|</span>
            <span className="swiggy-cart-total">₹{cartTotal.toFixed(2)}</span>
          </div>

          <div className="swiggy-cart-right">
            <span>View Cart & Checkout</span>
            <ArrowRight size={18} />
          </div>
        </button>
      </div>

      {showAuthModal && (
        <div className="auth-guard-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-guard-modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="auth-guard-icon">
              <UserCheck size={36} />
            </div>
            <h3>Customer Login Required</h3>
            <p>Please log in to your Customer account to view your cart, add items, and complete your order.</p>
            <div className="auth-guard-actions">
              <button 
                className="btn-primary w-100" 
                onClick={() => { setShowAuthModal(false); navigate('/login/customer'); }}
              >
                Log In as Customer
              </button>
              <button 
                className="btn-secondary w-100" 
                onClick={() => { setShowAuthModal(false); navigate('/register/customer'); }}
              >
                Create New Account
              </button>
              <button 
                className="auth-guard-cancel" 
                onClick={() => setShowAuthModal(false)}
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SwiggyCartBar;
