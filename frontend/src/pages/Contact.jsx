import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import './Dashboard.css';

import { api } from '../services/api';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.submitContactFeedback(form);
      setSubmitted(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      alert(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div style={{ flex: 1, padding: '120px 20px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-dark)' }}>
        <div style={{ width: '100%', maxWidth: '1000px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h1 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-vintage)', color: '#D97706', marginBottom: '10px' }}>Contact Us</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>We'd love to hear from you! Get in touch or visit our restaurant.</p>
          </div>

          <div className="contact-info-grid">
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#D97706', padding: '16px', borderRadius: '50%', marginBottom: '15px' }}>
                <Phone size={28} />
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Phone Number</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Call us directly for reservations or inquiries.</p>
              <a href="tel:+917550344381" style={{ color: '#D97706', fontWeight: 'bold', fontSize: '1.1rem' }}>+91 7550344381</a>
            </div>

            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '16px', borderRadius: '50%', marginBottom: '15px' }}>
                <Mail size={28} />
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Email Address</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Send us an email anytime.</p>
              <a href="mailto:cafe90resto@gmail.com" style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '1.05rem' }}>cafe90resto@gmail.com</a>
            </div>

            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '16px', borderRadius: '50%', marginBottom: '15px' }}>
                <Clock size={28} />
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Opening Hours</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Monday – Sunday</p>
              <p style={{ color: '#34d399', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '4px' }}>10:00 AM – 11:00 PM</p>
            </div>
          </div>

          <div className="contact-main-grid">
            
            {/* Form */}
            <div className="glass-panel" style={{ padding: '35px' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Send Us a Message</h2>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#10b981' }}>
                  <CheckCircle2 size={56} style={{ margin: '0 auto 15px' }} />
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', color: 'white' }}>Thank You!</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Your message has been sent successfully. We will get back to you shortly.</p>
                  <button className="btn-secondary" style={{ marginTop: '20px' }} onClick={() => setSubmitted(false)}>Send Another Message</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Subject</label>
                    <input
                      type="text"
                      required
                      placeholder="Table reservation / Feedback / Inquiry"
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Message</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Write your message here..."
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', resize: 'vertical' }}
                    />
                  </div>
                  <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', marginTop: '10px' }}>
                    <Send size={18} /> {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

            {/* Map / Location Card */}
            <div className="glass-panel" style={{ padding: '35px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <MapPin size={24} style={{ color: '#D97706' }} />
                  <h2 style={{ fontSize: '1.8rem' }}>Visit Our Cafe</h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
                  Experience the warmth and nostalgia of 90's dining. Step in for handcrafted coffee, sizzling fast bites, and great music.
                </p>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px 20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px' }}>Cafe 90's Resto</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Anna Nagar / Main Road, Chennai, Tamil Nadu</p>
                </div>
              </div>

              <div style={{ borderRadius: '16px', overflow: 'hidden', height: '220px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                <a
                  href="https://maps.app.goo.gl/tBe21N6NB3VnyRQX7"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'white', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}
                >
                  <MapPin size={40} style={{ color: '#D97706' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Open in Google Maps</span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Click to navigate directly to Cafe 90's Resto</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
