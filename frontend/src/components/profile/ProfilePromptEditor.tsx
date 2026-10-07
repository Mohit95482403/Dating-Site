import React, { useState, useEffect } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { profileService } from '../../services/profile.service';
import { useToast } from '../../context/ToastContext';
import Button from '../common/Button';
import type { ProfilePrompt, UserProfilePrompt } from '../../types/profile';
import './ProfilePromptEditor.css';

interface ProfilePromptEditorProps {
  userPrompts: UserProfilePrompt[];
  onPromptsUpdated: (prompts: UserProfilePrompt[]) => void;
  onClose?: () => void;
}

export const ProfilePromptEditor: React.FC<ProfilePromptEditorProps> = ({
  userPrompts,
  onPromptsUpdated,
  onClose,
}) => {
  const toast = useToast();

  const [availablePrompts, setAvailablePrompts] = useState<ProfilePrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<number | ''>('');
  const [answer, setAnswer] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load available prompts
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await profileService.getPrompts();
        if (mounted) {
          setAvailablePrompts(list);
          // Pick first un-answered prompt by default if available
          const answeredIds = new Set(userPrompts.map((p) => p.promptId));
          const firstUnanswered = list.find((p) => !answeredIds.has(p.id));
          if (firstUnanswered) {
            setSelectedPromptId(firstUnanswered.id);
          } else if (list.length > 0) {
            setSelectedPromptId(list[0].id);
          }
        }
      } catch (err: any) {
        if (mounted) setError('Failed to load prompts.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [userPrompts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromptId) {
      setError('Please select a prompt.');
      return;
    }
    const trimmed = answer.trim();
    if (!trimmed) {
      setError('Please enter your answer.');
      return;
    }
    if (trimmed.length > 300) {
      setError('Answer cannot exceed 300 characters.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updated = await profileService.saveUserPrompt(Number(selectedPromptId), trimmed);
      toast.success('Prompt added to your profile!');
      onPromptsUpdated(updated);
      setAnswer('');
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save prompt.');
    } finally {
      setIsSaving(false);
    }
  };

  const answeredIds = new Set(userPrompts.map((p) => p.promptId));
  const remainingPrompts = availablePrompts.filter((p) => !answeredIds.has(p.id));

  if (isLoading) {
    return <div className="prompt-editor-loading">Loading prompt choices...</div>;
  }

  return (
    <div className="profile-prompt-editor-card">
      <div className="prompt-editor-header">
        <h3 className="editor-title">Add Profile Prompt</h3>
        {onClose && (
          <button type="button" className="editor-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="prompt-editor-form">
        {error && (
          <div className="prompt-editor-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="prompt-select-group">
          <label className="prompt-form-label" htmlFor="prompt-select">
            Choose a prompt
          </label>
          <select
            id="prompt-select"
            className="prompt-select-field"
            value={selectedPromptId}
            onChange={(e) => {
              setSelectedPromptId(Number(e.target.value));
              setError(null);
            }}
          >
            {remainingPrompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.promptText}
              </option>
            ))}
            {remainingPrompts.length === 0 && (
              <option value="" disabled>
                All prompts answered!
              </option>
            )}
          </select>
        </div>

        <div className="prompt-answer-group">
          <div className="prompt-answer-header">
            <label className="prompt-form-label" htmlFor="prompt-answer-input">
              Your Answer
            </label>
            <span
              className={`prompt-char-counter ${
                answer.length > 280 ? 'near-limit' : ''
              }`}
            >
              {answer.length} / 300
            </span>
          </div>
          <textarea
            id="prompt-answer-input"
            className="prompt-answer-textarea"
            placeholder="Share something interesting, funny, or unique..."
            rows={3}
            maxLength={300}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setError(null);
            }}
          />
        </div>

        <div className="prompt-editor-footer">
          {onClose && (
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            type="submit"
            disabled={isSaving || !answer.trim() || remainingPrompts.length === 0}
          >
            <Plus size={16} />
            <span>{isSaving ? 'Saving...' : 'Add Prompt'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePromptEditor;
