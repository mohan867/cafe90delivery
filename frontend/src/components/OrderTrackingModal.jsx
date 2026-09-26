import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Clock, MapPin, Bike, ShoppingBag, ShieldCheck, PhoneCall, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

const OrderTrackingModal = ({ orderId, onClose }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const partnerMarkerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Default Cafe 90s Restaurant Location (Google Maps Pin: 11.2447993, 77.5172581)
  const RESTAURANT_LAT = 11.2447993;
  const RESTAURANT_LNG = 77.5172581;

  const fetchOrderDetails = async () => {
    try {
      const res = await api.getOrderDetails(orderId);
      if (res && res.data) {
        setOrder(res.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Error fetching order details for tracking:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time 5-second polling
  useEffect(() => {
    fetchOrderDetails();
    const interval = setInterval(fetchOrderDetails, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Leaflet Map Initialization & Delivery Agent Path Animation
  useEffect(() => {
    if (!order || !mapRef.current) return;

    const destLat = order.delivery_latitude || 11.2485;
    const destLng = order.delivery_longitude || 77.5210;

    const isMountedRef = { current: true };

    const initTrackingMap = () => {
      if (!isMountedRef.current) return;
      if (!window.L) {
        setTimeout(initTrackingMap, 300);
        return;
      }

      if (!mapInstanceRef.current) {
        const midLat = (RESTAURANT_LAT + destLat) / 2;
        const midLng = (RESTAURANT_LNG + destLng) / 2;

        const map = window.L.map(mapRef.current).setView([midLat, midLng], 14);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // Restaurant Marker
        const restIcon = window.L.divIcon({
          html: `<div style="background:#D97706;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 4px 12px rgba(217,119,6,0.6);color:white;font-weight:bold;font-size:16px;">☕</div>`,
          className: 'custom-rest-pin',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        window.L.marker([RESTAURANT_LAT, RESTAURANT_LNG], { icon: restIcon })
          .bindTooltip('<strong>Cafe 90s (Kitchen)</strong>', { permanent: true, direction: 'top', offset: [0, -12] })
          .addTo(map);

        // Customer Location Marker
        const custIcon = window.L.divIcon({
          html: `<div style="background:#16a34a;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 4px 12px rgba(22,163,74,0.6);color:white;font-weight:bold;font-size:16px;">🏠</div>`,
          className: 'custom-cust-pin',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        window.L.marker([destLat, destLng], { icon: custIcon })
          .bindTooltip('<strong>Delivery Location</strong>', { permanent: true, direction: 'top', offset: [0, -12] })
          .addTo(map);

        // Polyline connecting Restaurant -> Destination
        const latlngs = [
          [RESTAURANT_LAT, RESTAURANT_LNG],
          [destLat, destLng]
        ];
        window.L.polyline(latlngs, { color: '#D97706', weight: 4, opacity: 0.7, dashArray: '8, 12' }).addTo(map);

        // Delivery Partner Vehicle Marker
        const partnerIcon = window.L.divIcon({
          html: `<div style="background:#3b82f6;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 4px 14px rgba(59,130,246,0.8);color:white;font-size:18px;">🛵</div>`,
          className: 'custom-partner-pin',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const initialPartnerLat = order.status === 'DELIVERED' ? destLat : RESTAURANT_LAT;
        const initialPartnerLng = order.status === 'DELIVERED' ? destLng : RESTAURANT_LNG;

        const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        const safePartnerName = escapeHtml(order.assigned_to || 'Delivery Partner');

        const partnerMarker = window.L.marker([initialPartnerLat, initialPartnerLng], { icon: partnerIcon })
          .bindTooltip(`<strong>${safePartnerName}</strong>`, { direction: 'bottom', offset: [0, 10] })
          .addTo(map);

        partnerMarkerRef.current = partnerMarker;
        mapInstanceRef.current = map;

        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            mapInstanceRef.current.fitBounds([
              [RESTAURANT_LAT, RESTAURANT_LNG],
              [destLat, destLng]
            ], { padding: [40, 40] });
          }
        }, 200);
      }
    };

    initTrackingMap();

    return () => {
      isMountedRef.current = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order?.id]);

  const [cancelSecondsLeft, setCancelSecondsLeft] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  // 5-minute Customer Cancellation Countdown Timer
  useEffect(() => {
    if (!order || order.status !== 'PENDING' || !order.created_at) {
      setCancelSecondsLeft(0);
      return;
    }

    const calcSeconds = () => {
      const created = new Date(order.created_at).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - created) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setCancelSecondsLeft(remaining);
    };

    calcSeconds();
    const timer = setInterval(calcSeconds, 1000);
    return () => clearInterval(timer);
  }, [order?.created_at, order?.status]);

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      await api.cancelOrder(order.id);
      alert("Order cancelled successfully.");
      fetchOrderDetails();
    } catch (err) {
      alert(err.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  // Animate / Position Delivery Partner Pin (Live GPS or Route Interpolation)
  useEffect(() => {
    if (!order || !mapInstanceRef.current || !partnerMarkerRef.current) return;

    const destLat = order.delivery_latitude || 11.2485;
    const destLng = order.delivery_longitude || 77.5210;

    // Use actual GPS coordinates from partner's device if available
    if (order.partner_latitude && order.partner_longitude) {
      partnerMarkerRef.current.setLatLng([order.partner_latitude, order.partner_longitude]);
      return;
    }

    if (order.status === 'OUT_FOR_DELIVERY' || order.status === 'PREPARING' || order.status === 'READY_FOR_PICKUP') {
      let progress = order.status === 'OUT_FOR_DELIVERY' ? 0.45 : 0.1;
      let forward = true;

      const animate = () => {
        if (forward) {
          progress += 0.003;
          if (progress >= 0.92) forward = false;
        } else {
          progress -= 0.003;
          if (progress <= 0.40) forward = true;
        }

        const currLat = RESTAURANT_LAT + (destLat - RESTAURANT_LAT) * progress;
        const currLng = RESTAURANT_LNG + (destLng - RESTAURANT_LNG) * progress;

        if (partnerMarkerRef.current) {
          partnerMarkerRef.current.setLatLng([currLat, currLng]);
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (order.status === 'DELIVERED') {
      partnerMarkerRef.current.setLatLng([destLat, destLng]);
    } else {
      partnerMarkerRef.current.setLatLng([RESTAURANT_LAT, RESTAURANT_LNG]);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [order?.status, order?.partner_latitude, order?.partner_longitude]);

  const stages = [
    { key: 'PENDING', label: 'Order Placed', desc: 'Received by Cafe 90s' },
    { key: 'CONFIRMED', label: 'Confirmed', desc: 'Order accepted' },
    { key: 'PREPARING', label: 'Preparing', desc: 'Chef is cooking' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'On the way to you' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Enjoy your meal!' }
  ];

  const getStageIndex = (status) => {
    if (status === 'READY_FOR_PICKUP') return 2;
    if (status === 'CANCELLED') return -1;
    return stages.findIndex(s => s.key === status);
  };

  const currentStageIdx = order ? getStageIndex(order.status) : 0;

  const getEstimatedTime = (status) => {
    switch (status) {
      case 'PENDING': return '25 - 35 mins';
      case 'CONFIRMED': return '20 - 30 mins';
      case 'PREPARING': return '15 - 25 mins';
      case 'READY_FOR_PICKUP': return '10 - 15 mins';
      case 'OUT_FOR_DELIVERY': return '5 - 12 mins';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Order Cancelled';
      default: return '20 - 30 mins';
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto',
        borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(18, 18, 24, 0.96)', color: 'white', padding: '28px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)', position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white',
            borderRadius: '50%', width: '36px', height: '36px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Live Order Tracking</h2>
            {order && (
              <span style={{
                background: 'rgba(217,119,6,0.2)', border: '1px solid rgba(217,119,6,0.5)',
                color: '#f59e0b', fontSize: '0.85rem', fontWeight: 800, padding: '4px 12px', borderRadius: '10px'
              }}>
                #{order.order_number}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '6px' }}>
            <RefreshCw size={13} className="animate-spin" /> Live updates every 5s • Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <RefreshCw size={36} className="animate-spin" style={{ color: '#D97706', marginBottom: '12px' }} />
            <p>Fetching real-time tracking data...</p>
          </div>
        ) : !order ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#f87171' }}>
            <p>Unable to load tracking details for this order.</p>
          </div>
        ) : (
          <div>
            {/* 5-Minute Customer Order Cancellation Window Banner */}
            {order.status === 'PENDING' && cancelSecondsLeft > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '16px', padding: '14px 20px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontWeight: 'bold' }}>
                    ⏱️
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#f87171', fontSize: '0.92rem' }}>
                      5-Minute Cancellation Window Active
                    </span>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                      You can cancel this order within <strong>{Math.floor(cancelSecondsLeft / 60)}m {cancelSecondsLeft % 60}s</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  style={{
                    background: '#ef4444', color: 'white', border: 'none',
                    borderRadius: '10px', padding: '9px 20px', fontWeight: 800,
                    cursor: 'pointer', fontSize: '0.86rem', boxShadow: '0 4px 12px rgba(239,68,68,0.4)'
                  }}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            )}

            {/* ETA Banner */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(217,119,6,0.25) 0%, rgba(22,163,74,0.2) 100%)',
              border: '1px solid rgba(217,119,6,0.4)', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px'
            }}>
              <div>
                <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Estimated Delivery Time</span>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', margin: '2px 0 0 0' }}>
                  {getEstimatedTime(order.status)}
                </h3>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(217,119,6,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} style={{ color: '#f59e0b' }} />
              </div>
            </div>

            {/* Interactive Leaflet Tracking Map */}
            <div style={{ marginBottom: '24px' }}>
              <div ref={mapRef} style={{ width: '100%', height: '240px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />
            </div>

            {/* Stage Progress Bar Timeline */}
            <div style={{ marginBottom: '28px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Order Progress Timeline
              </h4>

              {order.status === 'CANCELLED' ? (
                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', borderRadius: '12px', fontWeight: 'bold' }}>
                  ❌ Order was cancelled.
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  {stages.map((stage, idx) => {
                    const isDone = idx <= currentStageIdx;
                    const isCurrent = idx === currentStageIdx;

                    return (
                      <div key={stage.key} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 2 }}>
                        {/* Connecting Bar */}
                        {idx > 0 && (
                          <div style={{
                            position: 'absolute', top: '16px', right: '50%', left: '-50%', height: '3px',
                            background: idx <= currentStageIdx ? '#16a34a' : 'rgba(255,255,255,0.15)',
                            zIndex: 1, transition: 'background 0.4s ease'
                          }} />
                        )}

                        {/* Step Circle */}
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', margin: '0 auto 10px',
                          background: isCurrent ? '#D97706' : isDone ? '#16a34a' : 'rgba(255,255,255,0.1)',
                          border: isCurrent ? '3px solid #f59e0b' : '2px solid rgba(255,255,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 800, fontSize: '0.85rem', position: 'relative', zIndex: 2,
                          boxShadow: isCurrent ? '0 0 16px rgba(217,119,6,0.8)' : 'none'
                        }}>
                          {isDone && !isCurrent ? <CheckCircle2 size={18} /> : idx + 1}
                        </div>

                        <div style={{ fontSize: '0.82rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#f59e0b' : isDone ? 'white' : 'rgba(255,255,255,0.4)' }}>
                          {stage.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px', display: 'none' }}>
                          {stage.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delivery Partner Details & Order Items Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {/* Partner Card */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bike size={20} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.95rem' }}>Delivery Agent</h5>
                    <span style={{ fontSize: '0.82rem', color: '#60a5fa', fontWeight: 'bold' }}>
                      {order.assigned_to || 'Assigning Partner...'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> To: {order.delivery_landmark || order.delivery_address}
                </div>
              </div>

              {/* Order Items Summary */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#f59e0b' }}>
                  <ShoppingBag size={18} />
                  <h5 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Order Items ({order.items ? order.items.length : 0})</h5>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxHeight: '60px', overflowY: 'auto' }}>
                  {order.items && order.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>{item.name} x {item.quantity}</span>
                      <span style={{ fontWeight: 'bold', color: 'white' }}>₹{item.subtotal}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
                  <span>Total Amount</span>
                  <span style={{ color: '#f59e0b' }}>₹{order.total_amount}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingModal;
