import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './CustomerAuth.css';

const AdminLogin = () => {
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

      if (user.role !== 'admin') {
        throw new Error('Access denied. This account does not have Admin privileges.');
      }

      navigate('/dashboard/admin');
    } catch (err) {
      setError(err.message || 'Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cauth-page">
      <div className="cauth-card glass-panel" style={{ borderTop: '4px solid #8B5CF6' }}>
        <button className="cauth-back" onClick={() => navigate('/login')}>
          <ArrowLeft size={18} /> Back
        </button>

        <div className="cauth-header">
          <div className="cauth-icon admin-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>
            <Shield size={32} />
          </div>
          <h2>Admin Portal</h2>
          <p className="text-secondary">Authorized personnel only. Please sign in.</p>
        </div>



        {error && <div className="cauth-error">{error}</div>}

        <form className="cauth-form" onSubmit={handleSubmit}>
          <div className="cauth-field">
            <label>Admin Email</label>
            <div className="cauth-input-wrap">
              <Mail size={18} className="cauth-input-icon" />
              <input
                type="email"
                name="email"
                placeholder="admin@cafe90.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="cauth-field">
            <label>Master Password</label>
            <div className="cauth-input-wrap">
              <Lock size={18} className="cauth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
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

          <button className="cauth-submit btn-primary" type="submit" disabled={loading} style={{ background: 'linear-gradient(90deg, #8B5CF6, #7C3AED)' }}>
            {loading ? (
              <span className="cauth-spinner" />
            ) : (
              <><LogIn size={18} /> Admin Sign In</>
            )}
          </button>
        </form>

        <div className="cauth-footer">
          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Security Protocol Active v2.4</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
