import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/common/Container';
import Button from '../components/common/Button';
import './WatchHowItWorksPage.css';

interface Chapter {
  id: number;
  title: string;
  duration: string;
  timeSec: number;
  badge: string;
  desc: string;
  icon: string;
}

const chapters: Chapter[] = [
  {
    id: 1,
    title: 'Crafting Your True Identity',
    duration: '00:00 - 00:45',
    timeSec: 0,
    badge: 'Step 01',
    desc: 'Bypassing superficial bios with multi-dimensional vibe tags, passions, and authentic voice prompts.',
    icon: '✨',
  },
  {
    id: 2,
    title: 'Multi-Dimensional Resonance Engine',
    duration: '00:45 - 01:30',
    timeSec: 45,
    badge: 'Step 02',
    desc: 'How our algorithm evaluates communication tempo, core values, and lifestyle rhythm synergy.',
    icon: '🎯',
  },
  {
    id: 3,
    title: 'Biometric Anti-Bot Defense',
    duration: '01:30 - 02:15',
    timeSec: 90,
    badge: 'Step 03',
    desc: 'Selfie liveness verification and device-bound integrity checks eliminating 100% of fake profiles.',
    icon: '🛡️',
  },
  {
    id: 4,
    title: 'Spontaneous Voice Sparks & Safe Chats',
    duration: '02:15 - 03:20',
    timeSec: 135,
    badge: 'Step 04',
    desc: 'Engage in zero-creep conversations, guided chemistry icebreakers, and real-time audio rooms.',
    icon: '🎙️',
  },
];

export const WatchHowItWorksPage: React.FC = () => {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(15);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-progress simulation timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Sync chapter with progress
  useEffect(() => {
    if (progress < 25) setActiveChapterIndex(0);
    else if (progress < 50) setActiveChapterIndex(1);
    else if (progress < 75) setActiveChapterIndex(2);
    else setActiveChapterIndex(3);
  }, [progress]);

  const selectChapter = (index: number) => {
    setActiveChapterIndex(index);
    setProgress(index * 25 + 5);
    setIsPlaying(true);
  };

  const currentChapter = chapters[activeChapterIndex];

  return (
    <div className={`video-tour-page ${isFullscreen ? 'cinema-fullscreen' : ''}`}>
      {/* Cinematic Ambient Glow Backdrops */}
      <div className="vtour-glow vtour-glow-magenta" aria-hidden="true"></div>
      <div className="vtour-glow vtour-glow-violet" aria-hidden="true"></div>
      <div className="vtour-glow vtour-glow-cyan" aria-hidden="true"></div>

      <Container>
        {/* Breadcrumb & Navigation Header */}
        <div className="vtour-header">
          <div className="vtour-breadcrumbs">
            <Link to="/" className="vtour-breadcrumb-link">Home</Link>
            <span className="vtour-breadcrumb-sep">/</span>
            <Link to="/how-it-works" className="vtour-breadcrumb-link">How It Works</Link>
            <span className="vtour-breadcrumb-sep">/</span>
            <span className="vtour-breadcrumb-current">Video Tour</span>
          </div>

          <div className="vtour-badge-pill">
            <span className="vtour-pulse-dot"></span>
            <span>4K Interactive Video Tour • 3 Min Walkthrough</span>
          </div>

          <h1 className="vtour-title">
            See How Connectly <span className="vtour-title-highlight">Reinvents Modern Dating.</span>
          </h1>

          <p className="vtour-subtitle">
            Explore our breakthrough compatibility engine, biometric security protocols, and intentional conversation tools in full cinematic motion.
          </p>
        </div>

        {/* =========================================================================
            CINEMATIC VIDEO PLAYER THEATER
            ========================================================================= */}
        <div className="vtour-theater-wrapper">
          <div className="vtour-theater-frame glass-panel">
            {/* Top Player Status Bar */}
            <div className="vplayer-top-bar">
              <div className="vplayer-file-info">
                <span className="vplayer-dot red"></span>
                <span className="vplayer-dot yellow"></span>
                <span className="vplayer-dot green"></span>
                <span className="vplayer-filename">CONNECTLY_EXPERIENCE_TOUR_2026.HDR</span>
              </div>
              <div className="vplayer-badges-row">
                <span className="vplayer-spec-pill">4K ULTRA HD</span>
                <span className="vplayer-spec-pill">DOLBY ATMOS</span>
                <span className="vplayer-live-chip">
                  <span className="live-sparkle">●</span> LIVE SIMULATION
                </span>
              </div>
            </div>

            {/* Main Stage Video Canvas */}
            <div className="vplayer-canvas" onClick={() => setIsPlaying(!isPlaying)}>
              {/* Dynamic Chapter Visual Showcase Simulation */}
              <div className="vplayer-simulation-stage">
                {activeChapterIndex === 0 && (
                  <div className="sim-scene sim-scene-profile animate-fade-in">
                    <div className="sim-phone-mockup glass-panel">
                      <div className="sim-mockup-header">
                        <span className="sim-avatar">👩‍🎨</span>
                        <div>
                          <strong>Elena Vance, 26</strong>
                          <span>Seattle, WA • 4 km away</span>
                        </div>
                        <span className="sim-verified-tag">✓ ID Verified</span>
                      </div>
                      <div className="sim-radar-vis">
                        <div className="radar-circle rc-1"></div>
                        <div className="radar-circle rc-2"></div>
                        <div className="radar-circle rc-3"></div>
                        <div className="radar-center-pulse">✨</div>
                      </div>
                      <div className="sim-tags-stream">
                        <span className="sim-tag">☕ Specialty Espresso</span>
                        <span className="sim-tag">🎨 Oil Painting</span>
                        <span className="sim-tag">🎧 Vintage Vinyls</span>
                      </div>
                      <div className="sim-prompt-bubble">
                        <em>"My ideal Sunday morning starts with pour-over coffee and finding hidden bookstore alleys."</em>
                      </div>
                    </div>
                    <div className="sim-callout glass-panel">
                      <span className="sim-callout-icon">✨</span>
                      <div>
                        <strong>Authentic Identity Engine</strong>
                        <p>No shallow one-line bios. Real passions and conversational prompts mapped in 3D.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeChapterIndex === 1 && (
                  <div className="sim-scene sim-scene-matching animate-fade-in">
                    <div className="sim-match-duo">
                      <div className="sim-match-avatar-card glass-panel">
                        <span className="sim-duo-avatar">👩‍🎨</span>
                        <strong>Elena, 26</strong>
                        <span className="sim-vibe-note">Creative Arts</span>
                      </div>

                      <div className="sim-resonance-core glass-panel">
                        <div className="sim-score-ring">
                          <strong>98%</strong>
                          <span>Resonance</span>
                        </div>
                        <div className="sim-resonance-pills">
                          <span>Tempo: 99%</span>
                          <span>Values: 97%</span>
                          <span>Music: 98%</span>
                        </div>
                      </div>

                      <div className="sim-match-avatar-card glass-panel">
                        <span className="sim-duo-avatar">🧑‍💻</span>
                        <strong>Marcus, 28</strong>
                        <span className="sim-vibe-note">Sound Design</span>
                      </div>
                    </div>
                    <div className="sim-callout glass-panel">
                      <span className="sim-callout-icon">🎯</span>
                      <div>
                        <strong>Mutual Chemistry Calculations</strong>
                        <p>Evaluates true communication synergy and shared lifestyle rhythms before introducing you.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeChapterIndex === 2 && (
                  <div className="sim-scene sim-scene-security animate-fade-in">
                    <div className="sim-biometric-scanner glass-panel">
                      <div className="sim-scanner-target">
                        <div className="scanner-line"></div>
                        <span className="scanner-face-icon">👤</span>
                        <div className="scanner-corner sc-tl"></div>
                        <div className="scanner-corner sc-tr"></div>
                        <div className="scanner-corner sc-bl"></div>
                        <div className="scanner-corner sc-br"></div>
                      </div>
                      <div className="sim-scanner-results">
                        <div className="scanner-stat-row">
                          <span>Biometric Liveness:</span>
                          <strong className="text-emerald">PASSED (100%)</strong>
                        </div>
                        <div className="scanner-stat-row">
                          <span>Device Integrity:</span>
                          <strong className="text-emerald">AUTHENTICATED</strong>
                        </div>
                        <div className="scanner-stat-row">
                          <span>Bot Likelihood:</span>
                          <strong className="text-emerald">0.00%</strong>
                        </div>
                      </div>
                    </div>
                    <div className="sim-callout glass-panel">
                      <span className="sim-callout-icon">🛡️</span>
                      <div>
                        <strong>Bank-Grade Biometric Defense</strong>
                        <p>Active 3D selfie checks safeguard our community. Zero bots. Zero romance scammers.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeChapterIndex === 3 && (
                  <div className="sim-scene sim-scene-chat animate-fade-in">
                    <div className="sim-chat-room glass-panel">
                      <div className="sim-chat-bubble incoming">
                        <span className="bubble-av">👩‍🎨</span>
                        <div className="bubble-body">
                          <p>Hey Marcus! Saw you’re into vintage synths. Ever heard of the Juno-106?</p>
                          <span className="bubble-time">10:14 PM</span>
                        </div>
                      </div>

                      <div className="sim-chat-voice outgoing">
                        <span className="voice-play-icon">▶</span>
                        <div className="voice-wave-bars">
                          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                        </div>
                        <span className="voice-duration">0:18 Voice Spark</span>
                      </div>

                      <div className="sim-chat-bubble incoming">
                        <span className="bubble-av">👩‍🎨</span>
                        <div className="bubble-body">
                          <p>That analog warm sound is unmatched! Want to do a quick 3-min audio call?</p>
                          <span className="bubble-time">10:16 PM</span>
                        </div>
                      </div>
                    </div>
                    <div className="sim-callout glass-panel">
                      <span className="sim-callout-icon">🎙️</span>
                      <div>
                        <strong>Spontaneous Voice &amp; Video Dates</strong>
                        <p>End the texting limbo with low-pressure 3-minute chemistry audio sparks.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Big Play Overlay (when paused) */}
              {!isPlaying && (
                <div className="vplayer-pause-overlay">
                  <button type="button" className="vplayer-play-btn-large" aria-label="Resume video">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </button>
                  <span className="pause-notice">Video Paused • Click to Resume</span>
                </div>
              )}
            </div>

            {/* Video Control Scrub Bar */}
            <div className="vplayer-control-panel">
              <div 
                className="vplayer-progress-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const newPercent = Math.round((clickX / rect.width) * 100);
                  setProgress(Math.max(0, Math.min(100, newPercent)));
                }}
              >
                <div className="vplayer-progress-fill" style={{ width: `${progress}%` }}>
                  <span className="vplayer-scrubber-handle"></span>
                </div>
                {/* Chapter milestone ticks */}
                <span className="chapter-tick tick-25" title="Chapter 2: Matching"></span>
                <span className="chapter-tick tick-50" title="Chapter 3: Security"></span>
                <span className="chapter-tick tick-75" title="Chapter 4: Voice Dates"></span>
              </div>

              {/* Buttons row */}
              <div className="vplayer-buttons-row">
                <div className="vplayer-controls-left">
                  <button
                    type="button"
                    className="vctrl-btn"
                    onClick={() => setIsPlaying(!isPlaying)}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    className="vctrl-btn"
                    onClick={() => setIsMuted(!isMuted)}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <line x1="23" y1="9" x2="17" y2="15"></line>
                        <line x1="17" y1="9" x2="23" y2="15"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      </svg>
                    )}
                  </button>

                  <div className="vplayer-time-display">
                    <span className="current-time">{Math.floor((progress * 2) / 60)}:{String(Math.floor((progress * 2) % 60)).padStart(2, '0')}</span>
                    <span className="time-divider">/</span>
                    <span className="total-time">03:20</span>
                  </div>

                  <span className="vplayer-chapter-badge">
                    {currentChapter.badge}: {currentChapter.title}
                  </span>
                </div>

                <div className="vplayer-controls-right">
                  <span className="vplayer-hd-tag">4K 60FPS</span>
                  <button
                    type="button"
                    className="vctrl-btn"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    aria-label="Toggle Fullscreen"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            INTERACTIVE CHAPTER SELECTOR CARDS
            ========================================================================= */}
        <div className="vtour-chapters-section">
          <div className="vtour-section-head">
            <h2 className="vtour-section-title">Video Chapters &amp; Deep Dives</h2>
            <p className="vtour-section-sub">Select any chapter below to jump straight to that part of the product tour.</p>
          </div>

          <div className="vtour-chapters-grid">
            {chapters.map((ch, idx) => {
              const isSelected = activeChapterIndex === idx;
              return (
                <div
                  key={ch.id}
                  className={`vtour-chapter-card glass-panel ${isSelected ? 'active-chapter' : ''}`}
                  onClick={() => selectChapter(idx)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ch-top-row">
                    <span className="ch-icon-wrap">{ch.icon}</span>
                    <span className="ch-badge">{ch.badge}</span>
                    <span className="ch-time">{ch.duration}</span>
                  </div>

                  <h3 className="ch-title">{ch.title}</h3>
                  <p className="ch-desc">{ch.desc}</p>

                  <div className="ch-footer">
                    <span className="ch-play-prompt">
                      {isSelected ? '● Playing Now' : 'Jump to Chapter →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            CORE ADVANTAGES SUMMARY
            ========================================================================= */}
        <div className="vtour-highlights-grid">
          <div className="vtour-highlight-card glass-panel">
            <span className="hl-icon">⚡</span>
            <h3>Zero Swipe Burnout</h3>
            <p>Every match is introduced with calculated compatibility so you spend less time scrolling and more time talking.</p>
          </div>

          <div className="vtour-highlight-card glass-panel">
            <span className="hl-icon">🛡️</span>
            <h3>100% Verified Humans</h3>
            <p>Mandatory selfie liveness checks and encrypted phone verification ensure zero catfish or spam accounts.</p>
          </div>

          <div className="vtour-highlight-card glass-panel">
            <span className="hl-icon">🎙️</span>
            <h3>Multi-Sensory Sparks</h3>
            <p>Listen to voice notes and participate in 3-minute chemistry audio dates before exchanging numbers.</p>
          </div>
        </div>

        {/* =========================================================================
            BOTTOM CALL TO ACTION BANNER
            ========================================================================= */}
        <div className="vtour-cta-banner glass-panel">
          <div className="vtour-cta-content">
            <span className="vtour-cta-badge">Ready to find your match?</span>
            <h2 className="vtour-cta-heading">Stop Swiping. Start Truly Connecting.</h2>
            <p className="vtour-cta-sub">Join thousands of verified members discovering authentic friendships and lasting relationships.</p>
          </div>
          <div className="vtour-cta-actions">
            <Link to="/register">
              <Button variant="glow" size="lg">
                Create Free Profile
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button variant="secondary" size="lg">
                Read Detailed Guide
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default WatchHowItWorksPage;
