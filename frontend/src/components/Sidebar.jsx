import { useState } from 'react';
import { Home, Users, ShoppingCart, Clock, HelpCircle, Info, Bike, Menu as MenuIcon, Image, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ role = 'customer', activeView, onViewChange }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  const getLinks = () => {
    if (role === 'admin') {
      return [
        { name: 'Dashboard', path: '#', icon: Home },
        { name: 'Orders', path: '#', icon: ShoppingCart },
        { name: 'Customers', path: '#', icon: Users },
        { name: 'Delivery Partners', path: '#', icon: Bike },
        { name: 'Food Menu', path: '#', icon: MenuIcon },
        { name: 'Reports & Feedback', path: '#', icon: Info },
      ];
    }
    if (role === 'delivery') {
      return [
        { name: 'Dashboard', path: '/dashboard/delivery', icon: Home },
        { name: 'Assigned Orders', path: '#', icon: Clock },
        { name: 'My Deliveries', path: '#', icon: ShoppingCart },
        { name: 'Earnings', path: '#', icon: Info },
        { name: 'Profile', path: '#', icon: Users },
      ];
    }
    
    // Customer
    return [
      { name: 'Home', path: '/dashboard/customer', icon: Home },
      { name: 'Cart', path: '#', icon: ShoppingCart },
      { name: 'My Orders', path: '#', icon: Clock },
      { name: 'Help', path: '#', icon: HelpCircle },
      { name: 'About Us', path: '#', icon: Info },
    ];
  };

  const links = getLinks();

  const handleLinkClick = (e, link) => {
    setIsMobileOpen(false);
    if (onViewChange) {
      if (role === 'customer') {
        if (link.name === 'Home') { e.preventDefault(); onViewChange('menu'); }
        else if (link.name === 'Cart') { e.preventDefault(); onViewChange('cart'); }
        else if (link.name === 'My Orders') { e.preventDefault(); onViewChange('orders'); }
        else if (link.name === 'Gallery') { e.preventDefault(); onViewChange('gallery'); }
        else if (link.name === 'Help') { e.preventDefault(); onViewChange('help'); }
        else if (link.name === 'About Us') { e.preventDefault(); onViewChange('about'); }
      } else if (role === 'admin') {
        if (link.name === 'Dashboard') { e.preventDefault(); onViewChange('overview'); }
        else if (link.name === 'Customers') { e.preventDefault(); onViewChange('customers'); }
        else if (link.name === 'Orders') { e.preventDefault(); onViewChange('orders'); }
        else if (link.name === 'Delivery Partners') { e.preventDefault(); onViewChange('delivery_partners'); }
        else if (link.name === 'Food Menu') { e.preventDefault(); onViewChange('menu_management'); }
        else if (link.name === 'Reports & Feedback') { e.preventDefault(); onViewChange('feedback_reports'); }
      } else if (role === 'delivery') {
        if (link.name === 'Dashboard') { e.preventDefault(); onViewChange('dashboard'); }
        else if (link.name === 'Assigned Orders') { e.preventDefault(); onViewChange('assigned'); }
        else if (link.name === 'My Deliveries') { e.preventDefault(); onViewChange('deliveries'); }
        else if (link.name === 'Earnings') { e.preventDefault(); onViewChange('earnings'); }
        else if (link.name === 'Profile') { e.preventDefault(); onViewChange('profile'); }
      }
    }
  };

  return (
    <>
      {/* Floating Hamburger Toggle Button for Mobile View */}
      <button 
        className="mobile-hamburger-btn" 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle Navigation Menu"
      >
        {isMobileOpen ? <X size={24} /> : <MenuIcon size={24} />}
      </button>

      {/* Backdrop overlay when sidebar is open on mobile */}
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar Navigation Panel */}
      <aside className={`sidebar glass-panel ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ position: 'relative', textAlign: 'center', marginBottom: '20px' }}>
          <img src="/logo.jpg" alt="Cafe 90's Logo" style={{ width: '80%', maxWidth: '120px', mixBlendMode: 'screen' }} />
        </div>
        
        <div className="sidebar-links">
          {links.map((link, idx) => {
            const Icon = link.icon;
            let isActive = false;
            
            if (role === 'customer') {
              if (link.name === 'Home' && activeView === 'menu') isActive = true;
              else if (link.name === 'Cart' && activeView === 'cart') isActive = true;
              else if (link.name === 'My Orders' && activeView === 'orders') isActive = true;
              else if (link.name === 'Gallery' && activeView === 'gallery') isActive = true;
              else if (link.name === 'Help' && activeView === 'help') isActive = true;
              else if (link.name === 'About Us' && activeView === 'about') isActive = true;
              else if (!activeView && path === link.path) isActive = true;
            } else if (role === 'admin') {
              if (link.name === 'Dashboard' && activeView === 'overview') isActive = true;
              else if (link.name === 'Customers' && activeView === 'customers') isActive = true;
              else if (link.name === 'Orders' && activeView === 'orders') isActive = true;
              else if (link.name === 'Delivery Partners' && activeView === 'delivery_partners') isActive = true;
              else if (link.name === 'Food Menu' && activeView === 'menu_management') isActive = true;
              else if (link.name === 'Reports & Feedback' && activeView === 'feedback_reports') isActive = true;
              else if (!activeView && path === link.path) isActive = true;
            } else if (role === 'delivery') {
              if (link.name === 'Dashboard' && activeView === 'dashboard') isActive = true;
              else if (link.name === 'Assigned Orders' && activeView === 'assigned') isActive = true;
              else if (link.name === 'My Deliveries' && activeView === 'deliveries') isActive = true;
              else if (link.name === 'Earnings' && activeView === 'earnings') isActive = true;
              else if (link.name === 'Profile' && activeView === 'profile') isActive = true;
              else if (!activeView && path === link.path) isActive = true;
            } else {
              isActive = path === link.path;
            }

            return (
              <Link 
                key={idx} 
                to={link.path} 
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={(e) => handleLinkClick(e, link)}
              >
                <Icon size={20} />
                <span>{link.name}</span>
                {link.badge && <span className="sidebar-badge">{link.badge}</span>}
              </Link>
            )
          })}
        </div>
      </aside>
    </>
  );
};

// Simple placeholder for missing icon in this scope
const User = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;

export default Sidebar;
