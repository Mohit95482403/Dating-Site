import React, { useState, useEffect, useRef } from 'react';
import aiService from '../../services/ai.service';
import type { ConversationSuggestionsResult, ConversationStarterResult } from '../../types/ai';
import {
  Sparkles,
  X,
  MessageSquarePlus,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import './AIComponents.css';

interface ConversationAIAssistantProps {
  conversationId: number;
  targetUserId?: number;
  partnerName?: string;
  hasMessages?: boolean;
  onSelectSuggestion: (text: string) => void;
  disabled?: boolean;
}

export const ConversationAIAssistant: React.FC<ConversationAIAssistantProps> = ({
  conversationId,
  targetUserId,
  partnerName = 'your match',
  hasMessages = true,
  onSelectSuggestion,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      if (hasMessages) {
        const res: ConversationSuggestionsResult =
          await aiService.getConversationSuggestions(conversationId);
        setSuggestions(res.suggestions);
        setTopics(res.topicsDetected || []);
      } else if (targetUserId) {
        const res: ConversationStarterResult =
          await aiService.getConversationStarter(targetUserId);
        setSuggestions(res.starters);
        setTopics(res.sharedInterests || []);
      } else {
        // Fallback to conversation suggestions
        const res = await aiService.getConversationSuggestions(conversationId);
        setSuggestions(res.suggestions);
      }
    } catch (err: any) {
      console.error('Failed to get AI conversation suggestions:', err);
      setError(
        err?.response?.data?.message ||
          'AI suggestions temporarily unavailable. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && suggestions.length === 0) {
      fetchSuggestions();
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleChoose = (text: string) => {
    onSelectSuggestion(text);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="chat-ai-trigger-btn"
        aria-label="Get AI conversation suggestions"
        title="Get AI reply ideas and conversation suggestions"
      >
        <Sparkles size={14} />
        <span>AI Reply</span>
      </button>

      {/* Floating Popover */}
      {isOpen && (
        <div className="chat-ai-popover" role="dialog" aria-label="AI Conversation Suggestions">
          <div className="chat-ai-popover-header">
            <div className="chat-ai-popover-title">
              <Sparkles size={14} className="text-purple-400" />
              <span>
                {hasMessages ? 'Suggested Replies' : `Icebreakers for ${partnerName}`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={fetchSuggestions}
                disabled={loading}
                title="Regenerate suggestions"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {topics.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Context:</span>
              {topics.map((t, idx) => (
                <span
                  key={`topic-${idx}`}
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '9999px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#e9d5ff',
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <div className="ai-loading-state" style={{ padding: '1rem' }}>
              <div className="ai-loading-spinner" style={{ width: 22, height: 22 }} />
              <p className="ai-loading-text" style={{ fontSize: '0.8rem' }}>
                Analyzing context & crafting replies...
              </p>
            </div>
          ) : error ? (
            <div className="ai-error-banner" style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem' }}>
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchSuggestions}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff4d79',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                Retry
              </button>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="chat-ai-suggestions-list">
              {suggestions.map((sug, idx) => (
                <button
                  key={`sug-${idx}`}
                  type="button"
                  onClick={() => handleChoose(sug)}
                  className="chat-ai-suggestion-btn"
                  title="Click to insert into message composer"
                >
                  <span>"{sug}"</span>
                  <MessageSquarePlus size={14} className="chat-ai-suggestion-insert-icon" />
                </button>
              ))}
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'rgba(255,255,255,0.45)',
                  textAlign: 'center',
                  marginTop: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                }}
              >
                <Lightbulb size={11} />
                <span>Clicking a suggestion inserts it into the composer for review before sending.</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.75rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
              No suggestions available right now.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationAIAssistant;
