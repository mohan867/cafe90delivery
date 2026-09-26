import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Mail, Lock, Eye, EyeOff, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './CustomerAuth.css';

const DeliveryLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const user = await login(form);
      if (!user) {
        throw new Error('Login failed. Could not retrieve user profile.');
      }

      if (user.role !== 'delivery_partner') {
        throw new Error('Access denied. This account is not registered as a Delivery Partner.');
      }

      navigate('/dashboard/delivery');
    } catch (err) {
      setError(err.message || 'Invalid delivery credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cauth-page">
      <div className="cauth-card glass-panel" style={{ borderTop: '4px solid #10B981' }}>
        <button className="cauth-back" onClick={() => navigate('/login')}>
          <ArrowLeft size={18} /> Back
        </button>

        <div className="cauth-header">
          <div className="cauth-icon delivery-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
            <Bike size={32} />
          </div>
          <h2>Delivery Login</h2>
          <p className="text-secondary">Ready to deliver happiness? Sign in now.</p>
        </div>



        {error && <div className="cauth-error">{error}</div>}

        <form className="cauth-form" onSubmit={handleSubmit}>
          <div className="cauth-field">
            <label>Partner Email</label>
            <div className="cauth-input-wrap">
              <Mail size={18} className="cauth-input-icon" />
              <input
                type="email"
                name="email"
                placeholder="delivery@cafe90.com"
                value={form.email}
                onChange={handleChange}
                required
                style={{ color: 'white', background: 'transparent' }}
              />
            </div>
          </div>

          <div className="cauth-field">
            <label>Password</label>
            <div className="cauth-input-wrap">
              <Lock size={18} className="cauth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                style={{ color: 'white', background: 'transparent' }}
              />
              <button
                type="button"
                className="cauth-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="cauth-submit btn-primary" type="submit" disabled={loading} style={{ background: 'linear-gradient(90deg, #10B981, #059669)' }}>
            {loading ? (
              <span className="cauth-spinner" />
            ) : (
              <><LogIn size={18} /> Start My Shift</>
            )}
          </button>
        </form>

        <div className="cauth-footer">
          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Driver App v2.0 | Authenticated via PostgreSQL</p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLogin;
