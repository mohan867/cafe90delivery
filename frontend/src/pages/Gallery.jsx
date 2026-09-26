import { Image } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Dashboard.css';

const Gallery = () => {
  const images = [
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80"
  ];

  return (
    <div className="app-container">
      <Navbar />
      <div style={{ flex: 1, padding: '120px 20px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-dark)' }}>
        <div className="gallery-page-container glass-panel" style={{ width: '100%', maxWidth: '1200px', padding: '60px 40px' }}>
          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>Cafe 90's Gallery</h1>
            <p style={{ color: 'var(--text-secondary)' }}>A glimpse into our atmosphere and signature dishes</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
            {images.map((img, i) => (
              <div key={i} className="glass-panel" style={{ padding: '12px', borderRadius: '24px', overflow: 'hidden', height: '320px', transition: 'transform 0.3s ease' }}>
                 <img src={img} alt={`Gallery ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Gallery;
