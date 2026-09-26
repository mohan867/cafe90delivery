import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Users, ShoppingBag, Clock, DollarSign, Plus, Loader2, Bike, MessageSquare, CheckCircle, Eye, AlertCircle, X, Shield, Filter, Phone, Mail, MapPin, Upload, Edit3, CheckCircle2, XCircle, LogOut, Banknote } from 'lucide-react';
import { api } from '../services/api';
import './Dashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };
  const [loading, setLoading] = useState(true);
  
  const [statsData, setStatsData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  
  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderDateFilter, setOrderDateFilter] = useState('ALL');

  // Modals & Editing
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: '', mobile: '', email: '', password: '', role: 'delivery_partner' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalLoading, setUserModalLoading] = useState(false);
  
  // Price Editing state
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');

  // Single Edit Dish Modal State
  const [isEditFoodOpen, setIsEditFoodOpen] = useState(false);
  const [editingFoodItem, setEditingFoodItem] = useState({
    id: '',
    name: '',
    category_id: '',
    price: '',
    diet_type: 'veg',
    description: '',
    image_url: '',
    is_available: true
  });

  // Food Item Modal & File Upload state
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [editingFoodModalItem, setEditingFoodModalItem] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const [newFoodItem, setNewFoodItem] = useState({
    name: '',
    category_id: '',
    price: '',
    diet_type: 'veg',
    description: '',
    image_url: '',
    is_available: true
  });


  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [dashRes, custRes, staffRes, ordersRes, foodRes, fbRes, catsRes] = await Promise.all([
        api.getAdminDashboard().catch(() => ({ data: {} })),
        api.getCustomersList().catch(() => ({ data: [] })),
        api.getStaffList().catch(() => ({ data: [] })),
        api.getAllOrders().catch(() => ({ data: [] })),
        api.getFoodItems().catch(() => ({ data: [] })),
        api.getFeedbacks().catch(() => ({ data: [] })),
        api.getCategories().catch(() => ({ data: [] }))
      ]);

      const s = dashRes.data || {};
      setStatsData([
        { label: "Total Revenue", value: `₹${s.total_revenue || 0}`, icon: <DollarSign size={20} />, color: "#10B981" },
        { label: "Total Orders", value: s.total_orders || 0, icon: <ShoppingBag size={20} />, color: "#3B82F6" },
        { label: "Total Customers", value: s.total_customers || 0, icon: <Users size={20} />, color: "#8B5CF6" },
        { label: "Active Fleet", value: `${s.active_partners || 0} Partners`, icon: <Bike size={20} />, color: "#F59E0B" },
        { label: "New Feedbacks", value: s.new_feedbacks || 0, icon: <MessageSquare size={20} />, color: "#EC4899" }
      ]);

      setCustomers(custRes.data || []);
      setDeliveryPartners(staffRes.data || []);
      setOrders(ordersRes.data || []);
      setFoodItems(foodRes.data || []);
      setFeedbacks(fbRes.data || []);
      setCategoriesList(catsRes.data || []);
      if (catsRes.data && catsRes.data.length > 0 && !newFoodItem.category_id) {
        setNewFoodItem(prev => ({ ...prev, category_id: catsRes.data[0].id }));
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async () => {
    try {
      await api.createStaff({
        name: newPartner.name,
        email: newPartner.email,
        password: newPartner.password,
        phone: newPartner.mobile,
        role: newPartner.role
      });
      alert(`Staff account created for ${newPartner.email}!`);
      setIsAddPartnerOpen(false);
      setNewPartner({ name: '', mobile: '', email: '', password: '', role: 'delivery_partner' });
      fetchAdminData();
    } catch (err) {
      alert(err.message || "Failed to create staff account.");
    }
  };

  const handleFetchUserDetails = async (user) => {
    setUserModalLoading(true);
    setSelectedUser(user);
    try {
      const res = await api.getUserDetails(user.id);
      setSelectedUser(res.data);
    } catch (err) {
      console.error("Failed to load user details:", err);
    } finally {
      setUserModalLoading(false);
    }
  };

  const handleToggleFoodStock = async (item) => {
    try {
      const newStatus = !item.is_available;
      await api.updateFoodItem(item.id, { is_available: newStatus });
      setFoodItems(foodItems.map(f => f.id === item.id ? { ...f, is_available: newStatus } : f));
    } catch (err) {
      alert(err.message || "Failed to update food item availability.");
    }
  };

  const handleStartEditPrice = (item) => {
    setEditingPriceId(item.id);
    setEditingPriceValue(item.price.toString());
  };

  const handleSavePrice = async (itemId) => {
    try {
      const parsedPrice = parseFloat(editingPriceValue);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        alert("Please enter a valid positive price.");
        return;
      }
      await api.updateFoodItem(itemId, { price: parsedPrice });
      setFoodItems(foodItems.map(f => f.id === itemId ? { ...f, price: parsedPrice } : f));
      setEditingPriceId(null);
    } catch (err) {
      alert(err.message || "Failed to update menu price.");
    }
  };

  const handleImageFileUpload = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit. Please select a smaller image file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await api.uploadMenuImage(reader.result);
          const uploadedUrl = res.data?.image_url || res.image_url;
          if (uploadedUrl) {
            if (isEdit) {
              setEditingFoodModalItem(prev => ({ ...prev, image_url: uploadedUrl }));
            } else {
              setNewFoodItem(prev => ({ ...prev, image_url: uploadedUrl }));
            }
          }
        } catch (err) {
          alert("Failed to upload image to CDN: " + (err.message || "Unknown error"));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddFoodItem = async () => {
    try {
      if (!newFoodItem.name || !newFoodItem.price || !newFoodItem.category_id) {
        alert("Please fill in dish name, category, and price.");
        return;
      }
      await api.addFoodItem({
        name: newFoodItem.name,
        category_id: newFoodItem.category_id,
        price: parseFloat(newFoodItem.price),
        diet_type: newFoodItem.diet_type,
        description: newFoodItem.description,
        image_url: newFoodItem.image_url || '/logo.jpg',
        is_available: newFoodItem.is_available
      });
      alert(`Food item "${newFoodItem.name}" created successfully!`);
      setIsAddFoodOpen(false);
      setNewFoodItem({ name: '', category_id: categoriesList[0]?.id || '', price: '', diet_type: 'veg', description: '', image_url: '', is_available: true });
      fetchAdminData();
    } catch (err) {
      alert(err.message || "Failed to add food item.");
    }
  };

  const handleUpdateFoodItemModal = async () => {
    try {
      if (!editingFoodModalItem) return;
      await api.updateFoodItem(editingFoodModalItem.id, {
        name: editingFoodModalItem.name,
        price: parseFloat(editingFoodModalItem.price),
        description: editingFoodModalItem.description,
        image_url: editingFoodModalItem.image_url,
        diet_type: editingFoodModalItem.diet_type
      });
      alert("Food item updated successfully!");
      setEditingFoodModalItem(null);
      fetchAdminData();
    } catch (err) {
      alert(err.message || "Failed to update food item.");
    }
  };

  const handleOpenEditFoodModal = (item) => {
    setEditingFoodItem({
      id: item.id,
      name: item.name || '',
      category_id: item.category_id || (categoriesList[0]?.id || ''),
      price: item.price !== undefined ? item.price : '',
      diet_type: item.diet_type || 'veg',
      description: item.description || '',
      image_url: item.image_url || '',
      is_available: item.is_available !== false
    });
    setIsEditFoodOpen(true);
  };

  const handleSaveEditFoodItem = async () => {
    if (!editingFoodItem.name || !editingFoodItem.category_id || editingFoodItem.price === '') {
      alert("Please fill in Dish Name, Category, and Price.");
      return;
    }
    try {
      const res = await api.updateFoodItem(editingFoodItem.id, {
        name: editingFoodItem.name,
        category_id: editingFoodItem.category_id,
        price: parseFloat(editingFoodItem.price),
        diet_type: editingFoodItem.diet_type,
        description: editingFoodItem.description,
        image_url: editingFoodItem.image_url,
        is_available: editingFoodItem.is_available
      });

      const updatedDish = res.data || {};
      const catName = categoriesList.find(c => c.id === editingFoodItem.category_id)?.name;
      setFoodItems(foodItems.map(f => f.id === editingFoodItem.id ? {
        ...f,
        name: updatedDish.name || editingFoodItem.name,
        category_id: updatedDish.category_id || editingFoodItem.category_id,
        category_name: updatedDish.category_name || catName || f.category_name,
        price: updatedDish.price !== undefined ? updatedDish.price : editingFoodItem.price,
        diet_type: updatedDish.diet_type || editingFoodItem.diet_type,
        description: updatedDish.description !== undefined ? updatedDish.description : editingFoodItem.description,
        image_url: updatedDish.image_url || editingFoodItem.image_url,
        is_available: updatedDish.is_available !== undefined ? updatedDish.is_available : editingFoodItem.is_available
      } : f));

      setIsEditFoodOpen(false);
      alert(`Updated all details for ${editingFoodItem.name} successfully!`);
    } catch (err) {
      alert(err.message || "Failed to update dish details.");
    }
  };

  const handleEditImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingFoodItem(prev => ({ ...prev, image_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };


  const handleAssignOrder = async (orderId, partnerId) => {
    if (!partnerId) return;
    try {
      await api.assignOrder(orderId, partnerId);
      alert("Order assigned & delivery partner status updated!");
      fetchAdminData();
    } catch (err) {
      alert(err.message || "Failed to assign order.");
    }
  };

  const handleUpdateFeedbackStatus = async (fbId, status, adminReply = null) => {
    try {
      const existing = feedbacks.find(f => f.id === fbId);
      const replyToSend = adminReply !== null ? adminReply : (existing?.admin_reply || '');
      await api.updateFeedbackStatus(fbId, status, replyToSend);
      setFeedbacks(feedbacks.map(f => f.id === fbId ? { ...f, status, admin_reply: replyToSend } : f));
    } catch (err) {
      alert(err.message || "Failed to update status.");
    }
  };

  // Filter orders by status & date range
  const filteredOrders = orders.filter(o => {
    const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    
    let matchesDate = true;
    if (orderDateFilter !== 'ALL' && o.created_at) {
      const orderDate = new Date(o.created_at);
      const now = new Date();
      const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);

      if (orderDateFilter === 'TODAY') {
        matchesDate = orderDate.toDateString() === now.toDateString();
      } else if (orderDateFilter === 'YESTERDAY') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        matchesDate = orderDate.toDateString() === yesterday.toDateString();
      } else if (orderDateFilter === 'WEEK') {
        matchesDate = diffDays <= 7;
      }
    }

    return matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <div style={{ background: '#0a0a0a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <Loader2 className="animate-spin" size={48} />
        <span style={{ marginLeft: '15px', fontSize: '1.2rem' }}>Syncing Admin Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', display: 'flex' }}>
      <Sidebar role="admin" activeView={activeView} onViewChange={setActiveView} />
      
      <div className="dashboard-main" style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        


        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {activeView === 'overview' && "Dashboard Overview"}
              {activeView === 'orders' && "Order Management & History"}
              {activeView === 'customers' && "Customer Database"}
              {activeView === 'delivery_partners' && "Fleet Directory & Availability"}
              {activeView === 'menu_management' && "Food Menu & Out-of-Stock Updates"}
              {activeView === 'feedback_reports' && "Customer Feedback & Reports"}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
              Manage system metrics, staff, customer reports & live orders
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={fetchAdminData} className="glass-panel" style={{ padding: '10px 16px', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
              <Clock size={16} /> Refresh Data
            </button>
            {activeView === 'delivery_partners' && (
              <button className="btn-primary" style={{ padding: '10px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', fontSize: '0.88rem' }} onClick={() => setIsAddPartnerOpen(true)}>
                <Plus size={18} /> Add Staff / Partner
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 18px', color: '#f87171', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>


        {/* OVERVIEW TAB */}
        {activeView === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              {statsData.map((stat, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: '25px', borderRadius: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }}>{stat.icon}</div>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>{stat.label}</p>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px' }}>{stat.value}</h2>
                </div>
              ))}
            </div>

            {/* Quick Actions & Recent Orders Preview */}
            <div className="glass-panel" style={{ padding: '25px', borderRadius: '24px', marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '15px' }}>Recent Customer Activity</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: '#D97706', marginBottom: '8px' }}>🚀 Live Fleet Status</h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                    {deliveryPartners.filter(p => p.partner_status === 'AVAILABLE').length} Available, {deliveryPartners.filter(p => p.partner_status === 'ON_DELIVERY').length} On Active Delivery
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: '#3B82F6', marginBottom: '8px' }}>📦 Pending Orders</h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                    {orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length} Orders awaiting delivery driver assignment
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB WITH HISTORY & DATE/STATUS FILTERS */}
        {activeView === 'orders' && (
          <div>
            {/* Filter Bar */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Filter size={18} style={{ color: '#D97706' }} />
                <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Filters:</span>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Date Filter */}
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginRight: '8px' }}>Date:</label>
                  <select
                    value={orderDateFilter}
                    onChange={e => setOrderDateFilter(e.target.value)}
                    style={{ background: '#1e293b', color: 'white', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="ALL">All Time</option>
                    <option value="TODAY">Today</option>
                    <option value="YESTERDAY">Yesterday</option>
                    <option value="WEEK">Last 7 Days</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginRight: '8px' }}>Status:</label>
                  <select
                    value={orderStatusFilter}
                    onChange={e => setOrderStatusFilter(e.target.value)}
                    style={{ background: '#1e293b', color: 'white', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">PENDING</option>
                    <option value="PREPARING">PREPARING</option>
                    <option value="READY_FOR_PICKUP">READY FOR PICKUP</option>
                    <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="glass-panel" style={{ padding: '25px', borderRadius: '24px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse' }}>

                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px' }}>ORDER #</th>
                    <th style={{ padding: '12px' }}>DATE</th>
                    <th style={{ padding: '12px' }}>ADDRESS</th>
                    <th style={{ padding: '12px' }}>TOTAL</th>
                    <th style={{ padding: '12px' }}>STATUS</th>
                    <th style={{ padding: '12px' }}>ASSIGN PARTNER</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#D97706' }}>#{o.order_number}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{new Date(o.created_at).toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', maxWidth: '200px' }}>{o.delivery_landmark || o.delivery_address}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>₹{o.total_amount}</td>
                      <td style={{ padding: '12px' }}>
                        {o.status === 'DELIVERED' || o.status === 'CANCELLED' ? (
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            background: o.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: o.status === 'DELIVERED' ? '#10B981' : '#EF4444',
                            border: `1px solid ${o.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}>
                            {o.status} (Locked)
                          </span>
                        ) : (
                          <select
                            value={o.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              if (newStatus === 'OUT_FOR_DELIVERY' && !o.delivery_partner_id) {
                                alert("Cannot set status to OUT_FOR_DELIVERY without an assigned delivery partner. Please assign a driver first.");
                                return;
                              }
                              try {
                                await api.updateOrderStatus(o.id, newStatus);
                                alert(`Order status updated to ${newStatus}!`);
                                fetchAdminData();
                              } catch (err) {
                                alert(err.message || "Failed to update order status.");
                              }
                            }}
                            style={{
                              background: '#1e293b',
                              color: o.status === 'DELIVERED' ? '#10B981' : o.status === 'OUT_FOR_DELIVERY' ? '#3B82F6' : '#F59E0B',
                              padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer'
                            }}
                          >
                            <option value="PENDING" style={{ color: 'white' }}>PENDING</option>
                            <option value="CONFIRMED" style={{ color: 'white' }}>CONFIRMED</option>
                            <option value="PREPARING" style={{ color: 'white' }}>PREPARING</option>
                            <option value="READY_FOR_PICKUP" style={{ color: 'white' }}>READY FOR PICKUP</option>
                            <option value="OUT_FOR_DELIVERY" disabled={!o.delivery_partner_id} style={{ color: !o.delivery_partner_id ? 'rgba(255,255,255,0.3)' : 'white' }}>
                              OUT FOR DELIVERY {!o.delivery_partner_id ? '(Requires Driver)' : ''}
                            </option>
                            <option value="DELIVERED" style={{ color: 'white' }}>DELIVERED</option>
                            <option value="CANCELLED" style={{ color: 'white' }}>CANCELLED</option>
                          </select>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          disabled={o.status === 'DELIVERED' || o.status === 'CANCELLED'}
                          value={o.delivery_partner_id || ''}
                          onChange={e => handleAssignOrder(o.id, e.target.value)}
                          style={{
                            background: '#1e293b',
                            color: o.status === 'DELIVERED' || o.status === 'CANCELLED' ? 'rgba(255,255,255,0.4)' : 'white',
                            padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem',
                            cursor: o.status === 'DELIVERED' || o.status === 'CANCELLED' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <option value="">Select Driver</option>
                          {deliveryPartners.map(p => (
                            <option key={p.id} value={p.id}>{p.full_name} ({p.partner_status || 'AVAILABLE'})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                        No orders match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB WITH CLICKABLE INDIVIDUAL USER DETAILS MODAL */}
        {activeView === 'customers' && (
          <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <h3 style={{ marginBottom: '20px' }}>Registered Customers (Click name for detailed view)</h3>
            <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse' }}>

              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '15px' }}>NAME (CLICK FOR DETAILS)</th>
                  <th style={{ padding: '15px' }}>EMAIL</th>
                  <th style={{ padding: '15px' }}>PHONE</th>
                  <th style={{ padding: '15px' }}>JOINED DATE</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => handleFetchUserDetails(c)}
                        style={{ background: 'none', border: 'none', color: '#D97706', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {c.full_name || c.name}
                      </button>
                    </td>
                    <td style={{ padding: '15px', opacity: 0.7 }}>{c.email}</td>
                    <td style={{ padding: '15px' }}>{c.phone || 'N/A'}</td>
                    <td style={{ padding: '15px', fontSize: '0.85rem', opacity: 0.5 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleFetchUserDetails(c)}>
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DELIVERY PARTNERS & LIVE WORK STATUS TAB */}
        {activeView === 'delivery_partners' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {deliveryPartners.map((p, i) => (
              <div key={i} className="glass-panel" style={{ padding: '25px', borderRadius: '24px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bike size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem' }}>{p.full_name || p.name}</h3>
                        <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>{p.role}</p>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold',
                      background: p.partner_status === 'AVAILABLE' ? 'rgba(16,185,129,0.2)' : p.partner_status === 'ON_DELIVERY' ? 'rgba(245,158,11,0.2)' : 'rgba(139,92,246,0.2)',
                      color: p.partner_status === 'AVAILABLE' ? '#10B981' : p.partner_status === 'ON_DELIVERY' ? '#F59E0B' : '#8B5CF6'
                    }}>
                      {p.partner_status || 'AVAILABLE'}
                    </span>
                  </div>
                  <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '15px' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} style={{ color: '#3B82F6' }} /> {p.phone || 'N/A'}</p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} style={{ color: '#8B5CF6' }} /> {p.email}</p>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={13} /> Joined: {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>

                  {/* COD Deliveries & Cash Collected Summary Card */}
                  <div style={{
                    padding: '16px', borderRadius: '14px', marginBottom: '18px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(16, 185, 129, 0.08) 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.25)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#F59E0B', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      <Banknote size={18} />
                      <span>Cash On Delivery (COD) Summary</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '0.7rem', opacity: 0.7, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>THIS WEEK COD</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981', margin: '3px 0 0 0' }}>
                          {p.weekly_cod_count || 0} <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>Deliveries</span>
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#F59E0B', fontWeight: 'bold', margin: '2px 0 0 0' }}>
                          ₹{(p.weekly_cod_amount || 0).toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Cash</span>
                        </p>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '0.7rem', opacity: 0.7, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>OVERALL COD</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3B82F6', margin: '3px 0 0 0' }}>
                          {p.overall_cod_count || 0} <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>Deliveries</span>
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#F59E0B', fontWeight: 'bold', margin: '2px 0 0 0' }}>
                          ₹{(p.overall_cod_amount || 0).toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Cash</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ width: '100%', padding: '10px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => handleFetchUserDetails(p)}
                >
                  <Eye size={16} /> View Partner Delivery History
                </button>
              </div>
            ))}
          </div>
        )}

        {/* FOOD MENU MANAGEMENT & OUT OF STOCK TOGGLE TAB */}
        {activeView === 'menu_management' && (
          <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>Food Catalog, Pricing & Stock Controls</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Manage dish details, pricing, categories, sample images, and availability.</p>
              </div>
              <button
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
                onClick={() => setIsAddFoodOpen(true)}
              >
                <Plus size={18} /> Add New Dish
              </button>
            </div>
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '15px' }}>DISH IMAGE</th>
                    <th style={{ padding: '15px' }}>DISH NAME</th>
                    <th style={{ padding: '15px' }}>CATEGORY</th>
                    <th style={{ padding: '15px' }}>PRICE</th>
                    <th style={{ padding: '15px' }}>DIET</th>
                    <th style={{ padding: '15px' }}>AVAILABILITY STATUS</th>
                    <th style={{ padding: '15px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {foodItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      {/* Dish Image Thumbnail */}
                      <td style={{ padding: '15px' }}>
                        <img
                          src={item.image_url || '/logo.jpg'}
                          alt={item.name}
                          style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                          onClick={() => handleOpenEditFoodModal(item)}
                          title="Click to edit dish details"
                          onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
                        />
                      </td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.name}</td>
                      <td style={{ padding: '15px', opacity: 0.7 }}>{item.category_name}</td>
                      
                      {/* Price */}
                      <td style={{ padding: '15px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#10B981' }}>₹{item.price}</span>
                      </td>

                      <td style={{ padding: '15px', textTransform: 'capitalize' }}>{item.diet_type}</td>
                      <td style={{ padding: '15px' }}>
                        {item.is_available !== false ? (
                          <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> IN STOCK
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={12} /> OUT OF STOCK
                          </span>
                        )}
                      </td>
                      
                      {/* Actions: Edit Details Modal & Quick Stock Toggle */}
                      <td style={{ padding: '15px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                            onClick={() => handleOpenEditFoodModal(item)}
                          >
                            <Edit3 size={14} /> Edit Details
                          </button>
                          <button
                            onClick={() => handleToggleFoodStock(item)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap',
                              background: item.is_available !== false ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: item.is_available !== false ? '#10B981' : '#F87171',
                              border: `1px solid ${item.is_available !== false ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                            }}
                          >
                            <div style={{
                              width: '28px', height: '16px', borderRadius: '10px',
                              background: item.is_available !== false ? '#10B981' : '#4B5563',
                              position: 'relative', transition: 'all 0.2s ease', padding: '2px'
                            }}>
                              <div style={{
                                width: '12px', height: '12px', borderRadius: '50%', background: 'white',
                                transform: item.is_available !== false ? 'translateX(12px)' : 'translateX(0px)',
                                transition: 'transform 0.2s ease'
                              }} />
                            </div>
                            {item.is_available !== false ? 'In Stock' : 'Out of Stock'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>
        )}


        {/* CUSTOMER FEEDBACK & REPORTS TAB */}
        {activeView === 'feedback_reports' && (
          <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>Customer Support Tickets & Feedback</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {feedbacks.map(fb => (
                <div key={fb.id} className="glass-panel" style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', borderLeft: `4px solid ${fb.status === 'RESOLVED' ? '#10B981' : fb.status === 'IN_REVIEW' ? '#3B82F6' : '#F59E0B'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.15rem', marginBottom: '4px', color: '#D97706' }}>{fb.subject}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                        From: <strong>{fb.name}</strong> ({fb.email}) • {new Date(fb.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Status:</label>
                      <select
                        value={fb.status}
                        onChange={e => handleUpdateFeedbackStatus(fb.id, e.target.value)}
                        style={{ background: '#1e293b', color: 'white', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        <option value="NEW">NEW</option>
                        <option value="READ">READ</option>
                        <option value="IN_REVIEW">IN REVIEW</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </div>
                  </div>
                  <p style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', fontSize: '0.95rem', lineHeight: '1.5', border: '1px solid rgba(255,255,255,0.05)' }}>
                    "{fb.message}"
                  </p>

                  {/* ADMIN REPLY SECTION */}
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#60a5fa', marginBottom: '6px', fontWeight: '600' }}>
                      💬 Admin Reply to Customer:
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Type official response to customer..."
                        defaultValue={fb.admin_reply || ''}
                        id={`reply-input-${fb.id}`}
                        style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.9rem' }}
                      />
                      <button
                        className="btn-primary"
                        style={{ padding: '8px 18px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        onClick={() => {
                          const inputEl = document.getElementById(`reply-input-${fb.id}`);
                          const val = inputEl ? inputEl.value : '';
                          const nextStatus = fb.status === 'NEW' ? 'IN_REVIEW' : fb.status;
                          handleUpdateFeedbackStatus(fb.id, nextStatus, val);
                          alert('Reply saved successfully!');
                        }}
                      >
                        Send Reply
                      </button>
                    </div>
                    {fb.admin_reply && (
                      <p style={{ marginTop: '8px', fontSize: '0.82rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✓ Active Response Sent:</span> <em>"{fb.admin_reply}"</em>
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {feedbacks.length === 0 && (
                <p style={{ textAlign: 'center', opacity: 0.5, padding: '40px' }}>No customer feedback submitted yet.</p>
              )}
            </div>
          </div>
        )}

        {/* USER DETAILS MODAL (Clicking user name in table) */}
        {selectedUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>User Details: {selectedUser.full_name || selectedUser.name}</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>ID: {selectedUser.id}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              {userModalLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" size={32} /></div>
              ) : (
                (() => {
                  const userOrdersList = selectedUser.role === 'delivery_partner'
                    ? ((selectedUser.assigned_orders && selectedUser.assigned_orders.length > 0) ? selectedUser.assigned_orders : (selectedUser.orders || []))
                    : (selectedUser.orders || []);
                  const deliveredCount = userOrdersList.filter(o => o.status === 'DELIVERED').length;

                  return (
                    <div>
                      {/* Profile Summary Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: selectedUser.role === 'delivery_partner' ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>EMAIL</p>
                          <p style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{selectedUser.email}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>PHONE</p>
                          <p style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{selectedUser.phone || 'N/A'}</p>
                        </div>
                        {selectedUser.role === 'delivery_partner' ? (
                          <>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>DUTY STATUS</p>
                              <p style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#10B981' }}>{selectedUser.partner_status || 'AVAILABLE'}</p>
                            </div>
                            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '15px', borderRadius: '12px' }}>
                              <p style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 'bold' }}>WEEKLY COD CASH</p>
                              <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10B981' }}>
                                ₹{selectedUser.weekly_cod_amount || 0} <span style={{ fontSize: '0.75rem', color: 'white' }}>({selectedUser.weekly_cod_count || 0} COD)</span>
                              </p>
                            </div>
                            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', padding: '15px', borderRadius: '12px' }}>
                              <p style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold' }}>OVERALL COD CASH</p>
                              <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#3B82F6' }}>
                                ₹{selectedUser.overall_cod_amount || 0} <span style={{ fontSize: '0.75rem', color: 'white' }}>({selectedUser.overall_cod_count || 0} COD)</span>
                              </p>
                            </div>
                          </>
                        ) : (
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>TOTAL SPENT</p>
                            <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#10B981' }}>₹{selectedUser.total_spent || 0}</p>
                          </div>
                        )}
                      </div>

                      {/* Orders History / Delivery History */}
                      <h4 style={{ marginBottom: '12px' }}>
                        {selectedUser.role === 'delivery_partner' ? 'Assigned Delivery History & Tasks' : 'Order History'} ({userOrdersList.length})
                      </h4>
                      
                      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {userOrdersList.map(ord => (
                          <div key={ord.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                <p style={{ fontWeight: 'bold', color: '#D97706', fontSize: '0.95rem' }}>#{ord.order_number}</p>
                                {ord.customer_name && (
                                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                                    Customer: {ord.customer_name}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{new Date(ord.created_at).toLocaleString()}</p>
                              {ord.delivery_address && (
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>📍 {ord.delivery_address}</p>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#10B981' }}>₹{ord.total_amount}</p>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px',
                                  background: ord.payment_method === 'COD' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                                  color: ord.payment_method === 'COD' ? '#F59E0B' : '#60a5fa',
                                  border: `1px solid ${ord.payment_method === 'COD' ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.4)'}`
                                }}>
                                  {ord.payment_method || 'COD'}
                                </span>
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px',
                                  background: ord.status === 'DELIVERED' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                                  color: ord.status === 'DELIVERED' ? '#10B981' : '#F59E0B'
                                }}>
                                  {ord.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {userOrdersList.length === 0 && (
                          <p style={{ opacity: 0.5, fontSize: '0.9rem', textAlign: 'center', padding: '30px' }}>
                            No records found for this user.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* Modal Add Partner */}
        {isAddPartnerOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '30px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3>Register Staff / Partner</h3>
                <button onClick={() => setIsAddPartnerOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                  type="text" 
                  className="glass-panel w-100" 
                  style={{ padding: '15px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} 
                  placeholder="Full Name" 
                  value={newPartner.name} 
                  onChange={e => setNewPartner({...newPartner, name: e.target.value})} 
                />
                <input 
                  type="email" 
                  className="glass-panel w-100" 
                  style={{ padding: '15px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} 
                  placeholder="Login Email" 
                  value={newPartner.email} 
                  onChange={e => setNewPartner({...newPartner, email: e.target.value})} 
                />
                <input 
                  type="password" 
                  className="glass-panel w-100" 
                  style={{ padding: '15px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} 
                  placeholder="Login Password" 
                  value={newPartner.password} 
                  onChange={e => setNewPartner({...newPartner, password: e.target.value})} 
                />
                <select
                  style={{ padding: '15px', color: 'white', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  value={newPartner.role}
                  onChange={e => setNewPartner({...newPartner, role: e.target.value})}
                >
                  <option value="delivery_partner">Delivery Partner</option>
                  <option value="admin">Admin</option>
                </select>
                <button 
                  className="btn-primary w-100" 
                  style={{ padding: '16px', fontWeight: 'bold', fontSize: '1rem', marginTop: '10px' }}
                  onClick={handleCreateStaff}
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Add Food Item with Image File Upload */}
        {isAddFoodOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '30px', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ fontSize: '1.4rem' }}>Add New Dish to Menu</h3>
                <button onClick={() => setIsAddFoodOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                  <X size={22} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Dish Name *</label>
                  <input 
                    type="text" 
                    className="glass-panel w-100" 
                    style={{ padding: '12px 16px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' }} 
                    placeholder="e.g. Paneer Butter Masala" 
                    value={newFoodItem.name} 
                    onChange={e => setNewFoodItem({...newFoodItem, name: e.target.value})} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Category *</label>
                    <select
                      style={{ padding: '12px', color: 'white', background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', width: '100%' }}
                      value={newFoodItem.category_id}
                      onChange={e => setNewFoodItem({...newFoodItem, category_id: e.target.value})}
                    >
                      {categoriesList.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Price (₹) *</label>
                    <input 
                      type="number"
                      step="0.01" 
                      className="glass-panel w-100" 
                      style={{ padding: '12px 16px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' }} 
                      placeholder="e.g. 199.00" 
                      value={newFoodItem.price} 
                      onChange={e => setNewFoodItem({...newFoodItem, price: e.target.value})} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Diet Preference</label>
                    <select
                      style={{ padding: '12px', color: 'white', background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', width: '100%' }}
                      value={newFoodItem.diet_type}
                      onChange={e => setNewFoodItem({...newFoodItem, diet_type: e.target.value})}
                    >
                      <option value="veg">🟢 Veg</option>
                      <option value="non-veg">🔴 Non-Veg</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Stock Status</label>
                    <select
                      style={{ padding: '12px', color: 'white', background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', width: '100%' }}
                      value={newFoodItem.is_available ? "true" : "false"}
                      onChange={e => setNewFoodItem({...newFoodItem, is_available: e.target.value === "true"})}
                    >
                      <option value="true">● In Stock</option>
                      <option value="false">✖ Out of Stock</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Description</label>
                  <textarea 
                    rows={2}
                    className="glass-panel w-100" 
                    style={{ padding: '12px 16px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none', resize: 'none' }} 
                    placeholder="Short description of ingredients..." 
                    value={newFoodItem.description} 
                    onChange={e => setNewFoodItem({...newFoodItem, description: e.target.value})} 
                  />
                </div>

                {/* Sample Food Image File Upload Input */}
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Dish Sample Image Upload</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', width: '100%', cursor: 'pointer' }}
                  />
                  {newFoodItem.image_url && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={newFoodItem.image_url} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #10B981' }} />
                      <span style={{ fontSize: '0.8rem', color: '#10B981' }}>✓ Sample image ready for dish catalog</span>
                    </div>
                  )}
                </div>

                <button 
                  className="btn-primary w-100" 
                  style={{ padding: '15px', fontWeight: 'bold', fontSize: '1rem', marginTop: '10px' }}
                  onClick={handleAddFoodItem}
                >
                  Create & Save Food Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Single Edit Dish Details (Category, Name, Price, Diet, Availability, Description & Image in a single update) */}
        {isEditFoodOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '30px', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem' }}>Edit Dish Details</h3>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Update all dish information in a single update request</p>
                </div>
                <button onClick={() => setIsEditFoodOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                  <X size={22} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Dish Name *</label>
                  <input 
                    type="text" 
                    className="glass-panel w-100" 
                    style={{ padding: '12px 16px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' }} 
                    placeholder="e.g. Paneer Butter Masala" 
                    value={editingFoodItem.name} 
                    onChange={e => setEditingFoodItem({ ...editingFoodItem, name: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Category *</label>
                    <select
                      style={{ padding: '12px', color: 'white', background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', width: '100%' }}
                      value={editingFoodItem.category_id}
                      onChange={e => setEditingFoodItem({ ...editingFoodItem, category_id: e.target.value })}
                    >
                      {categoriesList.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Price (₹) *</label>
                    <input 
                      type="number"
                      step="0.01" 
                      className="glass-panel w-100" 
                      style={{ padding: '12px 16px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' }} 
                      placeholder="e.g. 199.00" 
                      value={editingFoodItem.price} 
                      onChange={e => setEditingFoodItem({ ...editingFoodItem, price: e.target.value })} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Diet Preference</label>
                    <select
                      style={{ padding: '12px', color: 'white', background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', width: '100%' }}
                      value={editingFoodItem.diet_type}
                      onChange={e => setEditingFoodItem({ ...editingFoodItem, diet_type: e.target.value })}
                    >
                      <option value="veg">🟢 Veg</option>
                      <option value="non-veg">🔴 Non-Veg</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Availability Status</label>
                    <select
                      style={{ padding: '12px', color: 'white', background: '#121212', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', width: '100%' }}
                      value={editingFoodItem.is_available ? "true" : "false"}
                      onChange={e => setEditingFoodItem({ ...editingFoodItem, is_available: e.target.value === "true" })}
                    >
                      <option value="true">● In Stock (Available)</option>
                      <option value="false">✖ Out of Stock</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Description</label>
                  <textarea 
                    rows={3}
                    className="glass-panel w-100" 
                    style={{ padding: '12px 16px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none', resize: 'none' }} 
                    placeholder="Short description of ingredients..." 
                    value={editingFoodItem.description} 
                    onChange={e => setEditingFoodItem({ ...editingFoodItem, description: e.target.value })} 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', display: 'block' }}>Dish Sample Image Upload</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleEditImageFileUpload}
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', width: '100%', cursor: 'pointer' }}
                  />
                  {editingFoodItem.image_url && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={editingFoodItem.image_url} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #10B981' }} />
                      <span style={{ fontSize: '0.8rem', color: '#10B981' }}>✓ Image preview ready</span>
                    </div>
                  )}
                </div>

                <button 
                  className="btn-primary w-100" 
                  style={{ padding: '15px', fontWeight: 'bold', fontSize: '1rem', marginTop: '10px' }}
                  onClick={handleSaveEditFoodItem}
                >
                  Save All Changes (Single Update)
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default AdminDashboard;
