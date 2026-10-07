import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Share2, Flag, UserX } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { SettingsService } from '../../services/settings.service';
import ReportProfileModal from './ReportProfileModal';
import './ProfileActionsMenu.css';

interface ProfileActionsMenuProps {
  targetUserId: number;
  targetUserName: string;
  onUserBlocked?: () => void;
}

export const ProfileActionsMenu: React.FC<ProfileActionsMenuProps> = ({
  targetUserId,
  targetUserName,
  onUserBlocked,
}) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleShare = async () => {
    setIsOpen(false);
    const profileUrl = `${window.location.origin}/profile/${targetUserId}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard!');
        return;
      } catch (err) {
        // Fallback
      }
    }

    // Fallback for older browsers
    const input = document.createElement('input');
    input.value = profileUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    toast.success('Profile link copied');
  };

  const handleBlock = async () => {
    setIsOpen(false);
    const confirmed = window.confirm(
      `Are you sure you want to block ${targetUserName}? You won't see their profile or messages, and they won't be able to reach you.`
    );
    if (!confirmed) return;

    try {
      await SettingsService.blockUser(targetUserId, 'Blocked from profile page');
      toast.success(`${targetUserName} has been blocked.`);
      if (onUserBlocked) {
        onUserBlocked();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to block user.');
    }
  };

  return (
    <div className="profile-actions-menu-container" ref={menuRef}>
      <button
        type="button"
        className="profile-more-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="More profile options"
        aria-expanded={isOpen}
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="profile-dropdown-menu" role="menu">
          <button
            type="button"
            className="profile-dropdown-item"
            onClick={handleShare}
            role="menuitem"
          >
            <Share2 size={16} />
            <span>Copy Profile Link</span>
          </button>

          <button
            type="button"
            className="profile-dropdown-item"
            onClick={() => {
              setIsOpen(false);
              setIsReportModalOpen(true);
            }}
            role="menuitem"
          >
            <Flag size={16} />
            <span>Report Profile</span>
          </button>

          <div className="profile-dropdown-divider" />

          <button
            type="button"
            className="profile-dropdown-item danger"
            onClick={handleBlock}
            role="menuitem"
          >
            <UserX size={16} />
            <span>Block {targetUserName}</span>
          </button>
        </div>
      )}

      {isReportModalOpen && (
        <ReportProfileModal
          isOpen={isReportModalOpen}
          targetUserId={targetUserId}
          targetUserName={targetUserName}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProfileActionsMenu;
