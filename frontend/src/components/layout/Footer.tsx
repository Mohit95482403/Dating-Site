import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="footer-wrap">
      <Container>
        <div className="footer-grid">
          {/* Brand info */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand">
              <div className="footer-logo-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className="footer-title">Connectly</span>
            </Link>
            <p className="footer-tagline">
              Meet people who match your vibe. Designed for meaningful discovery, mutual authenticity, and safe real-time connections.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Platform</h4>
            <ul className="footer-link-list">
              <li><Link to="/discover">Discover</Link></li>
              <li><Link to="/how-it-works">How It Works</Link></li>
              <li><Link to="/matches">Matches</Link></li>
              <li><Link to="/messages">Real-Time Chat</Link></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Safety & Trust</h4>
            <ul className="footer-link-list">
              <li><Link to="/safety">Safety Guidelines</Link></li>
              <li><Link to="/safety">Report & Moderation</Link></li>
              <li><Link to="/safety">Profile Verification</Link></li>
              <li><Link to="/safety">Community Standards</Link></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Company & Legal</h4>
            <ul className="footer-link-list">
              <li><Link to="/about">About Connectly</Link></li>
              <li><Link to="/safety">Privacy Policy</Link></li>
              <li><Link to="/safety">Terms of Service</Link></li>
              <li><Link to="/about">Contact Support</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Narendra Sonawane - All rights reserved.</p>
          <div className="footer-status-pill">
            <span className="pulse-ping"></span>
            <span>All Systems Operational</span>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
