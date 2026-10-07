import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/common/Container';
import SectionTitle from '../components/common/SectionTitle';
import Button from '../components/common/Button';
import ProfilePreviewCard from '../components/common/ProfilePreviewCard';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  const [featureCategory, setFeatureCategory] = useState<'all' | 'matchmaking' | 'trust' | 'chat'>('all');
  const [storyCategory, setStoryCategory] = useState<'all' | 'couples' | 'creative' | 'friends'>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(prev => (prev === index ? null : index));
  };

  const faqItems = [
    {
      badge: 'Matching Engine',
      icon: '🎯',
      question: 'How does Connectly’s compatibility matching algorithm work?',
      answer:
        'Connectly moves beyond shallow swipe loops. Our multi-dimensional engine calculates true resonance across communication cadence, core values, shared lifestyle rhythms, and authentic intent scores—ensuring you are introduced to people you actually click with in real life.',
    },
    {
      badge: 'Pricing & Access',
      icon: '💎',
      question: 'Is Connectly completely free to join and chat?',
      answer:
        'Yes! Creating a verified profile, browsing curated suggestions, matching, and exchanging high-quality messages is 100% free. We believe authentic human connection should never be locked behind manipulative paywalls or artificial message caps.',
    },
    {
      badge: 'Verification & Safety',
      icon: '🛡️',
      question: 'How does Connectly keep fake profiles, bots, and scammers away?',
      answer:
        'Every member undergoes real-time selfie liveness verification and strict phone-bound integrity checks before their profile goes live. Combined with AI-assisted behavioral moderation and proactive scam prevention, our community maintains a 99.8% verified authenticity rate.',
    },
    {
      badge: 'Intentions & Modes',
      icon: '🤝',
      question: 'Can I use Connectly for finding friends or creative collaborators?',
      answer:
        'Absolutely. Connectly is built for multidimensional connection. You can seamlessly switch your primary intent between Romantic Dating, Close Friendships, or Creative & Professional Collaborators. Your feed and match recommendations adapt instantly.',
    },
    {
      badge: 'Privacy & Security',
      icon: '🔒',
      question: 'How is my private data and exact location protected?',
      answer:
        'Your privacy is sacred. All one-on-one chats and calls are secured with industry-standard encryption protocols. Your exact GPS coordinates are never displayed to anyone—only a randomized approximate distance radius. We never sell or broker your personal information to third parties.',
    },
    {
      badge: 'Anti-Ghosting Culture',
      icon: '⚡',
      question: 'What makes conversations on Connectly different from traditional apps?',
      answer:
        'We designed Connectly to encourage thoughtful conversations. Smart icebreaker prompts, mutual response timers, and clear intent tags eliminate dead-end single-word openers and foster respectful, engaging dialogues where both people are genuinely invested.',
    },
  ];

  return (
    <div className="landing-page">
      {/* =========================================================================
          HERO SECTION - ULTRA PREMIUM ARCHITECTURE
          ========================================================================= */}
      <section className="hero-section">
        {/* Cinematic Cosmic Atmospheric Glows */}
        <div className="hero-cosmic-glow hero-glow-magenta" aria-hidden="true"></div>
        <div className="hero-cosmic-glow hero-glow-violet" aria-hidden="true"></div>
        <div className="hero-cosmic-glow hero-glow-cyan" aria-hidden="true"></div>
        <div className="hero-mesh-grid" aria-hidden="true"></div>

        <Container>
          <div className="hero-grid">
            {/* Left Hero Content */}
            <div className="hero-content animate-fade-in">
              {/* Live Discovery Radar Eyebrow */}
              <div className="hero-eyebrow-pill">
                <span className="hero-pulse-beacon">
                  <span className="hero-beacon-ring"></span>
                  <span className="hero-beacon-core"></span>
                </span>
                <span className="hero-eyebrow-text">Connectly 2.0 • Genuine Social &amp; Dating</span>
                <span className="hero-eyebrow-divider">|</span>
                <span className="hero-eyebrow-stat">2,480+ Online Now</span>
              </div>

              {/* Cinematic Heading */}
              <h1 className="hero-title">
                Meet people who <br />
                <span className="hero-title-gradient">match your true vibe.</span>
              </h1>

              {/* Subtitle */}
              <p className="hero-subtitle">
                Escape algorithmic swipe burnout. Experience multidimensional matchmaking built around conversational chemistry, verified authenticity, and genuine shared life rhythms.
              </p>

              {/* Quick Vibe Chips Showcase */}
              <div className="hero-vibe-chips-wrap">
                <span className="hero-vibe-chip active">
                  <span className="vibe-chip-emoji">☕</span> Specialty Coffee
                </span>
                <span className="hero-vibe-chip">
                  <span className="vibe-chip-emoji">🎵</span> Indie Vinyls
                </span>
                <span className="hero-vibe-chip">
                  <span className="vibe-chip-emoji">💬</span> Late-Night Philosophy
                </span>
                <span className="hero-vibe-chip">
                  <span className="vibe-chip-emoji">🌿</span> Mindful Living
                </span>
              </div>

              {/* Primary & Secondary Action CTAs */}
              <div className="hero-cta-group">
                <Link to="/register" className="hero-cta-primary-link">
                  <Button variant="glow" size="lg" className="hero-cta-btn-glow">
                    <span>Start Matching Free</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Button>
                </Link>
                <Link to="/watch-how-it-works" className="hero-cta-secondary-link">
                  <Button variant="secondary" size="lg" className="hero-cta-btn-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Watch How It Works</span>
                  </Button>
                </Link>
              </div>

              {/* Micro-Reassurance Feature Badges */}
              <div className="hero-reassurance-row">
                <span className="hero-reassurance-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  100% Free Forever
                </span>
                <span className="hero-reassurance-sep">•</span>
                <span className="hero-reassurance-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  Biometrically Verified
                </span>
                <span className="hero-reassurance-sep">•</span>
                <span className="hero-reassurance-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Zero Data Selling
                </span>
              </div>

              {/* Ultra-Premium Glass Trust & Social Proof Card */}
              <div className="hero-trust-panel glass-panel">
                <div className="ht-avatars-group">
                  <span className="ht-avatar" title="Maya">👩‍🎨</span>
                  <span className="ht-avatar" title="Liam">🧑‍💻</span>
                  <span className="ht-avatar" title="Elena">🧗‍♀️</span>
                  <span className="ht-avatar" title="Marcus">🎧</span>
                  <span className="ht-avatar-counter">+45k</span>
                </div>
                <div className="ht-rating-content">
                  <div className="ht-stars-row">
                    <span className="ht-stars">★★★★★</span>
                    <strong>4.9 / 5.0 Rating</strong>
                  </div>
                  <span className="ht-label">Over 120,000+ authentic connections made</span>
                </div>
              </div>
            </div>

            {/* Right Hero Composition (Alex Card with 3D Ecosystem Satellites) */}
            <div className="hero-card-column animate-fade-in">
              <div className="hero-showcase-stage">
                {/* Backlight halo behind the card */}
                <div className="hero-stage-halo" aria-hidden="true"></div>

                {/* Floating Satellite 1: Top Chemistry Spark */}
                <div className="hero-satellite sat-top-right glass-panel animate-float">
                  <div className="sat-icon-wrap sat-spark">⚡</div>
                  <div className="sat-text">
                    <strong className="sat-strong">98% Chemistry Spark</strong>
                    <span className="sat-detail">Mutual indie books &amp; vinyl vibe</span>
                  </div>
                  <span className="sat-badge-hot">High Vibe</span>
                </div>

                {/* Floating Satellite 2: Left Audio Note Waveform */}
                <div className="hero-satellite sat-mid-left glass-panel animate-float-delay">
                  <div className="sat-voice-bars" aria-label="Audio Waveform">
                    <span className="vbar vb-1"></span>
                    <span className="vbar vb-2"></span>
                    <span className="vbar vb-3"></span>
                    <span className="vbar vb-4"></span>
                    <span className="vbar vb-5"></span>
                  </div>
                  <div className="sat-text">
                    <strong className="sat-strong">Voice Spark Exchanged</strong>
                    <span className="sat-detail">"Loved your favorite cafe pick..."</span>
                  </div>
                </div>


                {/* Main Profile Card Component */}
                <ProfilePreviewCard 
                  name="Alex"
                  age={25}
                  distance="4 km away"
                  imageSrc="/images/alex_profile.jpg"
                  interests={['Coffee & Books', 'Art Exhibitions', 'Indie Music', 'Photography']}
                  matchRate={96}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* =========================================================================
          HOW IT WORKS SECTION - ULTRA PREMIUM ARCHITECTURE
          ========================================================================= */}
      <section className="section-wrap how-it-works-section" id="how-it-works">
        {/* Ambient atmospheric backdrop glows */}
        <div className="hiw-ambient-glow hiw-glow-1"></div>
        <div className="hiw-ambient-glow hiw-glow-2"></div>

        <Container>
          <div className="hiw-header-wrap">
            <SectionTitle
              badge="The Intentional Dating Flow"
              title="How Connectly Works"
              subtitle="Four intentional milestones designed to transform spontaneous curiosity into authentic, chemistry-fueled relationships."
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
                    Showcase genuine lifestyle markers, passions, quirks, and conversation sparks. No superficial bios.
                  </p>
                </div>

                {/* Micro-Preview Interactive Mockup */}
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
                    Explore curated singles nearby whose energy and interests naturally align with your criteria.
                  </p>
                </div>

                {/* Micro-Preview Interactive Mockup */}
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
                    Conversations only ignite when both express genuine interest. Zero unsolicited spam or intrusions.
                  </p>
                </div>

                {/* Micro-Preview Interactive Mockup */}
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
                    Experience instantaneous messaging with live typing feedback, read indicators, and safe media sharing.
                  </p>
                </div>

                {/* Micro-Preview Interactive Mockup */}
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
        </Container>
      </section>

      {/* =========================================================================
          FEATURES SECTION - ULTRA PREMIUM ARCHITECTURE
          ========================================================================= */}
      <section className="section-wrap features-section" id="features">
        <div className="features-ambient-glow feat-glow-1"></div>
        <div className="features-ambient-glow feat-glow-2"></div>

        <Container>
          <SectionTitle
            badge="Designed for Humans"
            title="Everything You Need for Genuine Discovery"
            subtitle="Thoughtfully engineered features built on top of high-performance modern web technologies."
          />

          {/* Interactive Feature Category Switcher */}
          <div className="features-filter-nav">
            <button
              className={`features-filter-btn ${featureCategory === 'all' ? 'active' : ''}`}
              onClick={() => setFeatureCategory('all')}
            >
              <span className="filter-btn-spark">🌟</span>
              <span>All Capabilities</span>
            </button>
            <button
              className={`features-filter-btn ${featureCategory === 'matchmaking' ? 'active' : ''}`}
              onClick={() => setFeatureCategory('matchmaking')}
            >
              <span className="filter-btn-spark">⚡</span>
              <span>Intelligent Matching</span>
            </button>
            <button
              className={`features-filter-btn ${featureCategory === 'trust' ? 'active' : ''}`}
              onClick={() => setFeatureCategory('trust')}
            >
              <span className="filter-btn-spark">🛡️</span>
              <span>Trust & Privacy</span>
            </button>
            <button
              className={`features-filter-btn ${featureCategory === 'chat' ? 'active' : ''}`}
              onClick={() => setFeatureCategory('chat')}
            >
              <span className="filter-btn-spark">💬</span>
              <span>Live Interactions</span>
            </button>
          </div>

          <div className="premium-features-grid">
            {/* Feature 1: Smart Discovery */}
            {(featureCategory === 'all' || featureCategory === 'matchmaking') && (
              <div className="pfeature-card glass-panel pcard-coral animate-fade-in">
                <div className="pcard-glow-halo"></div>
                <div className="pcard-top">
                  <div className="pcard-icon-badge">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <circle cx="11" cy="11" r="3" />
                    </svg>
                  </div>
                  <span className="pcard-badge">
                    <span className="pbadge-dot"></span>
                    <span>AI Resonance</span>
                  </span>
                </div>

                <div className="pcard-body">
                  <div className="pcard-eyebrow">Multi-Dimensional Match</div>
                  <h3 className="pcard-title">Smart Resonance Discovery</h3>
                  <p className="pcard-desc">
                    Surface high-compatibility matches based on verified mutual passions, proximity, lifestyle markers, and conversational chemistry.
                  </p>
                </div>

                <div className="pcard-micro-preview">
                  <div className="pcard-score-bar">
                    <span className="pscore-label">⚡ Match Compatibility</span>
                    <span className="pscore-val">96%</span>
                  </div>
                  <div className="pscore-progress-track">
                    <div className="pscore-progress-fill" style={{ width: '96%' }}></div>
                  </div>
                  <div className="pcard-tags-cloud">
                    <span className="ptag">#SpecialtyCoffee</span>
                    <span className="ptag">#TechInnovator</span>
                    <span className="ptag">#IndieMusic</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 2: Meaningful Matching */}
            {(featureCategory === 'all' || featureCategory === 'matchmaking') && (
              <div className="pfeature-card glass-panel pcard-violet animate-fade-in">
                <div className="pcard-glow-halo"></div>
                <div className="pcard-top">
                  <div className="pcard-icon-badge">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <span className="pcard-badge">
                    <span className="pbadge-dot"></span>
                    <span>Mutual Opt-In</span>
                  </span>
                </div>

                <div className="pcard-body">
                  <div className="pcard-eyebrow">Zero Uninvited Spam</div>
                  <h3 className="pcard-title">Meaningful Double Opt-In</h3>
                  <p className="pcard-desc">
                    Conversations only initiate when both members explicitly express genuine interest. Your inbox remains completely serene and private.
                  </p>
                </div>

                <div className="pcard-micro-preview">
                  <div className="pcard-mutual-banner">
                    <span className="pmutual-check">✓</span>
                    <span className="pmutual-text">Both Liked Each Other</span>
                    <span className="pmutual-spark">✨</span>
                  </div>
                  <div className="pcard-shield-row">
                    <span className="pshield-icon">🛡️</span>
                    <span className="pshield-text">100% Spam Shield Active • Zero Unsolicited DMs</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 3: Real-Time Chat */}
            {(featureCategory === 'all' || featureCategory === 'chat') && (
              <div className="pfeature-card glass-panel pcard-cyan animate-fade-in">
                <div className="pcard-glow-halo"></div>
                <div className="pcard-top">
                  <div className="pcard-icon-badge">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <span className="pcard-badge">
                    <span className="pbadge-dot"></span>
                    <span>Socket.IO Live</span>
                  </span>
                </div>

                <div className="pcard-body">
                  <div className="pcard-eyebrow">Sub-Second Delivery</div>
                  <h3 className="pcard-title">Real-Time Fluid Chat</h3>
                  <p className="pcard-desc">
                    Experience instantaneous messaging with live typing feedback, read indicators, delivery receipts, and rich reactions.
                  </p>
                </div>

                <div className="pcard-micro-preview">
                  <div className="pcard-chat-row">
                    <span className="pchat-bubble">"Coffee this Saturday? ☕"</span>
                    <span className="pchat-status-pill">
                      <span className="pchat-ping"></span>
                      <span>&lt;15ms Latency</span>
                    </span>
                  </div>
                  <div className="pcard-typing-strip">
                    <div className="ptyping-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <span className="ptyping-label">Alex is typing...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 4: Privacy Controls */}
            {(featureCategory === 'all' || featureCategory === 'trust') && (
              <div className="pfeature-card glass-panel pcard-emerald animate-fade-in">
                <div className="pcard-glow-halo"></div>
                <div className="pcard-top">
                  <div className="pcard-icon-badge">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <span className="pcard-badge">
                    <span className="pbadge-dot"></span>
                    <span>Stealth Architecture</span>
                  </span>
                </div>

                <div className="pcard-body">
                  <div className="pcard-eyebrow">Enterprise Privacy</div>
                  <h3 className="pcard-title">Granular Privacy Controls</h3>
                  <p className="pcard-desc">
                    Full control over your visibility. Never expose exact GPS coordinates—approximate radius only, plus incognito browsing anytime.
                  </p>
                </div>

                <div className="pcard-micro-preview">
                  <div className="pcard-privacy-chip">
                    <span className="pprivacy-lock">📍</span>
                    <span className="pprivacy-text">Approximate Radius Only (Exact GPS Hidden)</span>
                  </div>
                  <div className="pcard-ghost-row">
                    <span className="pghost-badge">👻 Ghost Mode Available</span>
                    <span className="pghost-status">Inactive by Default</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 5: Profile Verification */}
            {(featureCategory === 'all' || featureCategory === 'trust') && (
              <div className="pfeature-card glass-panel pcard-amber animate-fade-in">
                <div className="pcard-glow-halo"></div>
                <div className="pcard-top">
                  <div className="pcard-icon-badge">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span className="pcard-badge">
                    <span className="pbadge-dot"></span>
                    <span>100% Verified</span>
                  </span>
                </div>

                <div className="pcard-body">
                  <div className="pcard-eyebrow">Zero-Catfish Standard</div>
                  <h3 className="pcard-title">Biometric Identity Verification</h3>
                  <p className="pcard-desc">
                    Multi-factor photo and document verification filters out catfishes, bots, and impersonators from day one.
                  </p>
                </div>

                <div className="pcard-micro-preview">
                  <div className="pcard-verification-pill">
                    <span className="pverif-badge">✓</span>
                    <span className="pverif-text">Biometrically & Photo Verified Profile</span>
                  </div>
                  <div className="pcard-bot-shield">
                    <span className="pbot-shield-dot"></span>
                    <span>Zero Fake Profiles & Bots Guaranteed</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 6: Personalized Experience */}
            {(featureCategory === 'all' || featureCategory === 'matchmaking') && (
              <div className="pfeature-card glass-panel pcard-pink animate-fade-in">
                <div className="pcard-glow-halo"></div>
                <div className="pcard-top">
                  <div className="pcard-icon-badge">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <span className="pcard-badge">
                    <span className="pbadge-dot"></span>
                    <span>Adaptive Brain</span>
                  </span>
                </div>

                <div className="pcard-body">
                  <div className="pcard-eyebrow">Behavioral Tuning</div>
                  <h3 className="pcard-title">Continuous Taste Learning</h3>
                  <p className="pcard-desc">
                    Our adaptive engine learns what kinds of vibes, humor, and conversation starters resonate with you, continuously refining recommendations.
                  </p>
                </div>

                <div className="pcard-micro-preview">
                  <div className="pcard-taste-pill">
                    <span className="ptaste-spark">✨</span>
                    <span className="ptaste-text">Adaptive Resonance Engine Active</span>
                  </div>
                  <div className="pcard-taste-highlights">
                    <span className="ptaste-tag">Curated Feed</span>
                    <span className="ptaste-tag">Daily Highlights</span>
                    <span className="ptaste-tag">Smart Prompts</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* =========================================================================
          SAFETY & MODERATION SECTION - ULTRA PREMIUM ARCHITECTURE
          ========================================================================= */}
      <section className="section-wrap safety-section" id="safety">
        {/* Atmospheric defense ambient glows */}
        <div className="safety-ambient-glow safety-glow-emerald"></div>
        <div className="safety-ambient-glow safety-glow-indigo"></div>

        <Container>
          <div className="safety-box glass-panel">
            <div className="safety-grid">
              {/* Left Column: Heading, Lead & 4 Bento Safety Pillars */}
              <div className="safety-text-col">
                <div className="safety-badge-wrap">
                  <div className="section-badge safety-pill-badge">
                    <span className="badge-dot badge-dot-emerald"></span>
                    <span>Proactive Defense Architecture</span>
                  </div>
                  <span className="safety-status-tag">Bank-Grade Privacy</span>
                </div>

                <h2 className="safety-heading">
                  Your safety, privacy, and <br />
                  <span className="gradient-safety">peace of mind come first.</span>
                </h2>

                <p className="safety-lead">
                  Dating should feel exhilarating, not vulnerable. Connectly embeds proactive cryptographic protection, stealth location masking, and biometric identity screening into every single interaction.
                </p>

                {/* 4 Interactive Bento Safety Cards in 2x2 Grid */}
                <div className="safety-bento-grid">
                  <div className="safety-bento-card sbc-rose">
                    <div className="sbc-icon-badge">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </div>
                    <div className="sbc-content">
                      <div className="sbc-top-row">
                        <strong>Instant Block & Unmatch</strong>
                        <span className="sbc-pill">Zero Retaliation</span>
                      </div>
                      <p>Sever connections with a single tap. Your profile vanishes from their sight immediately with zero alerts sent.</p>
                    </div>
                  </div>

                  <div className="safety-bento-card sbc-cyan">
                    <div className="sbc-icon-badge">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div className="sbc-content">
                      <div className="sbc-top-row">
                        <strong>Location Privacy Shield</strong>
                        <span className="sbc-pill">Obfuscated GPS</span>
                      </div>
                      <p>We never share exact coordinates. Only generalized distance radius is displayed to protect your home and work.</p>
                    </div>
                  </div>

                  <div className="safety-bento-card sbc-emerald">
                    <div className="sbc-icon-badge">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    </div>
                    <div className="sbc-content">
                      <div className="sbc-top-row">
                        <strong>24/7 Human Moderation</strong>
                        <span className="sbc-pill">&lt;3 Min Response</span>
                      </div>
                      <p>Automated toxicity interception combined with round-the-clock specialized human review for rapid interventions.</p>
                    </div>
                  </div>

                  <div className="safety-bento-card sbc-amber">
                    <div className="sbc-icon-badge">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div className="sbc-content">
                      <div className="sbc-top-row">
                        <strong>Account Sovereignty</strong>
                        <span className="sbc-pill">Full Data Purge</span>
                      </div>
                      <p>Pause discovery mode, enable ghost browsing, export all your data, or permanently wipe your account in seconds.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Guardian Security Telemetry Hub */}
              <div className="safety-preview-col">
                <div className="safety-card-shield glass-panel">
                  {/* Concentric Pulsing Shield Crest */}
                  <div className="shield-crest-wrap">
                    <div className="shield-pulse-ring ring-1"></div>
                    <div className="shield-pulse-ring ring-2"></div>
                    <div className="shield-emblem-core">
                      <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                      </svg>
                    </div>
                  </div>

                  <div className="shield-live-tag">
                    <span className="live-tag-beacon"></span>
                    <span>Real-Time Defense Active</span>
                  </div>

                  <h3 className="shield-hub-title">Connectly Guardian Standard</h3>
                  <p className="shield-hub-desc">
                    Protected by multi-tier biometrics, strict double opt-in validation, and encrypted WebSocket infrastructure.
                  </p>

                  {/* Live Security Controls Simulator */}
                  <div className="shield-controls-list">
                    <div className="shield-control-row">
                      <div className="scontrol-meta">
                        <span className="scontrol-icon">👻</span>
                        <div className="scontrol-text">
                          <span className="scontrol-title">Incognito Ghost Browsing</span>
                          <span className="scontrol-sub">Browse only those you like</span>
                        </div>
                      </div>
                      <div className="scontrol-toggle active">
                        <span className="toggle-switch"></span>
                      </div>
                    </div>

                    <div className="shield-control-row">
                      <div className="scontrol-meta">
                        <span className="scontrol-icon">📍</span>
                        <div className="scontrol-text">
                          <span className="scontrol-title">Precise GPS Cloaking</span>
                          <span className="scontrol-sub">Approximate radius mask</span>
                        </div>
                      </div>
                      <div className="scontrol-toggle active">
                        <span className="toggle-switch"></span>
                      </div>
                    </div>

                    <div className="shield-control-row">
                      <div className="scontrol-meta">
                        <span className="scontrol-icon">🛡️</span>
                        <div className="scontrol-text">
                          <span className="scontrol-title">Anti-Harassment Auto-Filter</span>
                          <span className="scontrol-sub">Intercepts toxic language</span>
                        </div>
                      </div>
                      <div className="scontrol-toggle active">
                        <span className="toggle-switch"></span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Trust Metrics */}
                  <div className="shield-stats-grid">
                    <div className="shield-stat-item">
                      <span className="stat-number">100%</span>
                      <span className="stat-caption">AES-256 Encrypted</span>
                    </div>
                    <div className="shield-stat-item">
                      <span className="stat-number">Zero</span>
                      <span className="stat-caption">Data Reselling</span>
                    </div>
                    <div className="shield-stat-item">
                      <span className="stat-number">&lt;3m</span>
                      <span className="stat-caption">Report Resolution</span>
                    </div>
                    <div className="shield-stat-item">
                      <span className="stat-number">24/7</span>
                      <span className="stat-caption">Active Safety Team</span>
                    </div>
                  </div>

                  <div className="shield-footer-action">
                    <Link to="/safety" className="shield-guidelines-link">
                      <span>Explore Safety Guidelines &amp; Code of Conduct</span>
                      <span className="link-arrow">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* =========================================================================
          REAL MEMBER STORIES & TESTIMONIALS SECTION - ULTRA PREMIUM ARCHITECTURE
          ========================================================================= */}
      <section className="section-wrap stories-section" id="stories">
        <div className="stories-ambient-glow stories-glow-pink"></div>
        <div className="stories-ambient-glow stories-glow-violet"></div>

        <Container>
          <div className="stories-header-wrap">
            <SectionTitle
              badge="Real Connections • Zero Superficiality"
              title="Stories of Genuine Resonance"
              subtitle="Over 45,000+ meaningful relationships and authentic chemistry began with an intentional first message on Connectly."
            />
          </div>

          {/* Interactive Story Filter Tabs */}
          <div className="stories-filter-nav">
            <button
              className={`stories-filter-btn ${storyCategory === 'all' ? 'active' : ''}`}
              onClick={() => setStoryCategory('all')}
            >
              <span>🌟 All Stories</span>
            </button>
            <button
              className={`stories-filter-btn ${storyCategory === 'couples' ? 'active' : ''}`}
              onClick={() => setStoryCategory('couples')}
            >
              <span>💖 Dating &amp; Couples</span>
            </button>
            <button
              className={`stories-filter-btn ${storyCategory === 'creative' ? 'active' : ''}`}
              onClick={() => setStoryCategory('creative')}
            >
              <span>🎨 Creative Collaborators</span>
            </button>
            <button
              className={`stories-filter-btn ${storyCategory === 'friends' ? 'active' : ''}`}
              onClick={() => setStoryCategory('friends')}
            >
              <span>🤝 Genuine Friendships</span>
            </button>
          </div>

          {/* 3 Ultra-Premium Story Cards */}
          <div className="stories-grid">
            {/* Story 1 */}
            {(storyCategory === 'all' || storyCategory === 'couples') && (
              <div className="story-card glass-panel scard-romantic animate-fade-in">
                <div className="scard-glow-halo"></div>

                <div className="scard-top-header">
                  <div className="scard-couple-avatars">
                    <div className="scard-avatar av-1">
                      <span>👩‍🎨</span>
                    </div>
                    <div className="scard-couple-heart">💖</div>
                    <div className="scard-avatar av-2">
                      <span>🧑‍💻</span>
                    </div>
                  </div>

                  <div className="scard-meta">
                    <span className="scard-status-pill">Together 14 Months</span>
                    <span className="scard-location">📍 Seattle, WA</span>
                  </div>
                </div>

                <div className="scard-names-row">
                  <h3 className="scard-couple-names">Elena &amp; Marcus</h3>
                  <span className="scard-verified-chip">✓ Verified Couple</span>
                </div>

                <div className="scard-match-score-bar">
                  <div className="scard-score-info">
                    <span className="scard-score-label">⚡ Resonance Compatibility</span>
                    <span className="scard-score-val">98% Match</span>
                  </div>
                  <div className="scard-score-track">
                    <div className="scard-score-fill" style={{ width: '98%' }}></div>
                  </div>
                </div>

                <blockquote className="scard-quote">
                  "We both had extreme fatigue from mindless swiping apps. On Connectly, we matched over our weirdly specific obsession with vintage synthesizers and specialty Ethiopian light roasts. Our first coffee date lasted six hours—we've been inseparable ever since."
                </blockquote>

                <div className="scard-tags-row">
                  <span className="scard-tag">#SpecialtyCoffee</span>
                  <span className="scard-tag">#VintageSynths</span>
                  <span className="scard-tag">#IndieFilms</span>
                </div>

                <div className="scard-footer">
                  <span className="scard-timeline">Matched within 48h of joining</span>
                  <span className="scard-stars">★★★★★</span>
                </div>
              </div>
            )}

            {/* Story 2 */}
            {(storyCategory === 'all' || storyCategory === 'couples') && (
              <div className="story-card glass-panel scard-engaged animate-fade-in">
                <div className="scard-glow-halo"></div>

                <div className="scard-top-header">
                  <div className="scard-couple-avatars">
                    <div className="scard-avatar av-3">
                      <span>👩‍🔬</span>
                    </div>
                    <div className="scard-couple-heart">💍</div>
                    <div className="scard-avatar av-4">
                      <span>🧑‍🎨</span>
                    </div>
                  </div>

                  <div className="scard-meta">
                    <span className="scard-status-pill scard-pill-engaged">Officially Engaged</span>
                    <span className="scard-location">📍 Brooklyn, NY</span>
                  </div>
                </div>

                <div className="scard-names-row">
                  <h3 className="scard-couple-names">Aria &amp; Daniel</h3>
                  <span className="scard-verified-chip">✓ Verified Couple</span>
                </div>

                <div className="scard-match-score-bar">
                  <div className="scard-score-info">
                    <span className="scard-score-label">⚡ Resonance Compatibility</span>
                    <span className="scard-score-val">96% Match</span>
                  </div>
                  <div className="scard-score-track">
                    <div className="scard-score-fill" style={{ width: '96%' }}></div>
                  </div>
                </div>

                <blockquote className="scard-quote">
                  "The double opt-in protection made me feel completely respected. Daniel asked me about my favorite independent contemporary gallery in his very first message rather than a generic pick-up line. We just got engaged last month in Paris!"
                </blockquote>

                <div className="scard-tags-row">
                  <span className="scard-tag">#ModernArt</span>
                  <span className="scard-tag">#Bouldering</span>
                  <span className="scard-tag">#ElectronicMusic</span>
                </div>

                <div className="scard-footer">
                  <span className="scard-timeline">Connected October 2024</span>
                  <span className="scard-stars">★★★★★</span>
                </div>
              </div>
            )}

            {/* Story 3 */}
            {(storyCategory === 'all' || storyCategory === 'creative' || storyCategory === 'friends') && (
              <div className="story-card glass-panel scard-creative animate-fade-in">
                <div className="scard-glow-halo"></div>

                <div className="scard-top-header">
                  <div className="scard-couple-avatars">
                    <div className="scard-avatar av-5">
                      <span>🧑‍🚀</span>
                    </div>
                    <div className="scard-couple-heart">⚡</div>
                    <div className="scard-avatar av-6">
                      <span>👩‍💼</span>
                    </div>
                  </div>

                  <div className="scard-meta">
                    <span className="scard-status-pill scard-pill-creative">Co-Founders &amp; Best Friends</span>
                    <span className="scard-location">📍 Austin, TX</span>
                  </div>
                </div>

                <div className="scard-names-row">
                  <h3 className="scard-couple-names">Chloe &amp; Liam</h3>
                  <span className="scard-verified-chip">✓ Verified Connection</span>
                </div>

                <div className="scard-match-score-bar">
                  <div className="scard-score-info">
                    <span className="scard-score-label">⚡ Resonance Compatibility</span>
                    <span className="scard-score-val">95% Match</span>
                  </div>
                  <div className="scard-score-track">
                    <div className="scard-score-fill" style={{ width: '95%' }}></div>
                  </div>
                </div>

                <blockquote className="scard-quote">
                  "We both moved to Austin alone without knowing a single person. Connectly's lifestyle filters paired us up because of our shared interest in AI design and trail ultramarathons. Now we run together every weekend and just launched a studio together!"
                </blockquote>

                <div className="scard-tags-row">
                  <span className="scard-tag">#TrailRunning</span>
                  <span className="scard-tag">#TechDesign</span>
                  <span className="scard-tag">#AustinLife</span>
                </div>

                <div className="scard-footer">
                  <span className="scard-timeline">Matched in Week 1</span>
                  <span className="scard-stars">★★★★★</span>
                </div>
              </div>
            )}
          </div>

        </Container>
      </section>

      {/* =========================================================================
          FAQ ACCORDION SECTION - ULTRA PREMIUM ARCHITECTURE
          ========================================================================= */}
      <section className="section-wrap faq-section">
        {/* Ambient atmospheric backdrops */}
        <div className="faq-ambient-glow faq-glow-cyan"></div>
        <div className="faq-ambient-glow faq-glow-violet"></div>

        <Container>
          <div className="faq-header-wrap">
            <div className="faq-eyebrow-pill">
              <span className="faq-sparkle">✨</span>
              <span>Got Questions? We’ve Got Answers</span>
            </div>
            <SectionTitle
              title="Frequently Asked Questions"
              subtitle="Everything you need to know about our matching philosophy, member verification, and privacy protections."
            />
          </div>

          <div className="faq-accordion-container">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className={`faq-card glass-panel ${isOpen ? 'faq-card-open' : ''}`}
                >
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                    id={`faq-btn-${index}`}
                  >
                    <div className="faq-q-left">
                      <span className="faq-cat-badge">
                        <span className="faq-cat-icon">{item.icon}</span>
                        {item.badge}
                      </span>
                      <h3 className="faq-q-text">{item.question}</h3>
                    </div>
                    <div className={`faq-chevron-icon ${isOpen ? 'rotated' : ''}`} aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </button>

                  <div className={`faq-answer-panel ${isOpen ? 'expanded' : ''}`}>
                    <div className="faq-answer-inner">
                      <p>{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Help Concierge Banner */}
          <div className="faq-concierge-card glass-panel">
            <div className="faq-concierge-content">
              <div className="faq-concierge-icon">💬</div>
              <div className="faq-concierge-text">
                <h4>Have a question that is not covered here?</h4>
                <p>Our dedicated Member Support team is ready around the clock to help with any inquiries.</p>
              </div>
            </div>
            <div className="faq-concierge-actions">
              <Link to="/about">
                <Button variant="secondary" size="md">
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* =========================================================================
          FINAL CALL TO ACTION SECTION - ULTRA PREMIUM ARCHITECTURE
          ========================================================================= */}
      <section className="section-wrap cta-section">
        {/* Cinematic ambient atmospheric backdrops */}
        <div className="cta-cosmic-glow cta-glow-violet"></div>
        <div className="cta-cosmic-glow cta-glow-pink"></div>
        <div className="cta-cosmic-glow cta-glow-cyan"></div>

        <Container>
          <div className="cta-banner glass-panel">
            {/* Top Eyebrow Badge */}
            <div className="cta-eyebrow-pill">
              <span className="cta-pulse-beacon"></span>
              <span className="cta-eyebrow-text">Start Your Story Tonight</span>
              <span className="cta-members-count">✨ 1,420+ Matches Today</span>
            </div>

            {/* Floating Avatars Constellation */}
            <div className="cta-avatars-constellation">
              <div className="cta-avatar-item cav-1" title="Elena">
                <span className="cav-fallback">👩‍🎨</span>
                <span className="cav-online-dot"></span>
              </div>
              <div className="cta-avatar-item cav-2" title="Marcus">
                <span className="cav-fallback">🧑‍💻</span>
                <span className="cav-online-dot"></span>
              </div>
              <div className="cta-avatar-center-spark">
                <span className="center-heart-pulse">💖</span>
              </div>
              <div className="cta-avatar-item cav-3" title="Sophie">
                <span className="cav-fallback">👩‍🔬</span>
                <span className="cav-online-dot"></span>
              </div>
              <div className="cta-avatar-item cav-4" title="Liam">
                <span className="cav-fallback">🧑‍🚀</span>
                <span className="cav-online-dot"></span>
              </div>
            </div>

            {/* High-Impact Headline & Subtitle */}
            <h2 className="cta-title">
              Ready to meet someone <br />
              <span className="gradient-brand">who truly matches your vibe?</span>
            </h2>

            <p className="cta-subtitle">
              Join thousands of verified members discovering authentic conversations, shared passions, and chemistry-fueled relationships without superficial swiping fatigue.
            </p>

            {/* High-Conversion CTA Buttons */}
            <div className="cta-button-row">
              <Link to="/register">
                <Button variant="glow" size="lg" className="cta-primary-btn">
                  <span>Create Your Free Profile</span>
                  <span className="cta-btn-arrow">→</span>
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button variant="secondary" size="lg" className="cta-secondary-btn">
                  <span>See How It Works</span>
                </Button>
              </Link>
            </div>

            {/* Micro Trust Reassurance Row */}
            <div className="cta-trust-bar">
              <div className="cta-trust-chip">
                <span className="ctrust-icon">⚡</span>
                <span>2-Minute Setup</span>
              </div>
              <div className="cta-trust-chip">
                <span className="ctrust-icon">🛡️</span>
                <span>100% Privacy Protected</span>
              </div>
              <div className="cta-trust-chip">
                <span className="ctrust-icon">✓</span>
                <span>Biometrically Verified Members</span>
              </div>
              <div className="cta-trust-chip">
                <span className="ctrust-icon">💳</span>
                <span>No Credit Card Required</span>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default LandingPage;
