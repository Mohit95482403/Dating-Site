import React from 'react';
import Container from '../components/common/Container';
import SectionTitle from '../components/common/SectionTitle';
import Button from '../components/common/Button';
import { Link } from 'react-router-dom';
import './AuthPages.css';
import './LandingPage.css';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="info-page-wrap how-it-works-section" style={{ minHeight: '85vh', paddingTop: '4rem' }}>
      <div className="hiw-ambient-glow hiw-glow-1"></div>
      <div className="hiw-ambient-glow hiw-glow-2"></div>

      <Container>
        <div className="hiw-header-wrap" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <SectionTitle
            badge="The Intentional Dating Flow"
            title="Dating Engineered Around True Resonance"
            subtitle="Most platforms prioritize superficial swiping fatigue. Connectly is architected for intentional, mutual discovery and authentic chemistry."
          />
        </div>

        {/* Connected Steps Grid */}
        <div className="steps-journey-track">
          <div className="journey-rail-glow" aria-hidden="true"></div>

          <div className="steps-grid">
            {/* Step 1 */}
            <div className="step-card glass-panel step-card-theme-violet">
              <div className="step-card-glow-halo"></div>
              <div className="step-top-row">
                <div className="step-icon-badge">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                    <path d="M12 11l2 2 4-4" />
                  </svg>
                </div>
                <span className="step-pill-number">01</span>
              </div>

              <div className="step-content-body">
                <div className="step-eyebrow">Milestone 01</div>
                <h3 className="step-title">Craft Authentic Identity</h3>
                <p className="step-desc">
                  Select core lifestyle markers, aesthetic vibes, passions, and prompts. Connectly maps multidimensional compatibility.
                </p>
              </div>

              <div className="step-micro-preview preview-step-1">
                <div className="micro-profile-pill">
                  <span className="micro-badge-check">✓</span>
                  <span className="micro-badge-text">Verified Identity</span>
                  <span className="micro-score">98% Match Readiness</span>
                </div>
                <div className="micro-tags-row">
                  <span className="micro-tag">#SpecialtyCoffee</span>
                  <span className="micro-tag">#TechVibes</span>
                  <span className="micro-tag">#IndieMusic</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="step-card glass-panel step-card-theme-cyan">
              <div className="step-card-glow-halo"></div>
              <div className="step-top-row">
                <div className="step-icon-badge">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                </div>
                <span className="step-pill-number">02</span>
              </div>

              <div className="step-content-body">
                <div className="step-eyebrow">Milestone 02</div>
                <h3 className="step-title">Smart Resonant Discovery</h3>
                <p className="step-desc">
                  Explore curated singles nearby whose energy and interests naturally align with your criteria without endless fatigue.
                </p>
              </div>

              <div className="step-micro-preview preview-step-2">
                <div className="micro-match-banner">
                  <div className="micro-radar-pulse"></div>
                  <span className="micro-distance">📍 3.4 km nearby</span>
                  <span className="micro-match-percent">⚡ 96% Resonance</span>
                </div>
                <div className="micro-common-interests">
                  <span className="micro-dot-indicator"></span>
                  <span>4 Shared Core Passions Detected</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="step-card glass-panel step-card-theme-pink">
              <div className="step-card-glow-halo"></div>
              <div className="step-top-row">
                <div className="step-icon-badge">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <span className="step-pill-number">03</span>
              </div>

              <div className="step-content-body">
                <div className="step-eyebrow">Milestone 03</div>
                <h3 className="step-title">Mutual Double Opt-In</h3>
                <p className="step-desc">
                  Your inbox is private and protected. Only mutual connections can converse, ensuring zero unwanted intrusions.
                </p>
              </div>

              <div className="step-micro-preview preview-step-3">
                <div className="micro-mutual-spark">
                  <span className="micro-spark-icon">✨</span>
                  <span className="micro-spark-text">It's a Mutual Match!</span>
                </div>
                <div className="micro-avatars-overlap">
                  <div className="micro-avatar av-left">🧑‍💻</div>
                  <div className="micro-avatar-heart">💖</div>
                  <div className="micro-avatar av-right">👩‍🎨</div>
                  <span className="micro-spam-shield">🔒 Spam-Protected</span>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="step-card glass-panel step-card-theme-emerald">
              <div className="step-card-glow-halo"></div>
              <div className="step-top-row">
                <div className="step-icon-badge">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <span className="step-pill-number">04</span>
              </div>

              <div className="step-content-body">
                <div className="step-eyebrow">Milestone 04</div>
                <h3 className="step-title">Real-Time Fluid Chat</h3>
                <p className="step-desc">
                  Jump into WebSocket-driven live messaging with active typing feedback, read receipts, and spontaneous starters.
                </p>
              </div>

              <div className="step-micro-preview preview-step-4">
                <div className="micro-chat-bubble">
                  <span className="micro-chat-text">"Loved your playlist recommendation! 🎧"</span>
                </div>
                <div className="micro-chat-status">
                  <span className="micro-typing-dots">
                    <span></span><span></span><span></span>
                  </span>
                  <span className="micro-online-status">🟢 Active Right Now</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Action */}
        <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
          <Link to="/register">
            <Button variant="glow" size="lg">
              Start Matching Today →
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default HowItWorksPage;
