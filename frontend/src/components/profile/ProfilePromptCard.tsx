import React from 'react';
import { Quote, Edit2, Trash2 } from 'lucide-react';
import type { UserProfilePrompt } from '../../types/profile';
import './ProfilePromptCard.css';

interface ProfilePromptCardProps {
  prompt: UserProfilePrompt;
  isEditable?: boolean;
  onEdit?: (prompt: UserProfilePrompt) => void;
  onDelete?: (promptId: number) => void;
}

export const ProfilePromptCard: React.FC<ProfilePromptCardProps> = ({
  prompt,
  isEditable = false,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="profile-prompt-card">
      <div className="prompt-card-header">
        <div className="prompt-card-icon-wrap">
          <Quote size={16} className="prompt-quote-icon" />
          <h4 className="prompt-question">{prompt.promptText}</h4>
        </div>

        {isEditable && (
          <div className="prompt-card-actions">
            {onEdit && (
              <button
                type="button"
                className="prompt-action-btn edit"
                onClick={() => onEdit(prompt)}
                title="Edit Answer"
                aria-label="Edit Answer"
              >
                <Edit2 size={15} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="prompt-action-btn delete"
                onClick={() => onDelete(prompt.promptId)}
                title="Delete Prompt"
                aria-label="Delete Prompt"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      <p className="prompt-answer">{prompt.answer}</p>
    </div>
  );
};

export default ProfilePromptCard;
