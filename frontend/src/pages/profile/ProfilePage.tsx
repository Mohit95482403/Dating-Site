import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Profile, PublicUserProfile, UserProfilePrompt, ProfilePhoto } from '../../types/profile';
import { profileService } from '../../services/profile.service';
import { discoveryService } from '../../services/discovery.service';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button';
import ProfileHeader from './ProfileHeader';
import ProfilePhotoGallery from './ProfilePhotoGallery';
import ProfileAbout from './ProfileAbout';
import ProfileInterests from './ProfileInterests';
import ProfileDetails from './ProfileDetails';
import ProfilePreferences from './ProfilePreferences';
import ProfileCompletion from './ProfileCompletion';
import EditProfileModal from './EditProfileModal';
import ProfileSkeleton from './ProfileSkeleton';
import PhotoManager from '../../components/profile/PhotoManager';
import PhotoViewer from '../../components/profile/PhotoViewer';
import VerificationSection from '../../components/profile/VerificationSection';
import ProfilePromptCard from '../../components/profile/ProfilePromptCard';
import ProfilePromptEditor from '../../components/profile/ProfilePromptEditor';
import ProfileActionsMenu from '../../components/profile/ProfileActionsMenu';
import { ProfileAIInsightsModal } from '../../components/ai/ProfileAIInsightsModal';
import {
  AlertCircle,
  RefreshCw,
  Heart,
  Sparkles,
  MessageCircle,
  Plus,
  HelpCircle,
} from 'lucide-react';
import './ProfilePage.css';

interface ProfilePageProps {
  initialEditMode?: boolean;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ initialEditMode = false }) => {
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const isOwnProfile = !routeUserId || Number(routeUserId) === user?.id;
  const targetUserId = routeUserId ? parseInt(routeUserId, 10) : user?.id;

  const [ownProfile, setOwnProfile] = useState<Profile | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicUserProfile | null>(null);
  const [prompts, setPrompts] = useState<UserProfilePrompt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal Controls
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(initialEditMode);
  const [editModalTab, setEditModalTab] = useState<'basic' | 'about' | 'interests' | 'preferences'>('basic');

  // Prompts Editor Controls
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState<boolean>(false);

  // Day 20 AI Insights State
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState<boolean>(false);

  // Fullscreen Photo Viewer State
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState<boolean>(false);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number>(0);

  // Other User Actions State
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [hasLiked, setHasLiked] = useState<boolean>(false);

  const fetchProfileData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOwnProfile) {
        const [profileData, userPrompts] = await Promise.all([
          profileService.getProfile(),
          profileService.getUserPrompts(),
        ]);
        setOwnProfile(profileData);
        setPrompts(userPrompts);
      } else if (targetUserId) {
        const publicData = await profileService.getPublicProfile(targetUserId);
        setPublicProfile(publicData);
        setPrompts(publicData.prompts || []);
      }
    } catch (err: any) {
      const msg =
        err.response?.status === 404
          ? 'Profile not found. This profile may have been removed, blocked, or is currently private.'
          : err.response?.data?.message || err.message || 'Unable to load profile.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isOwnProfile, targetUserId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Open Fullscreen Photo Viewer
  const handleOpenPhotoViewer = (index = 0) => {
    setViewerPhotoIndex(index);
    setIsPhotoViewerOpen(true);
  };

  const openEditModal = (tab: 'basic' | 'about' | 'interests' | 'preferences' = 'basic') => {
    setEditModalTab(tab);
    setIsEditModalOpen(true);
  };

  const handleProfileUpdated = (updated: Profile) => {
    setOwnProfile(updated);
  };

  const handlePhotosUpdated = (
    updatedPhotos: ProfilePhoto[],
    completion?: { completionPercentage: number; isComplete: boolean }
  ) => {
    setOwnProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        photos: updatedPhotos,
        ...(completion
          ? {
              completionPercentage: completion.completionPercentage,
              isComplete: completion.isComplete,
            }
          : {}),
      };
    });
    refreshUser().catch(() => {});
  };

  const handleDeletePrompt = async (promptId: number) => {
    try {
      const updated = await profileService.deleteUserPrompt(promptId);
      setPrompts(updated);
      toast.success('Prompt removed from your profile.');
      // Refresh completion
      const comp = await profileService.getCompletion();
      setOwnProfile((prev) => (prev ? { ...prev, completion: comp, completionPercentage: comp.percentage, isComplete: comp.isComplete } : null));
    } catch (err: any) {
      toast.error('Failed to remove prompt.');
    }
  };

  // Interactions for Other User's Profile
  const handleLike = async (isSuper = false) => {
    if (!targetUserId || isLiking) return;
    setIsLiking(true);

    try {
      if (isSuper) {
        await discoveryService.superLikeProfile(targetUserId);
        toast.success(`You super liked ${publicProfile?.firstName}! ⭐`);
      } else {
        await discoveryService.likeProfile(targetUserId);
        toast.success(`You liked ${publicProfile?.firstName}! ❤️`);
      }
      setHasLiked(true);
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleMessage = () => {
    if (publicProfile?.conversationId) {
      navigate(`/messages/${publicProfile.conversationId}`);
    } else {
      navigate('/messages');
    }
  };

  // Extract photos for viewer
  const currentPhotos: ProfilePhoto[] = isOwnProfile
    ? ownProfile?.photos || []
    : publicProfile?.photos || [];

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container-inner">
        {isLoading ? (
          <ProfileSkeleton />
        ) : error ? (
          <div className="profile-error-container">
            <div className="profile-error-box">
              <div className="error-icon-circle">
                <AlertCircle size={32} />
              </div>
              <h2 className="error-title">Profile Unavailable</h2>
              <p className="error-desc">{error}</p>
              <div className="error-actions-row">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Go Back
                </Button>
                <Button variant="primary" onClick={fetchProfileData}>
                  <RefreshCw size={16} />
                  <span>Try Again</span>
                </Button>
              </div>
            </div>
          </div>
        ) : isOwnProfile && ownProfile ? (
          /* ======================================================== */
          /* OWN PROFILE VIEW                                         */
          /* ======================================================== */
          <div className="profile-layout-grid">
            {/* Left Column: Photos Gallery & Profile Strength Card */}
            <div className="profile-left-col">
              <ProfilePhotoGallery
                photos={ownProfile.photos}
                firstName={ownProfile.firstName}
                onAddPhotoClick={() => openEditModal('about')}
                onPhotoClick={handleOpenPhotoViewer}
              />

              <ProfileCompletion
                completionPercentage={ownProfile.completionPercentage}
                isComplete={ownProfile.isComplete}
                completion={ownProfile.completion}
                onCompleteClick={() => openEditModal('basic')}
                onActionClick={(actionKey) => {
                  if (actionKey.includes('bio')) openEditModal('about');
                  else if (actionKey.includes('interests')) openEditModal('interests');
                  else if (actionKey.includes('prompt')) setIsPromptEditorOpen(true);
                  else if (actionKey.includes('preferences')) openEditModal('preferences');
                  else openEditModal('basic');
                }}
              />

              {/* Day 20 AI Profile Insights Action */}
              <div style={{ margin: '0.75rem 0' }}>
                <button
                  type="button"
                  onClick={() => setIsAIInsightsOpen(true)}
                  className="chat-ai-trigger-btn"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.65rem 1rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.85rem',
                  }}
                  title="View AI analysis of profile strengths and suggestions"
                >
                  <Sparkles size={16} />
                  <span>AI Profile Insights</span>
                </button>
              </div>

              {/* Verification Section */}
              <VerificationSection
                status={ownProfile.verificationStatus}
                isVerified={ownProfile.isVerified}
                isOwnProfile={true}
                onStatusUpdated={(statusRes) => {
                  setOwnProfile((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      isVerified: statusRes.isVerified,
                      verificationStatus: statusRes.status,
                    };
                  });
                }}
              />
            </div>

            {/* Right Column: Profile Header, PhotoManager, Prompts, Bio, Interests, Lifestyle Details, Dating Preferences */}
            <div className="profile-right-col">
              <ProfileHeader
                profile={ownProfile}
                isVerified={ownProfile.isVerified}
                isOwnProfile={true}
                onEditClick={() => openEditModal('basic')}
              />

              <PhotoManager
                photos={ownProfile.photos}
                onPhotosUpdated={handlePhotosUpdated}
              />

              {/* Profile Prompts Section */}
              <div className="profile-section-card profile-prompts-section">
                <div className="prompts-section-header">
                  <div className="section-icon-box">
                    <HelpCircle size={18} className="section-icon text-rose-400" />
                  </div>
                  <div>
                    <h2 className="section-title">Profile Prompts</h2>
                    <p className="prompts-section-subtitle">
                      Showcase your personality, wit, and what makes you unique
                    </p>
                  </div>
                  {!isPromptEditorOpen && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPromptEditorOpen(true)}
                      className="add-prompt-btn"
                    >
                      <Plus size={15} />
                      <span>Add Prompt</span>
                    </Button>
                  )}
                </div>

                {isPromptEditorOpen && (
                  <ProfilePromptEditor
                    userPrompts={prompts}
                    onPromptsUpdated={(updatedList) => {
                      setPrompts(updatedList);
                      setIsPromptEditorOpen(false);
                    }}
                    onClose={() => setIsPromptEditorOpen(false)}
                  />
                )}

                <div className="prompts-cards-grid">
                  {prompts.length === 0 && !isPromptEditorOpen ? (
                    <div className="prompts-empty-box">
                      <p>No profile prompts added yet.</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsPromptEditorOpen(true)}
                        className="mt-2"
                      >
                        <Plus size={14} />
                        <span>Choose a prompt</span>
                      </Button>
                    </div>
                  ) : (
                    prompts.map((p) => (
                      <ProfilePromptCard
                        key={p.promptId}
                        prompt={p}
                        isEditable={true}
                        onDelete={handleDeletePrompt}
                      />
                    ))
                  )}
                </div>
              </div>

              <ProfileAbout
                bio={ownProfile.bio}
                onAddBioClick={() => openEditModal('about')}
              />

              <ProfileInterests
                interests={ownProfile.interests}
                onAddInterestsClick={() => openEditModal('interests')}
              />

              <ProfileDetails
                occupation={ownProfile.occupation}
                education={ownProfile.education}
                location={ownProfile.location}
                gender={ownProfile.gender}
                onEditClick={() => openEditModal('about')}
              />

              <ProfilePreferences
                preferences={ownProfile.preferences}
                onEditClick={() => openEditModal('preferences')}
              />
            </div>
          </div>
        ) : publicProfile ? (
          /* ======================================================== */
          /* OTHER USER PUBLIC PROFILE VIEW                           */
          /* ======================================================== */
          <div className="profile-layout-grid other-user-view">
            {/* Left Column: Photos Gallery */}
            <div className="profile-left-col">
              <ProfilePhotoGallery
                photos={publicProfile.photos}
                firstName={publicProfile.firstName}
                onPhotoClick={handleOpenPhotoViewer}
              />

              {/* Verification Section if verified */}
              {publicProfile.isVerified && (
                <VerificationSection
                  isVerified={true}
                  status="verified"
                  isOwnProfile={false}
                />
              )}
            </div>

            {/* Right Column: Public Profile Info, Prompts, Bio, Interests */}
            <div className="profile-right-col">
              <ProfileHeader
                profile={publicProfile}
                isVerified={publicProfile.isVerified}
                isOwnProfile={false}
                isOnline={publicProfile.isOnline}
                lastSeenAt={publicProfile.lastSeenAt}
                actions={
                  <div className="other-profile-actions">
                    <Button
                      variant={hasLiked ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleLike(false)}
                      disabled={isLiking || hasLiked}
                      className="profile-action-btn like"
                    >
                      <Heart size={16} fill={hasLiked ? '#f43f5e' : 'none'} />
                      <span>{hasLiked ? 'Liked' : 'Like'}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLike(true)}
                      disabled={isLiking}
                      className="profile-action-btn super-like"
                      title="Super Like"
                    >
                      <Sparkles size={16} />
                      <span>Super Like</span>
                    </Button>

                    {publicProfile.canMessage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleMessage}
                        className="profile-action-btn message"
                      >
                        <MessageCircle size={16} />
                        <span>Message</span>
                      </Button>
                    )}

                    <ProfileActionsMenu
                      targetUserId={publicProfile.userId}
                      targetUserName={publicProfile.firstName}
                      onUserBlocked={() => navigate('/discover')}
                    />
                  </div>
                }
              />

              {/* Bio */}
              <ProfileAbout bio={publicProfile.bio} />

              {/* Prompts Section */}
              {prompts.length > 0 && (
                <div className="profile-section-card profile-prompts-section">
                  <div className="prompts-section-header">
                    <div className="section-icon-box">
                      <HelpCircle size={18} className="section-icon text-rose-400" />
                    </div>
                    <div>
                      <h2 className="section-title">Prompts</h2>
                    </div>
                  </div>
                  <div className="prompts-cards-grid">
                    {prompts.map((p) => (
                      <ProfilePromptCard key={p.promptId} prompt={p} isEditable={false} />
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              <ProfileInterests interests={publicProfile.interests} />

              {/* Details */}
              <ProfileDetails
                occupation={publicProfile.occupation}
                education={publicProfile.education}
                location={publicProfile.location}
                gender={publicProfile.gender as any}
              />
            </div>
          </div>
        ) : null}

        {/* Edit Profile Modal */}
        {ownProfile && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            profile={ownProfile}
            initialTab={editModalTab}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={handleProfileUpdated}
          />
        )}

        {/* Day 20 AI Profile Insights Modal */}
        <ProfileAIInsightsModal
          isOpen={isAIInsightsOpen}
          onClose={() => setIsAIInsightsOpen(false)}
          onOpenEditSection={(sec) => openEditModal(sec as any)}
        />

        {/* Fullscreen Photo Viewer Modal */}
        <PhotoViewer
          isOpen={isPhotoViewerOpen}
          photos={currentPhotos}
          currentIndex={viewerPhotoIndex}
          onIndexChange={(idx) => setViewerPhotoIndex(idx)}
          onClose={() => setIsPhotoViewerOpen(false)}
        />
      </div>
    </div>
  );
};

export default ProfilePage;
