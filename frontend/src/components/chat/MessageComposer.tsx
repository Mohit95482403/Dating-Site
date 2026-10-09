import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { ConversationAIAssistant } from '../ai/ConversationAIAssistant';

interface MessageComposerProps {
  onSendMessage: (content: string) => Promise<boolean>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  conversationId?: number;
  partnerName?: string;
  hasMessages?: boolean;
  targetUserId?: number;
}

const MAX_CHAR_LIMIT = 2000;
const TYPING_DEBOUNCE_MS = 2200;

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
  conversationId,
  partnerName,
  hasMessages = true,
  targetUserId,
}) => {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Auto-resize textarea height as content expands
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [content]);

  // Reset composer state when switching conversations
  useEffect(() => {
    setContent('');
    setIsSending(false);
  }, [conversationId]);

  // Handle typing detection with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (!val.trim()) {
      // Input cleared -> stop typing immediately
      if (isTypingRef.current && onTypingStop) {
        onTypingStop();
        isTypingRef.current = false;
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      return;
    }

    // Trigger typing:start once when typing begins
    if (!isTypingRef.current && onTypingStart) {
      onTypingStart();
      isTypingRef.current = true;
    }

    // Reset inactivity debounce timer
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (isTypingRef.current && onTypingStop) {
        onTypingStop();
        isTypingRef.current = false;
      }
    }, TYPING_DEBOUNCE_MS);
  };

  const stopTypingImmediately = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingRef.current && onTypingStop) {
      onTypingStop();
      isTypingRef.current = false;
    }
  }, [onTypingStop]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (isTypingRef.current && onTypingStop) {
        onTypingStop();
      }
    };
  }, [onTypingStop]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending || disabled || trimmed.length > MAX_CHAR_LIMIT) return;

    stopTypingImmediately();
    setIsSending(true);

    try {
      const success = await onSendMessage(trimmed);
      if (success) {
        setContent('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.focus();
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charLength = content.length;
  const isOverLimit = charLength > MAX_CHAR_LIMIT;
  const isNearLimit = charLength > MAX_CHAR_LIMIT - 100;
  const canSend = content.trim().length > 0 && !isOverLimit && !isSending && !disabled;

  return (
    <div className="chat-composer-container">
      <div className="chat-composer-row">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Press Enter to send)"
            disabled={disabled || isSending}
            className="chat-textarea"
            maxLength={MAX_CHAR_LIMIT + 50}
          />
        </div>

        {conversationId && (
          <ConversationAIAssistant
            conversationId={conversationId}
            partnerName={partnerName}
            hasMessages={hasMessages}
            targetUserId={targetUserId}
            disabled={disabled || isSending}
            onSelectSuggestion={(sug) => {
              setContent(sug);
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }}
          />
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="chat-send-btn"
          aria-label="Send message"
          title="Send message (Enter)"
        >
          {isSending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} style={{ marginLeft: '2px' }} />
          )}
        </button>
      </div>

      <div className="chat-composer-footer">
        <span>Shift + Enter for new line</span>
        {charLength > 100 && (
          <span
            className={`chat-char-counter ${
              isOverLimit ? 'limit' : isNearLimit ? 'warning' : ''
            }`}
          >
            {charLength} / {MAX_CHAR_LIMIT}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageComposer;
