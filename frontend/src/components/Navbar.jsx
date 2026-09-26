import { Coffee, Search, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Navbar.css';

const Navbar = () => {
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const handleCartClick = () => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login/customer');
    } else {
      navigate('/dashboard/customer');
    }
  };

  return (
    <nav className="navbar glass-panel">
      <div className="nav-container">
        <Link to="/" className="logo">
          <img src="/logo.jpg" alt="Cafe 90's Logo" style={{ height: '45px', objectFit: 'contain', mixBlendMode: 'screen' }} />
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/menu">Menu</Link>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact Us</Link>
          <Link to="/gallery">Gallery</Link>
        </div>

        <div className="nav-actions">
          <button className="btn-icon">
            <Search size={20} />
          </button>
          <button className="btn-icon cart-btn" onClick={handleCartClick}>
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          <Link to="/login" className="btn-primary login-btn">Login</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
