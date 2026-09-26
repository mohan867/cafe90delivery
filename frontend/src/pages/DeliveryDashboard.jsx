import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Bike, ShoppingBag, Clock, DollarSign, CheckCircle, Loader2, HandMetal, Shield, Calendar, MapPin, LogOut, Camera } from 'lucide-react';
import { api } from '../services/api';
import './Dashboard.css';

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };
  const [user, setUser] = useState(null);
  const [availablePool, setAvailablePool] = useState([]);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [partnerWorkStatus, setPartnerWorkStatus] = useState('AVAILABLE');
  const [statsSummary, setStatsSummary] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchDeliveryData(true);

    // Live background polling every 5 seconds without DOM unmount or screen flickering
    const interval = setInterval(() => {
      fetchDeliveryData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Live GPS Location Watch Broadcast for Delivery Partner
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await api.updatePartnerLocation({ latitude, longitude });
        } catch (e) {
          // Ignore background location sync errors silently
        }
      },
      (err) => console.warn('Partner GPS watch warning:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const fetchDeliveryData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [poolRes, assignedRes, statsRes] = await Promise.all([
        api.getAvailablePool().catch(() => ({ data: [] })),
        api.getAssignedOrders().catch(() => ({ data: [] })),
        api.getDeliveryStats().catch(() => ({ data: null }))
      ]);

      setAvailablePool(poolRes.data || []);
      setAssignedOrders(assignedRes.data || []);
      if (statsRes.data) {
        setStatsSummary(statsRes.data);
        if (statsRes.data.partner_status) {
          setPartnerWorkStatus(statsRes.data.partner_status);
        }
      }
    } catch (err) {
      console.error('Failed to sync delivery data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const takeTask = async (orderId) => {
    try {
      await api.claimDeliveryTask(orderId);
      alert('Task claimed successfully! Your status is now set to ON DELIVERY.');
      fetchDeliveryData();
    } catch (err) {
      alert(err.message || 'Failed to claim task.');
      fetchDeliveryData();
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.updateDeliveryStatus(orderId, newStatus);
      if (newStatus === 'DELIVERED') {
        alert('Order delivered! If no tasks remain, your status automatically resets to AVAILABLE.');
      }
      fetchDeliveryData();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleUpdateWorkStatus = async (newStatus) => {
    if (isStatusLocked) {
      alert('Cannot change availability status while currently on an active delivery task.');
      return;
    }
    try {
      await api.updatePartnerWorkStatus(newStatus);
      setPartnerWorkStatus(newStatus);
      alert(`Your availability status updated to: ${newStatus}`);
    } catch (err) {
      alert(err.message || 'Failed to update work status.');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploadingAvatar(true);
        const base64Data = reader.result;
        const res = await api.updatePartnerAvatar(base64Data);
        if (res && res.data) {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
          alert('Profile picture updated successfully!');
        }
      } catch (err) {
        alert(err.message || 'Failed to update profile picture.');
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const activeAssignedTasks = assignedOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const isStatusLocked = partnerWorkStatus === 'ON_DELIVERY' || activeAssignedTasks.length > 0;
  const completedDeliveries = assignedOrders.filter(o => o.status === 'DELIVERED');

  const stats = [
    { label: "My Active Tasks", value: activeAssignedTasks.length, icon: <Clock size={20} />, color: '#F59E0B' },
    { label: "Available Pool", value: availablePool.length, icon: <ShoppingBag size={20} />, color: '#3B82F6' },
    { label: "My Deliveries", value: statsSummary ? statsSummary.delivered_count : completedDeliveries.length, icon: <CheckCircle size={20} />, color: '#10B981' },
    { label: "My Earnings", value: `₹${statsSummary ? statsSummary.total_earnings : completedDeliveries.length * 40}`, icon: <DollarSign size={20} />, color: '#8B5CF6' }
  ];

  if (loading) {
    return (
      <div style={{ background: '#0a0a0a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <Loader2 className="animate-spin" size={48} />
        <span style={{ marginLeft: '15px', fontSize: '1.2rem' }}>Scanning Delivery Pool & Status...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', display: 'flex' }}>
      <Sidebar role="delivery" activeView={activeView} onViewChange={setActiveView} />
      
      <div className="dashboard-main" style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {activeView === 'dashboard' && `Hello, ${user?.full_name || user?.name || 'Partner'}!`}
              {activeView === 'assigned' && "Order Pool & Tasks"}
              {activeView === 'deliveries' && "Past Deliveries History"}
              {activeView === 'earnings' && "Earnings & Payouts"}
              {activeView === 'profile' && "Partner Profile"}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
              {isStatusLocked ? 'You are currently on active delivery duty.' : `There are ${availablePool.length} available tasks in the pool right now.`}
            </p>
          </div>

          <div className="header-action-row" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {/* Work / Availability / Leave Status Selector */}
            <div className="glass-panel" style={{ padding: '10px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: partnerWorkStatus === 'AVAILABLE' ? '#10B981' : partnerWorkStatus === 'ON_DELIVERY' ? '#F59E0B' : '#8B5CF6', boxShadow: '0 0 10px currentColor' }}></div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '0.7rem', color: isStatusLocked ? '#F59E0B' : 'rgba(255,255,255,0.5)' }}>
                   {isStatusLocked ? 'STATUS LOCKED (ON DELIVERY)' : 'WORK & LEAVE STATUS'}
                 </span>
                 <select
                   value={partnerWorkStatus}
                   disabled={isStatusLocked}
                   onChange={e => handleUpdateWorkStatus(e.target.value)}
                   style={{
                     background: '#1e293b', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: '6px', padding: '4px 8px', fontSize: '0.85rem', fontWeight: 'bold',
                     cursor: isStatusLocked ? 'not-allowed' : 'pointer', opacity: isStatusLocked ? 0.7 : 1
                   }}
                   title={isStatusLocked ? "Status locked while on an active delivery order" : "Select availability status"}
                 >
                   <option value="AVAILABLE">AVAILABLE (On Duty)</option>
                   <option value="ON_DELIVERY">ON DELIVERY (Active)</option>
                   <option value="ON_LEAVE">ON LEAVE (Apply Leave)</option>
                   <option value="OFF_DUTY">OFF DUTY</option>
                 </select>
               </div>
            </div>

            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 18px', color: '#f87171', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {activeView === 'dashboard' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              {stats.map((stat, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: '25px', borderRadius: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }}>{stat.icon}</div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>{stat.label}</p>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stat.value}</h2>
                </div>
              ))}
            </div>

            {/* My Active Tasks */}
            {activeAssignedTasks.length > 0 && (
              <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px', marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '25px', color: '#F59E0B' }}>My Active Assignments</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {activeAssignedTasks.map((order, i) => (
                    <div key={i} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'rgba(245, 158, 11, 0.05)' }}>
                      <div>
                        <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{order.customer_name} <span style={{ opacity: 0.4 }}>#{order.order_number}</span></p>
                        <p style={{ fontSize: '0.85rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} style={{ color: '#F59E0B' }} /> {order.delivery_address}</p>
                        <p style={{ fontSize: '0.8rem', color: '#D97706', marginTop: '4px' }}>Items: {order.items ? order.items.map(it => `${it.name} x${it.quantity}`).join(', ') : 'Order Items'}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <select 
                          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 14px', borderRadius: '10px', outline: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        >
                          <option value={order.status} disabled style={{ background: '#1a1a1a' }}>Status: {order.status}</option>
                          {order.status !== 'OUT_FOR_DELIVERY' && (
                            <option value="OUT_FOR_DELIVERY" style={{ background: '#1a1a1a' }}>🛵 Start Delivery (Out for Delivery)</option>
                          )}
                          <option value="DELIVERED" style={{ background: '#1a1a1a' }}>✓ Mark as Delivered</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Pool */}
            <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '25px' }}>Live Order Pool</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {availablePool.map((order, i) => (
                  <div key={i} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                       <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <HandMetal size={24} />
                       </div>
                       <div>
                          <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{order.customer_name || 'Customer'} <span style={{ opacity: 0.3, fontWeight: 'normal' }}>#{order.order_number}</span></p>
                          <p style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} style={{ color: '#3B82F6' }} /> {order.delivery_address}</p>
                          <p style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '2px' }}>Payout: ₹40.00 Incentive</p>
                       </div>
                    </div>
                    
                    <button 
                      className="btn-primary" 
                      style={{ padding: '10px 25px', borderRadius: '12px' }}
                      onClick={() => takeTask(order.id)}
                      disabled={partnerWorkStatus === 'ON_LEAVE'}
                    >
                      {partnerWorkStatus === 'ON_LEAVE' ? 'On Leave' : 'Take Task'}
                    </button>
                  </div>
                ))}
                {availablePool.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px', opacity: 0.3 }}>
                     <Bike size={48} style={{ marginBottom: '15px' }} />
                     <p>No available tasks in the pool. Stay tuned!</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Deliveries History View */}
        {activeView === 'deliveries' && (
          <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px' }}>
             <h3 style={{ marginBottom: '20px' }}>Delivery Order History</h3>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                   <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '15px' }}>ORDER #</th>
                      <th style={{ padding: '15px' }}>ADDRESS</th>
                      <th style={{ padding: '15px' }}>DATE</th>
                      <th style={{ padding: '15px' }}>STATUS</th>
                      <th style={{ padding: '15px', textAlign: 'right' }}>INCENTIVE EARNED</th>
                   </tr>
                </thead>
                <tbody>
                   {assignedOrders.map((o, i) => (
                     <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '15px', fontWeight: 'bold', color: '#D97706' }}>#{o.order_number}</td>
                        <td style={{ padding: '15px', fontSize: '0.85rem' }}>{o.delivery_landmark || o.delivery_address}</td>
                        <td style={{ padding: '15px', fontSize: '0.85rem', opacity: 0.6 }}>{new Date(o.created_at).toLocaleString()}</td>
                        <td style={{ padding: '15px' }}>
                          <span style={{ color: o.status === 'DELIVERED' ? '#10B981' : '#F59E0B', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {o.status === 'DELIVERED' ? '✓ Delivered' : o.status}
                          </span>
                        </td>
                        <td style={{ padding: '15px', color: '#10B981', fontWeight: 'bold', textAlign: 'right' }}>
                          {o.status === 'DELIVERED' ? '₹40.00' : '₹0.00'}
                        </td>
                     </tr>
                   ))}
                   {assignedOrders.length === 0 && (
                     <tr>
                       <td colSpan={5} style={{ textAlign: 'center', padding: '40px', opacity: 0.4 }}>No delivery history records found.</td>
                     </tr>
                   )}
                </tbody>
             </table>
          </div>
        )}

        {/* Assigned Orders Tab (Active Assigned Tasks + Unassigned Task Pool) */}
        {activeView === 'assigned' && (
          <div>
            {/* My Active Assigned Tasks */}
            <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px', marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '25px', color: '#F59E0B' }}>My Active Assigned Tasks</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {activeAssignedTasks.map((order, i) => (
                  <div key={i} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px', background: 'rgba(245, 158, 11, 0.05)', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#F59E0B' }}>#{order.order_number}</span>
                        <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {order.status}
                        </span>
                      </div>
                      <p style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>
                        Customer: {order.customer_name} ({order.customer_phone || 'N/A'})
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <MapPin size={15} style={{ color: '#F59E0B' }} /> {order.delivery_address}
                      </p>
                      <p style={{ fontSize: '0.85rem', color: '#60a5fa' }}>
                        Items: {order.items ? order.items.map(it => `${it.name} x${it.quantity}`).join(', ') : 'Order Line Items'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <select 
                        style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 16px', borderRadius: '10px', outline: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      >
                        <option value={order.status} disabled style={{ background: '#1a1a1a' }}>Current: {order.status}</option>
                        {order.status !== 'OUT_FOR_DELIVERY' && (
                          <option value="OUT_FOR_DELIVERY" style={{ background: '#1a1a1a' }}>🛵 Start Delivery (Out for Delivery)</option>
                        )}
                        <option value="DELIVERED" style={{ background: '#1a1a1a' }}>✓ Mark as Delivered</option>
                      </select>
                    </div>
                  </div>
                ))}
                {activeAssignedTasks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', opacity: 0.4 }}>
                    <Clock size={40} style={{ marginBottom: '10px' }} />
                    <p>No active orders currently assigned to you. Claim tasks below from the live pool!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Unassigned Task Pool */}
            <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '20px' }}>Available Task Pool (Claim Orders)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {availablePool.map((order, i) => (
                  <div key={i} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <p style={{ fontWeight: 'bold' }}>#{order.order_number} - {order.customer_name || 'Customer'}</p>
                      <p style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} style={{ color: '#3B82F6' }} /> {order.delivery_address}
                      </p>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ padding: '8px 20px', borderRadius: '10px' }}
                      onClick={() => takeTask(order.id)}
                      disabled={partnerWorkStatus === 'ON_LEAVE'}
                    >
                      {partnerWorkStatus === 'ON_LEAVE' ? 'On Leave' : 'Take Task'}
                    </button>
                  </div>
                ))}
                {availablePool.length === 0 && (
                  <p style={{ textAlign: 'center', opacity: 0.4, padding: '30px' }}>No available unassigned tasks in the pool right now.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab (Strictly Read-Only except Profile Picture Upload, Logout Removed) */}
        {activeView === 'profile' && (
          <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '40px', borderRadius: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 15px auto' }}>
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user?.full_name || 'Partner Avatar'}
                    style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #3B82F6', boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)' }}
                  />
                ) : (
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(59, 130, 246, 0.3)' }}>
                    <Bike size={48} />
                  </div>
                )}
                
                <label
                  htmlFor="avatar-file-input"
                  style={{
                    position: 'absolute', bottom: '0', right: '0', background: '#3B82F6', color: 'white',
                    borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)', border: '2px solid #0a0a0a'
                  }}
                  title="Update Profile Picture"
                >
                  {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{user?.full_name || 'Rahul Dravid'}</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '4px' }}>Delivery Partner • Cafe90 Fleet</p>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', padding: '3px 10px', borderRadius: '12px', marginTop: '8px', display: 'inline-block' }}>
                📷 Click camera icon above to update profile picture
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>Email Address:</span>
                <span style={{ fontWeight: 'bold' }}>{user?.email || 'delivery@cafe90.com'}</span>
              </div>
              <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>Phone Number:</span>
                <span style={{ fontWeight: 'bold' }}>{user?.phone || '9876543211'}</span>
              </div>
              <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>Work Status:</span>
                <span style={{
                  padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold',
                  background: partnerWorkStatus === 'AVAILABLE' ? 'rgba(16,185,129,0.2)' : partnerWorkStatus === 'ON_DELIVERY' ? 'rgba(245,158,11,0.2)' : 'rgba(139,92,246,0.2)',
                  color: partnerWorkStatus === 'AVAILABLE' ? '#10B981' : partnerWorkStatus === 'ON_DELIVERY' ? '#F59E0B' : '#8B5CF6'
                }}>
                  {partnerWorkStatus}
                </span>
              </div>
              <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>Completed Deliveries:</span>
                <span style={{ fontWeight: 'bold', color: '#10B981' }}>{completedDeliveries.length} Orders</span>
              </div>
              <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>Total Earnings:</span>
                <span style={{ fontWeight: 'bold', color: '#F59E0B' }}>₹{completedDeliveries.length * 40}</span>
              </div>
            </div>
          </div>
        )}


        {/* Earnings View */}
        {activeView === 'earnings' && (
          <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px', borderRadius: '30px', textAlign: 'center' }}>
             <DollarSign size={60} style={{ color: '#8B5CF6', marginBottom: '20px' }} />
             <h3 style={{ opacity: 0.6 }}>Total Driver Earnings</h3>
             <h1 style={{ fontSize: '4rem', fontWeight: 'bold', margin: '10px 0', color: '#10B981' }}>
                ₹{completedDeliveries.length * 40}
             </h1>
             <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '25px' }}>
               Calculated at ₹40 incentive per completed delivery across {completedDeliveries.length} orders.
             </p>
             <button className="btn-primary w-100" style={{ padding: '18px' }} onClick={() => alert('Payout request submitted to Admin!')}>Request Payout</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
