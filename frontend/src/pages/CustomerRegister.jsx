import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Phone, Eye, EyeOff, ArrowLeft, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import './CustomerAuth.css';

const CustomerRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9!@#$%^&*]/.test(form.password)) {
      setError('Password must contain both letters and numbers/symbols');
      return;
    }
    setLoading(true);
    try {
      await api.register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login/customer'), 2000);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cauth-page">
      <div className="cauth-card glass-panel">
        <button className="cauth-back" onClick={() => navigate('/login/customer')}>
          <ArrowLeft size={18} /> Back to Login
        </button>

        <div className="cauth-header">
          <div className="cauth-icon customer-icon">
            <UserPlus size={32} />
          </div>
          <h2>Create Account</h2>
          <p className="text-secondary">Join Cafe 90's and start ordering!</p>
        </div>

        {error && <div className="cauth-error">{error}</div>}
        {success && <div className="cauth-success">{success}</div>}

        <form className="cauth-form" onSubmit={handleSubmit}>
          <div className="cauth-field">
            <label>Full Name</label>
            <div className="cauth-input-wrap">
              <User size={18} className="cauth-input-icon" />
              <input
                type="text"
                name="name"
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="cauth-field">
            <label>Email Address</label>
            <div className="cauth-input-wrap">
              <Mail size={18} className="cauth-input-icon" />
              <input
                type="email"
                name="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="cauth-field">
            <label>Phone Number</label>
            <div className="cauth-input-wrap">
              <Phone size={18} className="cauth-input-icon" />
              <input
                type="tel"
                name="phone"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={handleChange}
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
                placeholder="Min. 6 characters (Letters & Numbers)"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button type="button" className="cauth-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Live Password Strength Indicator */}
            {form.password && (
              <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: form.password.length >= 6 ? '#10b981' : '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {form.password.length >= 6 ? '✓' : '✗'} Minimum 6 characters
                </span>
                <span style={{ color: /[a-zA-Z]/.test(form.password) && /[0-9!@#$%^&*]/.test(form.password) ? '#10b981' : '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/[a-zA-Z]/.test(form.password) && /[0-9!@#$%^&*]/.test(form.password) ? '✓' : '✗'} Contains both letters and numbers/symbols
                </span>
              </div>
            )}
          </div>

          <div className="cauth-field">
            <label>Confirm Password</label>
            <div className="cauth-input-wrap">
              <Lock size={18} className="cauth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            {form.confirmPassword && (
              <div style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                {form.password === form.confirmPassword ? (
                  <span style={{ color: '#10b981' }}>✓ Passwords match</span>
                ) : (
                  <span style={{ color: '#f87171' }}>✗ Passwords do not match</span>
                )}
              </div>
            )}
          </div>

          <button className="cauth-submit btn-primary" type="submit" disabled={loading}>
            {loading ? (
              <span className="cauth-spinner" />
            ) : (
              <><UserPlus size={18} /> Create Account</>
            )}
          </button>
        </form>

        <div className="cauth-footer">
          <p>Already have an account?</p>
          <Link to="/login/customer" className="cauth-register-btn">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerRegister;
