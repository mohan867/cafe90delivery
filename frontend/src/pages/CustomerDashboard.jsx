import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import MagicBento from '../components/MagicBento';
import SwiggyCartBar from '../components/SwiggyCartBar';
import { useCart } from '../context/CartContext';
import { Plus, Minus, ShoppingCart, Search, LogOut, MapPin, Loader2, CreditCard, ShieldCheck, CheckCircle2, QrCode, Banknote, Phone, Mail, Clock, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import OrderTrackingModal from '../components/OrderTrackingModal';
import './Dashboard.css';
import './Menu.css';

const LeafletMapPicker = ({ location, setLocation, setLandmark }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const isSelectingRef = useRef(false);
  const isMountedRef = useRef(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const defaultLat = location ? location.lat : 11.2447993;
  const defaultLng = location ? location.lng : 77.5172581;

  // Google Maps Style Vector SVG Icon Markers for POIs
  const fetchNearbyPOIs = async (lat, lng) => {
    if (!poiLayerRef.current || !window.L || !isMountedRef.current) return;

    try {
      const overpassQuery = `[out:json][timeout:3];(node(around:800,${lat},${lng})[amenity~"fuel|hospital|pharmacy|cafe|restaurant"];node(around:800,${lat},${lng})[shop];);out 15;`;

      const safeFetchOverpass = async (baseUrl) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        try {
          const res = await fetch(`${baseUrl}?data=${encodeURIComponent(overpassQuery)}`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) return null;
          return await res.json();
        } catch {
          clearTimeout(timeoutId);
          return null;
        }
      };

      let data = await safeFetchOverpass('https://overpass-api.de/api/interpreter');
      if (!data) {
        data = await safeFetchOverpass('https://overpass.kumi.systems/api/interpreter');
      }

      if (!poiLayerRef.current || !isMountedRef.current) return;
      poiLayerRef.current.clearLayers();

      if (data && data.elements) {
        data.elements.forEach(node => {
          if (!node.lat || !node.lon) return;

          const tags = node.tags || {};
          const name = tags.name || tags['name:en'] || 'Nearby Place';
          let iconHtml = '';

          if (tags.amenity === 'fuel') {
            iconHtml = `
              <div class="gmap-poi-badge fuel">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M3 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M15 10h4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-4"/><line x1="7" y1="9" x2="11" y2="9"/><line x1="3" y1="22" x2="15" y2="22"/></svg>
              </div>`;
          } else if (tags.shop || tags.amenity === 'supermarket') {
            iconHtml = `
              <div class="gmap-poi-badge shop">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>`;
          } else if (tags.amenity === 'hospital' || tags.amenity === 'pharmacy') {
            iconHtml = `
              <div class="gmap-poi-badge hospital">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>`;
          } else if (tags.amenity === 'cafe' || tags.amenity === 'restaurant') {
            iconHtml = `
              <div class="gmap-poi-badge restaurant">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="m16 2-2 3v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V5l-2-3Z"/><path d="M18 11v11"/><path d="M10 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V2"/><path d="M7 12v10"/></svg>
              </div>`;
          } else {
            return;
          }

          const customIcon = window.L.divIcon({
            html: iconHtml,
            className: 'gmap-div-icon',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });

          const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
          const poiMarker = window.L.marker([node.lat, node.lon], { icon: customIcon });
          poiMarker.bindTooltip(`<strong>${escapeHtml(name)}</strong>`, {
            direction: 'top',
            offset: [0, -10]
          });
          poiLayerRef.current.addLayer(poiMarker);
        });
      }
    } catch {
      // Ignore POI fetch network errors silently
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'Cafe90-DeliveryApp/1.0' }
      });
      const data = await res.json();
      if (!isMountedRef.current) return;

      if (data && data.address) {
        const addr = data.address;
        const house = addr.house_number || addr.building || '';
        const road = addr.road || addr.pedestrian || addr.street || '';
        const area = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || '';
        const city = addr.city || addr.town || addr.village || addr.city_district || '';
        const postcode = addr.postcode || '';

        const parts = [house, road, area, city, postcode].filter(Boolean);
        const fullAddress = parts.length >= 2 ? parts.join(', ') : (data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setLandmark(fullAddress);
      } else if (data && data.display_name) {
        setLandmark(data.display_name);
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initMap = () => {
      if (!window.L) {
        setTimeout(initMap, 300);
        return;
      }

      if (!mapInstanceRef.current) {
        const map = window.L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 15);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const marker = window.L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
        markerRef.current = marker;

        const poiLayer = window.L.layerGroup().addTo(map);
        poiLayerRef.current = poiLayer;

        mapInstanceRef.current = map;

        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);

        marker.on('dragend', async () => {
          const { lat, lng } = marker.getLatLng();
          setLocation({ lat, lng });
          await reverseGeocode(lat, lng);
        });

        map.on('click', async (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setLocation({ lat, lng });
          await reverseGeocode(lat, lng);
        });

        const handleMapMovement = () => {
          if (map.getZoom() >= 15) {
            const center = map.getCenter();
            fetchNearbyPOIs(center.lat, center.lng);
          } else if (poiLayerRef.current) {
            poiLayerRef.current.clearLayers();
          }
        };

        map.on('zoomend', handleMapMovement);
        map.on('moveend', handleMapMovement);

        if (defaultLat && defaultLng) {
          fetchNearbyPOIs(defaultLat, defaultLng);
        }
      }
    };

    initMap();

    return () => {
      isMountedRef.current = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (location && mapInstanceRef.current && markerRef.current) {
      const { lat, lng } = location;
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], 16);
      if (mapInstanceRef.current.getZoom() >= 15) {
        fetchNearbyPOIs(lat, lng);
      }
    }
  }, [location]);

  const queryNominatimWithFallback = async (queryStr) => {
    if (!queryStr || !queryStr.trim()) return [];

    const executeFetch = async (q) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=5`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'Cafe90-DeliveryApp/1.0' } }
        );
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    // 1. Primary Query
    let results = await executeFetch(queryStr);
    if (results.length > 0) return results;

    // 2. Smart Fallback for compound regional place names (e.g. "periyaveerasangili" -> "veerasangili")
    const cleanQuery = queryStr.trim();
    const fallbackQueries = [];
    const prefixes = ['periya', 'chinna', 'pudur', 'mel', 'kizh', 'vada', 'ten'];

    const tokens = cleanQuery.split(/[\s,]+/);
    tokens.forEach((token) => {
      const lower = token.toLowerCase();
      prefixes.forEach((prefix) => {
        if (lower.startsWith(prefix) && lower.length > prefix.length + 3) {
          const stripped = lower.slice(prefix.length);
          fallbackQueries.push(cleanQuery.replace(new RegExp(token, 'i'), `${prefix} ${stripped}`));
          fallbackQueries.push(cleanQuery.replace(new RegExp(token, 'i'), stripped));
          fallbackQueries.push(stripped);
        }
      });
    });

    for (const fallback of fallbackQueries) {
      if (!fallback || fallback.length < 3) continue;
      results = await executeFetch(fallback);
      if (results.length > 0) return results;
    }

    return [];
  };

  // Live Autocomplete Suggestions Debounce Effect
  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await queryNominatimWithFallback(searchQuery);
        if (data.length > 0) {
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Autocomplete fetch failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    isSelectingRef.current = true;
    setShowSuggestions(false);
    setSearchQuery(item.display_name);
    setLandmark(item.display_name);
    setLocation({ lat, lng: lon });

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
      mapInstanceRef.current.setView([lat, lon], 16);
      fetchNearbyPOIs(lat, lon);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }

    if (!searchQuery || !searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const data = await queryNominatimWithFallback(searchQuery);
      if (data.length > 0) {
        handleSelectSuggestion(data[0]);
      } else {
        alert("Location not found. Please try searching with a nearby landmark or district name (e.g. Veerasangili, Vijayamangalam, Erode).");
      }
    } catch (err) {
      console.error("Direct search submit failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ width: '100%', marginBottom: '20px', position: 'relative' }}>
      {/* Live Autocomplete Search Input */}
      <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search area, landmark or street (e.g. Thirunagar, Palayamkottai)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '12px', color: 'white', fontSize: '0.95rem' }}
            />
            <button
              type="submit"
              disabled={isSearching}
              style={{ padding: '12px 20px', background: '#D97706', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isSearching ? 'Searching...' : 'Locate'}
            </button>
          </div>
        </form>

        {/* Live Search Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="autocomplete-suggestions-box glass-panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: 'rgba(20, 20, 25, 0.96)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 25, 0.15)', borderRadius: '12px', zIndex: 100, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(item)}
                style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s ease', display: 'flex', alignItems: 'center', gap: '10px' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(217, 119, 6, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(217,119,6,0.2)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'white' }}>{item.display_name.split(',')[0]}</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '420px' }}>
                    {item.display_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Leaflet Map Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '270px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          position: 'relative',
          zIndex: 1
        }}
      />
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', textAlign: 'center' }}>
        📍 Drag pin or zoom in to view real Google Maps style POIs (petrol bunks, shops, hospitals).
      </p>
    </div>
  );
};

const CustomerDashboard = () => {
  const { cart, addToCart, removeFromCart, clearCart, cartCount, cartTotal, fetchCart } = useCart();
  const navigate = useNavigate();

  const [categories, setCategories] = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [dietPreference, setDietPreference] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState({ full_name: "Customer" });
  const [activeView, setActiveView] = useState("menu");

  const [foodItems, setFoodItems] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const deliveryFee = 30;
  const [location, setLocation] = useState(null);
  const [landmark, setLandmark] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'location' | 'payment' | 'payment_processing' | 'payment_success'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  // User Saved Locations (Max 5 Limit)
  const [savedAddresses, setSavedAddresses] = useState([]);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'CARD' | 'NETBANKING' | 'COD'
  const [upiId, setUpiId] = useState('customer@upi');
  const [cardForm, setCardForm] = useState({ number: '4532 8912 3456 7890', expiry: '12/28', cvv: '888', name: 'John Doe' });
  const [placedOrderData, setPlacedOrderData] = useState(null);

  // Help / Contact Form state & previous tickets
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState([]);

  // Auto-fill contact form with logged in user details
  useEffect(() => {
    if (user && (user.full_name || user.email)) {
      setContactForm(prev => ({
        ...prev,
        name: prev.name || user.full_name || user.name || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  const fetchMyFeedbacks = async () => {
    try {
      const res = await api.getMyFeedbacks();
      setMyFeedbacks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch customer feedbacks:", err);
    }
  };

  useEffect(() => {
    if (activeView === 'help') {
      fetchMyFeedbacks();
    }
  }, [activeView]);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      await api.submitContactFeedback({
        name: contactForm.name || user?.full_name || user?.name || 'Customer',
        email: contactForm.email || user?.email || '',
        subject: contactForm.subject,
        message: contactForm.message
      });
      setContactSubmitted(true);
      setContactForm({
        name: user?.full_name || user?.name || '',
        email: user?.email || '',
        subject: '',
        message: ''
      });
      fetchMyFeedbacks();
    } catch (err) {
      alert(err.message || 'Failed to submit message. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  const fetchSavedAddresses = async () => {
    try {
      const res = await api.getSavedAddresses();
      setSavedAddresses(res.data || []);
    } catch (err) {
      console.error("Failed to fetch saved addresses:", err);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [catsRes, itemsRes, ordersRes] = await Promise.all([
        api.getCategories().catch(() => ({ data: [] })),
        api.getFoodItems().catch(() => ({ data: [] })),
        api.getMyOrders().catch(() => ({ data: [] }))
      ]);

      setCategories(["All", ...(catsRes.data || []).map(c => c.name)]);
      setFoodItems(itemsRes.data || []);
      setMyOrders(ordersRes.data || []);
    } catch (err) {
      console.error("Dashboard sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { navigate("/login/customer"); return; }
    try {
      const userData = JSON.parse(stored);
      setUser(userData);
    } catch { navigate("/login/customer"); }

    fetchDashboardData();
    fetchSavedAddresses();
  }, [navigate]);

  const handleSaveCurrentAddress = async (labelChoice = "Home") => {
    if (!landmark.trim()) {
      alert("Please select or enter an address first.");
      return;
    }
    if (savedAddresses.length >= 5) {
      alert("Maximum limit of 5 saved locations reached for your account. Please delete an existing address to save a new one.");
      return;
    }
    try {
      const res = await api.saveAddress({
        label: labelChoice,
        address_line: landmark,
        latitude: location ? location.lat : null,
        longitude: location ? location.lng : null
      });
      setSavedAddresses(res.data || []);
      alert(res.message || `Address saved as "${labelChoice}"! (${res.data.length}/5 locations saved)`);
    } catch (err) {
      alert(err.message || "Failed to save location.");
    }
  };

  const handleDeleteSavedAddress = async (e, addressId) => {
    e.stopPropagation();
    try {
      const res = await api.deleteSavedAddress(addressId);
      setSavedAddresses(res.data || []);
    } catch (err) {
      alert(err.message || "Failed to delete address.");
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

  const handleLogout = async () => {
    try { await api.logout(); } catch { }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleDetectLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Please enter your address manually.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await response.json();

          if (data && data.address) {
            const addr = data.address;
            const house = addr.house_number || addr.building || "";
            const road = addr.road || addr.pedestrian || addr.street || "";
            const area = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || "";
            const city = addr.city || addr.town || addr.village || addr.city_district || "";
            const postcode = addr.postcode || "";

            const parts = [house, road, area, city, postcode].filter(Boolean);
            const fullAddress = parts.length >= 2 ? parts.join(", ") : (data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            setLandmark(fullAddress);
          } else if (data && data.display_name) {
            setLandmark(data.display_name);
          } else {
            setLandmark(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setLandmark(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn("Geolocation error:", error);
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please enable location access in your browser site settings or type your address manually below.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable. Please type your address manually.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Please try again or type your address manually.";
        }
        alert(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const checkoutIdempotencyKeyRef = useRef(null);

  const handleProceedToPayment = () => {
    if (!landmark.trim()) {
      alert("Please enter a delivery address.");
      return;
    }
    if (!checkoutIdempotencyKeyRef.current) {
      checkoutIdempotencyKeyRef.current = `IDEM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    setCheckoutStep('payment');
  };

  const executePaymentAndPlaceOrder = async () => {
    if (paymentMethod === 'UPI' && !upiId.trim()) {
      alert("Please enter your UPI ID.");
      return;
    }
    if (paymentMethod === 'CARD' && (!cardForm.number || !cardForm.cvv)) {
      alert("Please enter valid card details.");
      return;
    }

    setCheckoutStep('payment_processing');

    setTimeout(async () => {
      try {
        if (!checkoutIdempotencyKeyRef.current) {
          checkoutIdempotencyKeyRef.current = `IDEM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
        const res = await api.placeOrder({
          delivery_address: landmark,
          delivery_landmark: landmark,
          delivery_latitude: location ? location.lat : null,
          delivery_longitude: location ? location.lng : null,
          payment_method: paymentMethod,
          idempotency_key: checkoutIdempotencyKeyRef.current
        });

        const orderData = res.data;
        checkoutIdempotencyKeyRef.current = null;
        setPlacedOrderData({
          id: orderData.id,
          order_number: orderData.order_number,
          total_amount: (cartTotal + deliveryFee).toFixed(2),
          payment_method: paymentMethod,
          transaction_id: paymentMethod === 'COD' ? 'N/A (Cash on Delivery)' : `TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          items_count: cartCount,
          landmark: landmark
        });

        clearCart();
        await fetchDashboardData();
        setCheckoutStep('payment_success');
      } catch (err) {
        alert(err.message || "Payment processing failed.");
        setCheckoutStep('payment');
      }
    }, 2000);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar role="customer" activeView={activeView} onViewChange={setActiveView} />

      <div className="dashboard-main" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Top Bar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 100
        }}>
          {activeView === 'menu' ? (
            <div className="search-bar glass-panel" style={{ width: 360 }}>
              <Search size={16} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          ) : (
            <div style={{ flex: 1 }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontWeight: 600 }}>Hi, {user.full_name || user.name || "Customer"} 👋</span>
            <button
              style={{ position: 'relative', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setActiveView(activeView === 'cart' ? 'menu' : 'cart')}
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span style={{ background: '#D97706', borderRadius: '50%', width: 20, height: 20, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 14px', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Menu Panel */}
          {activeView === 'menu' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', paddingBottom: '100px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Our Menu</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {filteredItems.length} items available
                  </p>
                </div>
                <div className="diet-toggle-container glass-panel">
                  <button className={`diet-btn ${dietPreference === 'all' ? 'active' : ''}`} onClick={() => setDietPreference('all')}>All</button>
                  <button className={`diet-btn veg ${dietPreference === 'veg' ? 'active' : ''}`} onClick={() => setDietPreference('veg')}>
                    <span className="dot veg"></span> Veg
                  </button>
                  <button className={`diet-btn non-veg ${dietPreference === 'non-veg' ? 'active' : ''}`} onClick={() => setDietPreference('non-veg')}>
                    <span className="dot non-veg"></span> Non-Veg
                  </button>
                </div>
              </div>

              <div className="category-pills" style={{ marginBottom: 24 }}>
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
                <div style={{ textAlign: 'center', padding: '80px', color: 'white' }}>
                  <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto 12px' }} />
                  <p>Loading items...</p>
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
              {/* Swiggy Bottom Cart Bar */}
              <SwiggyCartBar onOpenCart={() => setActiveView('cart')} />
            </div>
          )}

          {/* Cart & Checkout Panel */}
          {activeView === 'cart' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="cart-page-container glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '30px' }}>

                {/* STEP 1: CART ITEMS REVIEW */}
                {checkoutStep === 'cart' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                      <div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Your Shopping Cart</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>{cartCount} items in your tray</p>
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => setActiveView('menu')}
                        style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '0.9rem' }}
                      >
                        Back to Menu
                      </button>
                    </div>

                    <div className="cart-items-list" style={{ marginBottom: '30px' }}>
                      {cart.map(item => (
                        <div key={item.id} className="cart-item glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '15px', marginBottom: '15px', gap: '20px' }}>
                          <img src={item.img || item.image_url || '/logo.jpg'} alt={item.name} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }} />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ marginBottom: '5px' }}>{item.name}</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>₹{item.price}</p>
                          </div>
                          <div className="qty-selector">
                            <button onClick={() => removeFromCart(item.food_item_id || item.id)}><Minus size={16} /></button>
                            <span>{item.quantity || item.qty}</span>
                            <button onClick={() => addToCart(item)}><Plus size={16} /></button>
                          </div>
                          <div style={{ width: '80px', textAlign: 'right', fontWeight: 'bold' }}>
                            ₹{(item.price * (item.quantity || item.qty)).toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {cart.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                          <ShoppingCart size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
                          <h3>Your cart is empty</h3>
                          <p className="text-secondary" style={{ marginBottom: '25px' }}>Looks like you haven't added anything yet.</p>
                          <button className="btn-primary" onClick={() => setActiveView('menu')}>Start Ordering</button>
                        </div>
                      )}
                    </div>

                    {cart.length > 0 && (
                      <div className="cart-checkout-section glass-panel" style={{ padding: '25px', background: 'rgba(255,255,255,0.03)' }}>
                        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span className="text-secondary">Subtotal</span>
                          <span>₹{cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span className="text-secondary">Delivery Fee</span>
                          <span>₹{deliveryFee.toFixed(2)}</span>
                        </div>
                        <div className="summary-row total-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '1.4rem', fontWeight: 'bold' }}>
                          <span>Total Amount</span>
                          <span className="text-accent">₹{(cartTotal + deliveryFee).toFixed(2)}</span>
                        </div>
                        <button
                          className="btn-primary w-100"
                          style={{ marginTop: '25px', padding: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                          onClick={() => setCheckoutStep('location')}
                        >
                          <MapPin size={20} />
                          Proceed to Delivery Address
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* STEP 2: LOCATION ENTRY */}
                {checkoutStep === 'location' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Delivery Address</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>Where should we deliver your order?</p>

                    <div className="location-card glass-panel" style={{ width: '100%', maxWidth: '550px', padding: '25px', textAlign: 'left' }}>
                      <button
                        onClick={handleDetectLocation}
                        disabled={isLocating}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)', color: '#D97706', padding: '10px 16px', borderRadius: '10px', width: '100%', cursor: 'pointer', fontWeight: '600', marginBottom: '16px', justifyContent: 'center' }}
                      >
                        <MapPin size={18} />
                        {isLocating ? 'Detecting Current Location...' : 'Use Current GPS Location'}
                      </button>

                      {/* Swiggy Interactive Leaflet Map Picker */}
                      <LeafletMapPicker
                        location={location}
                        setLocation={setLocation}
                        setLandmark={setLandmark}
                      />

                      {/* Saved Locations Selector (Max 5 Limit) */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                            SAVED LOCATIONS ({savedAddresses.length}/5 MAX)
                          </span>
                          {savedAddresses.length < 5 && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleSaveCurrentAddress("Home")}
                                style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#10B981', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}
                              >
                                + Save Home
                              </button>
                              <button
                                onClick={() => handleSaveCurrentAddress("Work")}
                                style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', color: '#3B82F6', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}
                              >
                                + Save Work
                              </button>
                              <button
                                onClick={() => handleSaveCurrentAddress("Other")}
                                style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#F59E0B', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}
                              >
                                + Save Other
                              </button>
                            </div>
                          )}
                        </div>

                        {savedAddresses.length > 0 ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {savedAddresses.map(addr => (
                              <div
                                key={addr.id}
                                onClick={() => {
                                  setLandmark(addr.address_line);
                                  if (addr.latitude && addr.longitude) {
                                    setLocation({ lat: addr.latitude, lng: addr.longitude });
                                  }
                                }}
                                style={{ padding: '6px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', transition: 'all 0.2s ease' }}
                              >
                                <span style={{ fontWeight: 'bold', color: '#D97706' }}>
                                  {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '💼' : '📍'} {addr.label}:
                                </span>
                                <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {addr.address_line}
                                </span>
                                <button
                                  onClick={(e) => handleDeleteSavedAddress(e, addr.id)}
                                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px', marginLeft: '2px', fontWeight: 'bold' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                            No saved locations yet. You can save up to 5 locations in your account.
                          </p>
                        )}
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>
                          SELECTED STREET ADDRESS / LANDMARK / DOOR NO.
                        </label>
                        <textarea
                          placeholder="e.g. Flat 302, Green Avenue, Tirunelveli"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          style={{ width: '100%', padding: '15px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '1rem', resize: 'none', height: '90px' }}
                        />
                      </div>

                      <button
                        className="btn-primary w-100"
                        style={{ padding: '16px', fontSize: '1.1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        onClick={handleProceedToPayment}
                        disabled={!landmark.trim()}
                      >
                        <CreditCard size={20} />
                        Proceed to Payment Selection
                      </button>
                    </div>

                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '20px', cursor: 'pointer', fontSize: '0.9rem' }}
                      onClick={() => setCheckoutStep('cart')}
                    >
                      ← Back to Cart
                    </button>
                  </div>
                )}

                {/* STEP 3: PAYMENT METHOD SELECTION & VERIFICATION */}
                {checkoutStep === 'payment' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Select Payment Method</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>Total Payable: <strong style={{ color: '#D97706', fontSize: '1.2rem' }}>₹{(cartTotal + deliveryFee).toFixed(2)}</strong></p>

                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '30px' }}>

                      {/* Payment Options Tabs */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '25px' }}>
                        <button
                          onClick={() => setPaymentMethod('UPI')}
                          style={{ padding: '12px 8px', borderRadius: '12px', background: paymentMethod === 'UPI' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.03)', border: paymentMethod === 'UPI' ? '1px solid #D97706' : '1px solid rgba(255,255,255,0.08)', color: paymentMethod === 'UPI' ? '#D97706' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          <QrCode size={20} /> UPI / GPay
                        </button>
                        <button
                          onClick={() => setPaymentMethod('CARD')}
                          style={{ padding: '12px 8px', borderRadius: '12px', background: paymentMethod === 'CARD' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.03)', border: paymentMethod === 'CARD' ? '1px solid #D97706' : '1px solid rgba(255,255,255,0.08)', color: paymentMethod === 'CARD' ? '#D97706' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          <CreditCard size={20} /> Card
                        </button>
                        <button
                          onClick={() => setPaymentMethod('NETBANKING')}
                          style={{ padding: '12px 8px', borderRadius: '12px', background: paymentMethod === 'NETBANKING' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.03)', border: paymentMethod === 'NETBANKING' ? '1px solid #D97706' : '1px solid rgba(255,255,255,0.08)', color: paymentMethod === 'NETBANKING' ? '#D97706' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          <ShieldCheck size={20} /> Net Banking
                        </button>
                        <button
                          onClick={() => setPaymentMethod('COD')}
                          style={{ padding: '12px 8px', borderRadius: '12px', background: paymentMethod === 'COD' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.03)', border: paymentMethod === 'COD' ? '1px solid #D97706' : '1px solid rgba(255,255,255,0.08)', color: paymentMethod === 'COD' ? '#D97706' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          <Banknote size={20} /> Cash (COD)
                        </button>
                      </div>

                      {/* Payment Inputs */}
                      {paymentMethod === 'UPI' && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>UPI ID (Google Pay / PhonePe / Paytm)</label>
                          <input
                            type="text"
                            placeholder="e.g. 9876543210@paytm or name@okhdfcbank"
                            value={upiId}
                            onChange={e => setUpiId(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '1rem' }}
                          />
                        </div>
                      )}

                      {paymentMethod === 'CARD' && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Card Number</label>
                            <input
                              type="text"
                              value={cardForm.number}
                              onChange={e => setCardForm({ ...cardForm, number: e.target.value })}
                              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Expiry Date</label>
                              <input
                                type="text"
                                value={cardForm.expiry}
                                onChange={e => setCardForm({ ...cardForm, expiry: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>CVV</label>
                              <input
                                type="password"
                                maxLength={3}
                                value={cardForm.cvv}
                                onChange={e => setCardForm({ ...cardForm, cvv: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'NETBANKING' && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Select Bank</label>
                          <select style={{ width: '100%', padding: '12px 16px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}>
                            <option>HDFC Bank</option>
                            <option>State Bank of India (SBI)</option>
                            <option>ICICI Bank</option>
                            <option>Axis Bank</option>
                          </select>
                        </div>
                      )}

                      {paymentMethod === 'COD' && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Pay cash directly to the delivery partner upon arrival.</p>
                        </div>
                      )}

                      <button
                        className="btn-primary w-100"
                        style={{ padding: '16px', fontSize: '1.1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        onClick={executePaymentAndPlaceOrder}
                      >
                        <ShieldCheck size={20} />
                        {paymentMethod === 'COD' ? 'Confirm Cash Order' : `Pay ₹${(cartTotal + deliveryFee).toFixed(2)} & Verify`}
                      </button>

                    </div>

                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '20px', cursor: 'pointer', fontSize: '0.9rem' }}
                      onClick={() => setCheckoutStep('location')}
                    >
                      ← Back to Location
                    </button>
                  </div>
                )}

                {/* STEP 4: PAYMENT PROCESSING ANIMATION */}
                {checkoutStep === 'payment_processing' && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Loader2 className="animate-spin" size={60} style={{ color: '#D97706', marginBottom: '20px' }} />
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Verifying Payment...</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '400px' }}>
                      Communicating securely with your bank gateway. Please do not close or refresh this page.
                    </p>
                  </div>
                )}

                {/* STEP 5: PAYMENT SUCCESS RECEIPT */}
                {checkoutStep === 'payment_success' && placedOrderData && (
                  <div style={{ textAlign: 'center', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '20px', borderRadius: '50%', marginBottom: '20px' }}>
                      <CheckCircle2 size={64} />
                    </div>
                    <h2 style={{ fontSize: '2.2rem', marginBottom: '8px', color: 'white' }}>Order Placed Successfully!</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '30px' }}>
                      Thank you for dining with Cafe 90's. Your order is now being prepared!
                    </p>

                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '25px', textAlign: 'left', marginBottom: '30px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Order Number</span>
                        <span style={{ fontWeight: 'bold', color: '#D97706' }}>#{placedOrderData.order_number}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Amount Paid</span>
                        <span style={{ fontWeight: 'bold' }}>₹{placedOrderData.total_amount}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Payment Method</span>
                        <span style={{ fontWeight: 'bold' }}>{placedOrderData.payment_method}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Transaction ID</span>
                        <span style={{ fontSize: '0.85rem', color: '#60a5fa' }}>{placedOrderData.transaction_id}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Delivery Location</span>
                        <span style={{ fontSize: '0.9rem', textAlign: 'right', maxWidth: '240px' }}>{placedOrderData.landmark}</span>
                      </div>
                    </div>

                    <button
                      className="btn-primary"
                      style={{ padding: '14px 35px', borderRadius: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => {
                        if (placedOrderData && placedOrderData.id) {
                          setTrackingOrderId(placedOrderData.id);
                        } else {
                          setCheckoutStep('cart');
                          setActiveView('orders');
                        }
                      }}
                    >
                      <MapPin size={20} />
                      Track Order Status
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Orders Panel */}
          {activeView === 'orders' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="orders-page-container glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>My Orders</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Track and manage your orders</p>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => setActiveView('menu')}
                    style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '0.9rem' }}
                  >
                    Order More
                  </button>
                </div>

                <div className="orders-list">
                  {myOrders.map(order => (
                    <div key={order.id} className="order-card glass-panel" style={{ padding: '20px', marginBottom: '20px', borderLeft: `4px solid ${order.status === 'DELIVERED' ? '#10b981' : '#f59e0b'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>#{order.order_number}</span>
                          <h4 style={{ margin: '4px 0' }}>Order Status</h4>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(order.created_at).toLocaleString()}</span>
                          <div style={{ color: order.status === 'DELIVERED' ? '#10b981' : '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem' }}>{order.status}</div>
                        </div>
                      </div>
                      <div style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '15px' }}>
                        <p style={{ fontSize: '0.9rem' }}>{order.items.map(i => `${i.name} x ${i.quantity}`).join(', ')}</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>Total: ₹{order.total_amount}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#D97706', border: 'none' }}
                            onClick={() => setTrackingOrderId(order.id)}
                          >
                            Live Track 🛵
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {myOrders.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                      <p>No past orders found. Place your first order today!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Help & Contact Us Panel */}
          {activeView === 'help' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: '900px' }}>

                <div style={{ textAlign: 'center', marginBottom: '35px' }}>
                  <h2 style={{ fontSize: '2.2rem', color: '#D97706', marginBottom: '6px' }}>Help & Customer Support</h2>
                  <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>Get in touch with Cafe 90's support or visit our restaurant.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '35px' }}>
                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#D97706', padding: '14px', borderRadius: '50%', marginBottom: '12px' }}>
                      <Phone size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>Phone Number</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '10px' }}>Call us for order inquiries or assistance.</p>
                    <a href="tel:+917550344381" style={{ color: '#D97706', fontWeight: 'bold', fontSize: '1.05rem' }}>+91 7550344381</a>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '14px', borderRadius: '50%', marginBottom: '12px' }}>
                      <Mail size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>Email Address</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '10px' }}>Send us an email anytime.</p>
                    <a href="mailto:cafe90resto@gmail.com" style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '0.98rem' }}>cafe90resto@gmail.com</a>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '14px', borderRadius: '50%', marginBottom: '12px' }}>
                      <Clock size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>Opening Hours</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Monday – Sunday</p>
                    <p style={{ color: '#34d399', fontWeight: 'bold', fontSize: '1rem', marginTop: '4px' }}>10:00 AM – 11:00 PM</p>
                  </div>
                </div>

                {/* PREVIOUS SUPPORT TICKETS & ADMIN REPLIES */}
                {myFeedbacks.length > 0 && (
                  <div className="glass-panel" style={{ width: '100%', padding: '24px', borderRadius: '18px', marginBottom: '35px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.3rem', color: '#D97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={20} /> Your Support Requests & Admin Responses
                      </h3>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', padding: '4px 12px', borderRadius: '12px', color: 'rgba(255,255,255,0.7)' }}>
                        {myFeedbacks.length} {myFeedbacks.length === 1 ? 'ticket' : 'tickets'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {myFeedbacks.map(fb => (
                        <div key={fb.id} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', padding: '18px', borderRadius: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'white' }}>{fb.subject}</h4>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontWeight: '600',
                              background: fb.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.2)' : fb.status === 'IN_REVIEW' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: fb.status === 'RESOLVED' ? '#34d399' : fb.status === 'IN_REVIEW' ? '#60a5fa' : '#fbbf24',
                              border: `1px solid ${fb.status === 'RESOLVED' ? '#10b981' : fb.status === 'IN_REVIEW' ? '#3b82f6' : '#f59e0b'}`
                            }}>
                              {fb.status === 'RESOLVED' ? '✓ RESOLVED' : fb.status === 'IN_REVIEW' ? 'ℹ IN REVIEW' : '⏳ PENDING REVIEW'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                            Submitted on {new Date(fb.created_at).toLocaleString()}
                          </p>
                          <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '8px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            "{fb.message}"
                          </p>

                          {/* ADMIN RESPONSE BOX */}
                          {fb.admin_reply ? (
                            <div style={{ background: 'rgba(59, 130, 246, 0.12)', borderLeft: '4px solid #3B82F6', padding: '12px 16px', borderRadius: '8px' }}>
                              <p style={{ fontSize: '0.82rem', color: '#60a5fa', fontWeight: 'bold', marginBottom: '4px' }}>
                                💬 Admin Official Response:
                              </p>
                              <p style={{ fontSize: '0.92rem', color: 'white', lineHeight: '1.4' }}>
                                {fb.admin_reply}
                              </p>
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                              ⏳ Our support team is reviewing your message and will post an update here shortly.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', alignItems: 'start' }}>

                  {/* Contact Form */}
                  <div className="glass-panel" style={{ padding: '28px' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '18px' }}>Send Us a Message</h3>
                    {contactSubmitted ? (
                      <div style={{ textAlign: 'center', padding: '30px 15px', color: '#10b981' }}>
                        <CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} />
                        <h4 style={{ fontSize: '1.3rem', marginBottom: '8px', color: 'white' }}>Thank You!</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Your message has been sent successfully. Our support team will get back to you shortly.</p>
                        <button className="btn-secondary" style={{ marginTop: '16px', fontSize: '0.88rem' }} onClick={() => setContactSubmitted(false)}>Send Another Message</button>
                      </div>
                    ) : (
                      <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Your Name</label>
                          <input
                            type="text"
                            required
                            placeholder="John Doe"
                            value={contactForm.name}
                            onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.95rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email Address</label>
                          <input
                            type="email"
                            required
                            placeholder="you@email.com"
                            value={contactForm.email}
                            onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.95rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Subject</label>
                          <input
                            type="text"
                            required
                            placeholder="Order Inquiry / Feedback / General Question"
                            value={contactForm.subject}
                            onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.95rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Message</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Describe your issue or feedback..."
                            value={contactForm.message}
                            onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', resize: 'vertical' }}
                          />
                        </div>
                        <button className="btn-primary" type="submit" disabled={contactLoading} style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem', marginTop: '6px' }}>
                          <Send size={16} /> {contactLoading ? 'Sending...' : 'Send Message'}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Location & Map Card */}
                  <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <MapPin size={22} style={{ color: '#D97706' }} />
                        <h3 style={{ fontSize: '1.5rem' }}>Visit Our Cafe</h3>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '18px', fontSize: '0.9rem' }}>
                        Experience the warmth and nostalgia of 90's dining. Step in for handcrafted coffee, sizzling fast bites, and great music.
                      </p>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>Cafe 90's Resto</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Perundurai, Moongilpalayam, Tamil Nadu 638056</p>
                      </div>
                    </div>

                    <div style={{ borderRadius: '12px', overflow: 'hidden', height: '180px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px' }}>
                      <a
                        href="https://maps.app.goo.gl/tBe21N6NB3VnyRQX7"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'white', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                      >
                        <MapPin size={36} style={{ color: '#D97706' }} />
                        <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>Open in Google Maps</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click to navigate directly to Cafe 90's Resto</span>
                      </a>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* About Us Panel */}
          {activeView === 'about' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '35px', textAlign: 'center' }}>
                <img src="/logo.jpg" alt="Cafe 90's Logo" style={{ width: '140px', marginBottom: '20px', mixBlendMode: 'screen' }} />
                <h2 style={{ fontSize: '2.2rem', color: '#D97706', marginBottom: '12px' }}>About Cafe 90's</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '25px' }}>
                  Welcome to Cafe 90's, where every bite comes with a side of nostalgia! Founded in 2019, we bring back the golden era of 90's dining with rich filter coffees, sizzlers, paneer tikka sandwiches, and authentic South Indian delicacies.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '30px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 style={{ color: '#D97706', fontSize: '1.2rem', marginBottom: '6px' }}>Fresh Ingredients</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Daily sourced local produce & handcrafted recipes.</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 style={{ color: '#34d399', fontSize: '1.2rem', marginBottom: '6px' }}>Fast Delivery</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hot & fresh food delivered right to your doorstep.</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 style={{ color: '#60a5fa', fontSize: '1.2rem', marginBottom: '6px' }}>90s Vibes</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Retro aesthetics, classic tunes & memorable tastes.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Real-time Order Tracking Modal */}
      {trackingOrderId && (
        <OrderTrackingModal
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
