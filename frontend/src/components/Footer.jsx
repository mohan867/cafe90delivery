import { Mail, MapPin, Phone } from 'lucide-react';
import './Footer.css';

const InstagramIcon = ({ size = 20, className = "" }) => (<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>);
const FacebookIcon = ({ size = 20, className = "" }) => (<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.81l.39-4h-4.2V7a1 1 0 0 1 1-1h3z"></path></svg>);



const Footer = () => {
  return (
    <footer className="footer-section" id="contact">
      <div className="footer-container">
        <div className="footer-col">
          <img src="/logo.jpg" alt="Cafe 90's Logo" className="footer-logo" />
          <p className="footer-desc">
            Enjoy the best taste, made with love and served with happiness. Step into the 90's and relish the finest delicacies.
          </p>
          <div className="social-links">
            <a href="https://instagram.com/cafe90srestocafe" target="_blank" rel="noopener noreferrer" className="social-icon"><InstagramIcon size={20} /></a>
            <a href="#" className="social-icon"><FacebookIcon size={20} /></a>
          </div>
        </div>

        <div className="footer-col">
          <h3>Contact Us</h3>
          <ul className="footer-links">
            <li>
              <Phone size={16} className="text-accent" />
              <a href="tel:+917550344381">+91 7550344381</a>
            </li>
            <li>
              <Mail size={16} className="text-accent" />
              <a href="mailto:cafe90resto@gmail.com">cafe90resto@gmail.com</a>
            </li>
            <li>
              <InstagramIcon size={16} className="text-accent" />
              <a href="https://instagram.com/cafe90srestocafe" target="_blank" rel="noopener noreferrer">@cafe90srestocafe</a>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Shop Location</h3>
          <ul className="footer-links">
            <li style={{ alignItems: 'flex-start' }}>
              <MapPin size={16} className="text-accent" style={{ marginTop: '4px', flexShrink: 0 }} />
              <a href="https://maps.app.goo.gl/tBe21N6NB3VnyRQX7" target="_blank" rel="noopener noreferrer">
                Cafe 90's Resto <br />
                <span style={{ fontSize: '0.85em', opacity: 0.8 }}>View on Google Maps</span>
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Quick Links</h3>
          <ul className="footer-links">
            <li><a href="/">Home</a></li>
            <li><a href="/menu">Our Menu</a></li>
            <li><a href="/about">About Us</a></li>
            <li><a href="/contact">Contact Us</a></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2026 Cafe 90's Restaurant. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
