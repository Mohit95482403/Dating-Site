import React, { useState } from 'react';
import aiService from '../../services/ai.service';
import type { BioStyle, BioImprovementResult } from '../../types/ai';
import {
  Wand2,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Copy,
  Sparkles,
} from 'lucide-react';
import './AIComponents.css';

interface BioImprovementModalProps {
  isOpen: boolean;
  currentBio: string;
  onClose: () => void;
  onApply: (suggestedBio: string) => void;
}

const STYLES: { id: BioStyle; label: string }[] = [
  { id: 'confident', label: 'Confident' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'funny', label: 'Funny & Witty' },
  { id: 'creative', label: 'Creative & Adventurous' },
  { id: 'short_and_sweet', label: 'Short & Sweet' },
  { id: 'professional', label: 'Clean & Polished' },
];

export const BioImprovementModal: React.FC<BioImprovementModalProps> = ({
  isOpen,
  currentBio,
  onClose,
  onApply,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<BioStyle>('confident');
  const [result, setResult] = useState<BioImprovementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (styleToUse: BioStyle = selectedStyle) => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.improveBio(currentBio, styleToUse);
      setResult(res);
    } catch (err: any) {
      console.error('Failed to improve bio:', err);
      setError(
        err?.response?.data?.message ||
          'Failed to enhance bio at this time. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStyle = (style: BioStyle) => {
    setSelectedStyle(style);
    handleGenerate(style);
  };

  const handleCopySuggestion = () => {
    if (!result?.suggestedBio) return;
    navigator.clipboard.writeText(result.suggestedBio);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAcceptSuggestion = () => {
    if (!result?.suggestedBio) return;
    onApply(result.suggestedBio);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="ai-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bio-modal-title"
    >
      <div className="ai-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ai-modal-header">
          <div className="ai-modal-header-left">
            <div className="ai-modal-icon-badge">
              <Wand2 size={20} />
            </div>
            <div>
              <h2 id="bio-modal-title" className="ai-modal-title">
                AI Bio Enhancer
              </h2>
              <p className="ai-modal-subtitle">
                Craft a punchy, authentic bio in your personal voice
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ai-modal-close-btn"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="ai-modal-body">
          {/* Style Selector Pills */}
          <div className="bio-style-selector-wrap">
            <h4 className="bio-style-label">Select Voice Tone</h4>
            <div className="bio-style-buttons">
              {STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSelectStyle(st.id)}
                  disabled={loading}
                  className={`bio-style-btn ${selectedStyle === st.id ? 'active' : ''}`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Initial State Prompt if not yet generated */}
          {!result && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <Sparkles size={28} color="#a855f7" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                {currentBio.trim().length > 0
                  ? `Enhance your existing bio with the "${STYLES.find((s) => s.id === selectedStyle)?.label}" tone.`
                  : `Generate an engaging starting bio tailored to your interests and occupation.`}
              </p>
              <button
                type="button"
                onClick={() => handleGenerate()}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '0.65rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Wand2 size={16} />
                <span>Generate Suggestion</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="ai-loading-state">
              <div className="ai-loading-spinner" />
              <p className="ai-loading-text">
                Enhancing your bio in a {STYLES.find((s) => s.id === selectedStyle)?.label.toLowerCase()} style...
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="ai-error-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => handleGenerate()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff4d79',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Side-by-Side Original vs Suggestion Comparison */}
          {result && !loading && (
            <div className="bio-comparison-container">
              {/* Original Box */}
              <div className="bio-box">
                <div className="bio-box-header">
                  <span className="bio-box-label">Original Bio</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                    {result.originalBio.length} chars
                  </span>
                </div>
                <p className="bio-box-content">
                  {result.originalBio || '(No bio previously written)'}
                </p>
              </div>

              {/* Suggested Box */}
              <div className="bio-box suggested">
                <div className="bio-box-header">
                  <span className="bio-box-label" style={{ color: '#d8b4fe' }}>
                    Suggested ({STYLES.find((s) => s.id === result.style)?.label})
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySuggestion}
                    title="Copy suggestion to clipboard"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copied ? '#10b981' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.72rem',
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="bio-box-content">{result.suggestedBio}</p>

                {result.keyHighlights.length > 0 && (
                  <div className="bio-highlights-list">
                    {result.keyHighlights.map((hl, idx) => (
                      <span key={`hl-${idx}`} className="bio-highlight-tag">
                        ✓ {hl}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="ai-modal-footer">
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.65rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            Keep Original
          </button>

          {result && (
            <button
              type="button"
              onClick={handleAcceptSuggestion}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '0.65rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <Check size={15} />
              <span>Use Suggestion</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BioImprovementModal;
