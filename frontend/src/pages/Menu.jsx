import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SwiggyCartBar from '../components/SwiggyCartBar';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Loader2, Search, AlertCircle } from 'lucide-react';
import MagicBento from '../components/MagicBento';
import { api } from '../services/api';
import './Menu.css';

const Menu = () => {
  const { cart, addToCart, removeFromCart } = useCart();
  const [categories, setCategories] = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [dietPreference, setDietPreference] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, itemsRes] = await Promise.all([
        api.getCategories().catch(() => ({ data: [] })),
        api.getFoodItems().catch(() => ({ data: [] }))
      ]);

      const catNames = ["All", ...(catsRes.data || []).map(c => c.name)];
      setCategories(catNames);
      setFoodItems(itemsRes.data || []);
    } catch (err) {
      console.error("Failed to load menu data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getItemQty = (id) => {
    const item = cart.find(i => i.food_item_id === id || i.id === id);
    return item ? item.quantity || item.qty : 0;
  };

  const filteredItems = foodItems.filter(item => {
    const categoryMatch = activeCategory === "All" || item.category_name === activeCategory;
    const dietMatch = dietPreference === "all" || item.diet_type === dietPreference;
    const searchMatch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return categoryMatch && dietMatch && searchMatch;
  });

  return (
    <div className="menu-page">
      <Navbar />
      <div className="menu-container" style={{ paddingBottom: '100px' }}>
        <header className="menu-header">
          <h1 className="menu-title">Our Menu</h1>
          <p className="menu-subtitle">Delicious food for every mood</p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '600px', margin: '20px auto 0' }}>
            {/* Food Search Bar */}
            <div className="search-bar glass-panel" style={{ width: '100%', padding: '12px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Search size={20} style={{ color: '#D97706' }} />
              <input
                type="text"
                placeholder="Search dishes by name or ingredients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.05rem', width: '100%', outline: 'none' }}
              />
            </div>

            <div className="diet-toggle-container glass-panel">
              <button
                className={`diet-btn ${dietPreference === 'all' ? 'active' : ''}`}
                onClick={() => setDietPreference('all')}
              >
                All
              </button>
              <button
                className={`diet-btn veg ${dietPreference === 'veg' ? 'active' : ''}`}
                onClick={() => setDietPreference('veg')}
              >
                <span className="dot veg"></span> Veg
              </button>
              <button
                className={`diet-btn non-veg ${dietPreference === 'non-veg' ? 'active' : ''}`}
                onClick={() => setDietPreference('non-veg')}
              >
                <span className="dot non-veg"></span> Non-Veg
              </button>
            </div>

            {/* Out of Stock Customer Intimation Banner */}
            {foodItems.some(i => i.is_available === false) && (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 18px', borderRadius: '14px', width: '100%', fontSize: '0.85rem', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>Notice: Certain items are currently marked <strong>Out of Stock</strong> today by the kitchen.</span>
              </div>
            )}
          </div>
        </header>

        <div className="category-pills">
          {categories.map((cat, idx) => (
            <button
              key={idx}
              className={`pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'white' }}>
            <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto 15px' }} />
            <p>Loading fresh delicacies...</p>
          </div>
        ) : (
          <MagicBento
            items={filteredItems.map(item => ({ ...item, img: item.image_url }))}
            glowColor="217, 119, 6"
            textAutoHide={false}
            enableTilt={true}
            enableStars={true}
            renderItem={(item) => {
              const qty = getItemQty(item.id);
              const isVeg = item.diet_type === 'veg';
              return (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', boxSizing: 'border-box' }}>
                  
                  {/* Food Image Header */}
                  <div style={{ position: 'relative', width: '100%', height: '165px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, marginBottom: '14px' }}>
                    <img
                      src={item.image_url || '/logo.jpg'}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: item.is_available === false ? 'grayscale(0.8)' : 'none' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />

                    {/* Veg / Non-Veg badge top-left */}
                    <div className={`diet-icon-badge ${isVeg ? 'veg' : 'non-veg'}`} style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
                      <span className="diet-icon-dot"></span>
                    </div>

                    {/* Out of Stock badge top-right */}
                    {item.is_available === false && (
                      <span style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', color: 'white', fontSize: '0.68rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.5px', zIndex: 2 }}>
                        OUT OF STOCK
                      </span>
                    )}
                  </div>

                  {/* Dish Name & Price Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: 0, flex: 1, lineHeight: 1.3 }}>
                      {item.name}
                    </h4>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                      ₹{item.price}
                    </span>
                  </div>

                  {/* Description */}
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.4, margin: '0 0 16px 0', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description}
                  </p>

                  {/* Bottom Action Row with ADD Button / Qty Selector */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {item.is_available === false ? (
                      <button className="add-btn-clean disabled" disabled style={{ padding: '8px 18px', opacity: 0.6, cursor: 'not-allowed', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                        Out of Stock
                      </button>
                    ) : qty === 0 ? (
                      <button className="add-btn-clean" style={{ padding: '8px 24px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)', transition: 'all 0.2s ease' }} onClick={(e) => { e.stopPropagation(); addToCart(item); }}>
                        ADD <Plus size={15} style={{ strokeWidth: 3 }} />
                      </button>
                    ) : (
                      <div className="qty-selector-clean" style={{ display: 'flex', alignItems: 'center', background: '#16a34a', color: 'white', borderRadius: '10px', padding: '4px 8px', gap: '8px', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}><Minus size={15} style={{ strokeWidth: 3 }} /></button>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', minWidth: '18px', textAlign: 'center' }}>{qty}</span>
                        <button onClick={() => addToCart(item)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}><Plus size={15} style={{ strokeWidth: 3 }} /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Swiggy-Style Floating Bottom Cart Bar */}
      <SwiggyCartBar />
    </div>
  );
};

export default Menu;
