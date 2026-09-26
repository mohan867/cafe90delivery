import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Dashboard.css';

const About = () => {
  return (
    <div className="app-container">
      <Navbar />
      <div style={{ flex: 1, padding: '120px 20px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-dark)' }}>
        <div className="about-page-container glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '0', overflow: 'hidden' }}>
          <div style={{ height: '450px', background: 'url("/restaurant-bg.png") center/cover', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)' }}></div>
            <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', padding: '50px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', zIndex: 1 }}>
              <h1 style={{ fontSize: '5rem', textShadow: '2px 2px 15px rgba(0,0,0,0.5)', fontFamily: 'var(--font-vintage)', letterSpacing: '5px' }}>Cafe 90's</h1>
              <p style={{ fontSize: '1.6rem', color: '#D97706', fontWeight: '600', fontFamily: 'var(--font-body)' }}>A Trip Down Memory Lane</p>
            </div>
          </div>
          
          <div style={{ padding: '50px' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '25px', color: 'white' }}>Our Story</h2>
            <p style={{ lineHeight: '1.9', color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '40px' }}>
              Founded in 2024, Cafe 90's was born out of a passion for great coffee and nostalgic vibes. 
              We believe that the best moments are spent over a warm cup of coffee and good music. 
              Our mission is to provide a space where you can escape the hustle of modern life and 
              relive the simplicity of the 90s.
            </p>
            
            <div className="about-stats-grid">
              <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
                <h4 style={{ color: '#D97706', fontSize: '2rem', marginBottom: '5px' }}>10k+</h4>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Happy Customers</p>
              </div>
              <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
                <h4 style={{ color: '#D97706', fontSize: '2rem', marginBottom: '5px' }}>50+</h4>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Signature Dishes</p>
              </div>
              <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
                <h4 style={{ color: '#D97706', fontSize: '2rem', marginBottom: '5px' }}>4.9</h4>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Average Rating</p>
              </div>
            </div>

            <h3 style={{ fontSize: '1.8rem', marginBottom: '15px', color: 'white' }}>Why Choose Us?</h3>
            <div className="about-features-grid">
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: '#D97706', marginBottom: '8px', fontSize: '1.1rem' }}>☕ Authentic Recipes</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Crafted using traditional methods and fresh, premium ingredients every single day.</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: '#D97706', marginBottom: '8px', fontSize: '1.1rem' }}>🚀 Express Delivery</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Hot and fresh food delivered directly to your doorstep with real-time tracking.</p>
              </div>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>Have questions or want to host an event with us?</p>
              <a href="/contact" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 30px', borderRadius: '12px' }}>Contact Us Today</a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
