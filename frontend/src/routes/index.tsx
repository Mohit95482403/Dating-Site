import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import DashboardPage from '../pages/DashboardPage';
import OnboardingPage from '../pages/onboarding/OnboardingPage';
import HowItWorksPage from '../pages/HowItWorksPage';
import WatchHowItWorksPage from '../pages/WatchHowItWorksPage';
import SafetyPage from '../pages/SafetyPage';
import AboutPage from '../pages/AboutPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import ProfilePage from '../pages/profile/ProfilePage';
import DiscoveryPage from '../pages/discovery/DiscoveryPage';
import MatchesPage from '../pages/matches/MatchesPage';
import MatchDetailsPage from '../pages/matches/MatchDetailsPage';
import MessagesPage from '../pages/chat/MessagesPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import SettingsPage from '../pages/settings/SettingsPage';
import PremiumPage from '../pages/premium/PremiumPage';
import LikesReceivedPage from '../pages/likes/LikesReceivedPage';
import FeedPage from '../pages/feed/FeedPage';
import SavedPostsPage from '../pages/feed/SavedPostsPage';
import ExplorePage from '../pages/explore/ExplorePage';
import HashtagPage from '../pages/explore/HashtagPage';
import { CommunitiesExplorePage } from '../pages/communities/CommunitiesExplorePage';
import { CommunityDetailPage } from '../pages/communities/CommunityDetailPage';

// Day 17 & 21 Admin Panel imports
import AdminRoute from './AdminRoute';
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboardPage from '../pages/admin/DashboardPage';
import AdminUsersPage from '../pages/admin/UsersPage';
import AdminUserDetailsPage from '../pages/admin/UserDetailsPage';
import AdminReportsPage from '../pages/admin/ReportsPage';
import AdminVerificationPage from '../pages/admin/VerificationPage';
import AdminNotificationsPage from '../pages/admin/NotificationsPage';
import AdminAuditLogsPage from '../pages/admin/AuditLogsPage';
import AdminAnalyticsPage from '../pages/admin/AnalyticsPage';
import AdminSubscriptionsPage from '../pages/admin/SubscriptionsPage';
import AdminContentPage from '../pages/admin/ContentPage';
import AdminTrustSafetyPage from '../pages/admin/TrustSafetyPage';
import AdminRecommendationsPage from '../pages/admin/RecommendationsPage';
import AdminSystemHealthPage from '../pages/admin/SystemHealthPage';
import AdminSupportPage from '../pages/admin/SupportPage';
import AdminSettingsPage from '../pages/admin/SettingsPage';
import AdminFeatureFlagsPage from '../pages/admin/FeatureFlagsPage';
import RouteErrorBoundary from '../components/common/RouteErrorBoundary';

export const router = createBrowserRouter([
  // 1. Regular Client Application Routes
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      // Public-only Auth Routes (redirects authenticated users to /dashboard or /onboarding)
      {
        path: 'login',
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        ),
      },
      // Informational Public Routes
      {
        path: 'how-it-works',
        element: <HowItWorksPage />,
      },
      {
        path: 'watch-how-it-works',
        element: <WatchHowItWorksPage />,
      },
      {
        path: 'video-tour',
        element: <WatchHowItWorksPage />,
      },
      {
        path: 'safety',
        element: <SafetyPage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },

      // Protected Application Routes (requires active authenticated session)
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'onboarding',
            element: <OnboardingPage />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'discover',
            element: <DiscoveryPage />,
          },
          {
            path: 'matches',
            element: <MatchesPage />,
          },
          {
            path: 'matches/:matchId',
            element: <MatchDetailsPage />,
          },
          {
            path: 'messages',
            element: <MessagesPage />,
          },
          {
            path: 'messages/:conversationId',
            element: <MessagesPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'profile/edit',
            element: <ProfilePage initialEditMode={true} />,
          },
          {
            path: 'profile/:userId',
            element: <ProfilePage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'settings/trust',
            element: <Navigate to="/settings?tab=trust" replace />,
          },
          {
            path: 'settings/privacy',
            element: <Navigate to="/settings?tab=privacy" replace />,
          },
          {
            path: 'settings/security',
            element: <Navigate to="/settings?tab=security" replace />,
          },
          {
            path: 'settings/blocked',
            element: <Navigate to="/settings?tab=blocked" replace />,
          },
          {
            path: 'settings/reports',
            element: <Navigate to="/settings?tab=reports" replace />,
          },
          {
            path: 'settings/personalization',
            element: <Navigate to="/settings?tab=personalization" replace />,
          },
          {
            path: 'premium',
            element: <PremiumPage />,
          },
          {
            path: 'likes/received',
            element: <LikesReceivedPage />,
          },
          {
            path: 'feed',
            element: <FeedPage />,
          },
          {
            path: 'saved',
            element: <SavedPostsPage />,
          },
          {
            path: 'explore',
            element: <ExplorePage />,
          },
          {
            path: 'explore/communities',
            element: <CommunitiesExplorePage />,
          },
          {
            path: 'communities/:slug',
            element: <CommunityDetailPage />,
          },
          {
            path: 'hashtag/:tag',
            element: <HashtagPage />,
          },
          // Phase 2 Route Audit: Aliases & Convenience Redirections
          {
            path: 'verify',
            element: <Navigate to="/settings?tab=trust" replace />,
          },
          {
            path: 'likes',
            element: <Navigate to="/likes/received" replace />,
          },
          {
            path: 'search',
            element: <Navigate to="/explore" replace />,
          },
          {
            path: 'communities',
            element: <Navigate to="/explore/communities" replace />,
          },
          {
            path: 'events',
            element: <Navigate to="/explore/communities" replace />,
          },
          {
            path: 'recommendations',
            element: <Navigate to="/discover" replace />,
          },
          {
            path: 'ai',
            element: <Navigate to="/profile/edit" replace />,
          },
          {
            path: 'calls',
            element: <Navigate to="/messages" replace />,
          },
          {
            path: 'stories',
            element: <Navigate to="/feed" replace />,
          },
        ],
      },

      // Fallback 404 Routes
      {
        path: '404',
        element: <NotFoundPage />,
      },
      {
        path: '*',
        element: <Navigate to="/404" replace />,
      },
    ],
  },

  // 2. Day 17: Dedicated Admin Control Room Routes (Strictly Protected by AdminRoute)
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      {
        path: 'users',
        element: <AdminUsersPage />,
      },
      {
        path: 'users/:userId',
        element: <AdminUserDetailsPage />,
      },
      {
        path: 'reports',
        element: <AdminReportsPage />,
      },
      {
        path: 'verification',
        element: <AdminVerificationPage />,
      },
      {
        path: 'notifications',
        element: <AdminNotificationsPage />,
      },
      {
        path: 'audit-logs',
        element: <AdminAuditLogsPage />,
      },
      {
        path: 'analytics',
        element: <AdminAnalyticsPage />,
      },
      {
        path: 'subscriptions',
        element: <AdminSubscriptionsPage />,
      },
      {
        path: 'content',
        element: <AdminContentPage />,
      },
      {
        path: 'trust-safety',
        element: <AdminTrustSafetyPage />,
      },
      {
        path: 'recommendations',
        element: <AdminRecommendationsPage />,
      },
      {
        path: 'system-health',
        element: <AdminSystemHealthPage />,
      },
      {
        path: 'support',
        element: <AdminSupportPage />,
      },
      {
        path: 'settings',
        element: <AdminSettingsPage />,
      },
      {
        path: 'features',
        element: <AdminFeatureFlagsPage />,
      },
    ],
  },
]);

export default router;
