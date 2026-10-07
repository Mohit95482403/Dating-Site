import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import AdminRoute from './AdminRoute';
import AdminLayout from '../layouts/AdminLayout';
import RouteErrorBoundary from '../components/common/RouteErrorBoundary';


// Lazy Loaded Pages
const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const OnboardingPage = lazy(() => import('../pages/onboarding/OnboardingPage'));
const HowItWorksPage = lazy(() => import('../pages/HowItWorksPage'));
const WatchHowItWorksPage = lazy(() => import('../pages/WatchHowItWorksPage'));
const SafetyPage = lazy(() => import('../pages/SafetyPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// Protected User Pages
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'));
const DiscoveryPage = lazy(() => import('../pages/discovery/DiscoveryPage'));
const MatchesPage = lazy(() => import('../pages/matches/MatchesPage'));
const MatchDetailsPage = lazy(() => import('../pages/matches/MatchDetailsPage'));
const MessagesPage = lazy(() => import('../pages/chat/MessagesPage'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const PremiumPage = lazy(() => import('../pages/premium/PremiumPage'));
const LikesReceivedPage = lazy(() => import('../pages/likes/LikesReceivedPage'));
const FeedPage = lazy(() => import('../pages/feed/FeedPage'));
const SavedPostsPage = lazy(() => import('../pages/feed/SavedPostsPage'));
const ExplorePage = lazy(() => import('../pages/explore/ExplorePage'));
const HashtagPage = lazy(() => import('../pages/explore/HashtagPage'));
const CommunitiesExplorePage = lazy(() =>
  import('../pages/communities/CommunitiesExplorePage').then((m) => ({ default: m.CommunitiesExplorePage }))
);
const CommunityDetailPage = lazy(() =>
  import('../pages/communities/CommunityDetailPage').then((m) => ({ default: m.CommunityDetailPage }))
);

// Admin Panel Pages
const AdminDashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/UsersPage'));
const AdminUserDetailsPage = lazy(() => import('../pages/admin/UserDetailsPage'));
const AdminReportsPage = lazy(() => import('../pages/admin/ReportsPage'));
const AdminVerificationPage = lazy(() => import('../pages/admin/VerificationPage'));
const AdminNotificationsPage = lazy(() => import('../pages/admin/NotificationsPage'));
const AdminAuditLogsPage = lazy(() => import('../pages/admin/AuditLogsPage'));
const AdminAnalyticsPage = lazy(() => import('../pages/admin/AnalyticsPage'));
const AdminSubscriptionsPage = lazy(() => import('../pages/admin/SubscriptionsPage'));
const AdminContentPage = lazy(() => import('../pages/admin/ContentPage'));
const AdminTrustSafetyPage = lazy(() => import('../pages/admin/TrustSafetyPage'));
const AdminRecommendationsPage = lazy(() => import('../pages/admin/RecommendationsPage'));
const AdminSystemHealthPage = lazy(() => import('../pages/admin/SystemHealthPage'));
const AdminSupportPage = lazy(() => import('../pages/admin/SupportPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/SettingsPage'));
const AdminFeatureFlagsPage = lazy(() => import('../pages/admin/FeatureFlagsPage'));


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
