import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { CommunityCategory, CommunityVisibility, CommunityJoinPolicy } from '../../types/community';
import { CommunityService } from '../../services/community.service';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CommunityCategory[];
}

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  isOpen,
  onClose,
  categories,
}) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [visibility, setVisibility] = useState<CommunityVisibility>('public');
  const [joinPolicy, setJoinPolicy] = useState<CommunityJoinPolicy>('open');
  const [rulesText, setRulesText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Community name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const created = await CommunityService.createCommunity({
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId: Number(categoryId),
        visibility,
        joinPolicy,
        rulesText: rulesText.trim() || undefined,
      });

      onClose();
      navigate(`/communities/${created.slug}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create community.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="community-modal-backdrop" onClick={onClose}>
      <div className="community-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="community-modal-title">
          <span>Create a New Community</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#ef4444',
              marginBottom: '16px',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group-custom">
            <label>Community Name *</label>
            <input
              type="text"
              placeholder="e.g. Nashik Weekend Photographers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="form-group-custom">
            <label>Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group-custom">
            <label>Description</label>
            <textarea
              rows={3}
              placeholder="Describe what your community is all about, what members do together, and who should join..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>

          <div className="community-modal-grid-2">
            <div className="form-group-custom">
              <label>Privacy</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as CommunityVisibility)}
              >
                <option value="public">Public (Visible to everyone)</option>
                <option value="private">Private (Members only)</option>
              </select>
            </div>

            <div className="form-group-custom">
              <label>Join Policy</label>
              <select
                value={joinPolicy}
                onChange={(e) => setJoinPolicy(e.target.value as CommunityJoinPolicy)}
              >
                <option value="open">Open (Instant join)</option>
                <option value="request_to_join">Request to Join</option>
                <option value="invite_only">Invite Only</option>
              </select>
            </div>
          </div>

          <div className="form-group-custom">
            <label>Community Guidelines & Rules (Optional)</label>
            <textarea
              rows={3}
              placeholder="1. Respect everyone.&#10;2. No spam or commercial posts."
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
            />
          </div>

          <div className="community-modal-actions">
            <button type="button" className="btn-outline-glass" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-gradient" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Launch Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
