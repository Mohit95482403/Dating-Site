import React from 'react';
import Container from '../components/common/Container';
import SectionTitle from '../components/common/SectionTitle';
import Button from '../components/common/Button';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Users,
  Lock,
  Heart,
  EyeOff,
  UserX,
} from 'lucide-react';
import './AuthPages.css';

export const SafetyPage: React.FC = () => {
  return (
    <div className="info-page-wrap" style={{ padding: '3rem 1rem 5rem' }}>
      <Container narrow>
        <div className="info-hero" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <SectionTitle
            badge="Trust &amp; Safety Center"
            title="Your Safety, Privacy &amp; Dignity Come First"
            subtitle="Connectly provides multi-layered trust verification, cryptographic account security, and proactive anti-abuse protections."
          />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <Link to="/settings?tab=trust">
              <Button variant="primary" size="md">
                Visit Your Trust Center
              </Button>
            </Link>
            <Link to="/settings?tab=privacy">
              <Button variant="secondary" size="md">
                Configure Privacy
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. Dating Safety */}
        <div className="info-content-card glass-panel" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Heart size={24} color="#ec4899" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Dating &amp; Online Interaction Safety</h3>
          </div>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
            Never feel pressured to share sensitive financial, familial, or physical details. Watch out for attempts to migrate conversations immediately off-platform to unmoderated channels before establishing trust.
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            <li>Verify identity badges: look for the <strong>✓ Verified</strong> badge before taking key decisions.</li>
            <li>Never wire money, buy gift cards, or share cryptocurrency addresses with any match.</li>
            <li>Protect your passwords, OTP codes, and private identification documents.</li>
          </ul>
        </div>

        {/* 2. Meetup & In-Person Safety (Day 24 Integration) */}
        <div className="info-content-card glass-panel" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <MapPin size={24} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Meetup &amp; In-Person Event Safety</h3>
          </div>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
            Planning to meet a connection or attend a community meetup? Keep these golden rules in mind:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            <li><strong>Meet in public places:</strong> Always choose well-lit, populated venues like cafes, parks, or designated community venues.</li>
            <li><strong>Inform someone you trust:</strong> Share your destination, who you are meeting, and estimated return time with a close friend or family member.</li>
            <li><strong>Arrange your own transportation:</strong> Maintain control over your arrival and departure; don't rely on a first-time connection for transit.</li>
            <li><strong>Keep emergency numbers ready:</strong> Have local emergency contacts and platform reporting shortcuts easily accessible.</li>
          </ul>
        </div>

        {/* 3. Community & Group Chat Safety */}
        <div className="info-content-card glass-panel" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Users size={24} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Community &amp; Group Safety</h3>
          </div>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
            Connectly communities are moderated spaces. Group administrators and our automated anti-abuse engines monitor for spam, harassment, hate speech, and fraudulent behavior.
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            <li>Private community discussions and event participant rosters are hidden from public search indices.</li>
            <li>Community posts containing unauthorized solicitation or malicious URLs are intercepted.</li>
            <li>You can report any group post, comment, or organizer directly from the card action menu.</li>
          </ul>
        </div>

        {/* 4. Privacy & Location Obfuscation */}
        <div className="info-content-card glass-panel" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <EyeOff size={24} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Location Privacy &amp; Data Minimization</h3>
          </div>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
            Connectly <strong>never</strong> displays raw GPS coordinates, home coordinates, or exact live addresses. We use privacy-preserving approximate distance bounds (e.g. &quot;Within 5 km&quot;) or general city indicators.
          </p>
          <p style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            You have full control to hide your distance entirely under <Link to="/settings?tab=privacy" style={{ color: '#38bdf8' }}>Privacy Settings</Link>.
          </p>
        </div>

        {/* 5. Instant Block & Report Enforcement */}
        <div className="info-content-card glass-panel" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <UserX size={24} color="#f43f5e" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Instant Blocking &amp; Transparent Reporting</h3>
          </div>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
            Blocking someone immediately isolates them from your presence across discovery, matching, messages, audio/video calls, and community rosters.
          </p>
          <p style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            Track the status of every report you submit with full transparency in your <Link to="/settings?tab=reports" style={{ color: '#38bdf8' }}>Report History</Link>.
          </p>
        </div>

        {/* 6. Account Protection & 2FA */}
        <div className="info-content-card glass-panel" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Lock size={24} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Cryptographic Account Protection &amp; 2FA</h3>
          </div>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
            Activate standard RFC-6238 Two-Factor Authentication (2FA) in your security settings to safeguard your profile against account takeovers. Review active device sessions and revoke unauthorized devices anytime with a single click.
          </p>
        </div>

        {/* Actions Footer */}
        <div style={{ textAlign: 'center', marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/">
            <Button variant="secondary" size="md">
              Back to Home
            </Button>
          </Link>
          <Link to="/settings?tab=security">
            <Button variant="primary" size="md">
              Review Account Security
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default SafetyPage;
