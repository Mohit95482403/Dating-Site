import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  UserEntitlements,
  SubscriptionItem,
  SubscriptionPlanItem,
  BoostStatusResult,
  FeatureKey,
} from '../types/subscription';
import SubscriptionService from '../services/subscription.service';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';
import { useSocket } from '../hooks/useSocket';

interface UpgradeModalState {
  isOpen: boolean;
  feature?: FeatureKey;
  title?: string;
  description?: string;
}

interface SubscriptionContextValue {
  entitlements: UserEntitlements | null;
  subscription: SubscriptionItem | null;
  plans: SubscriptionPlanItem[];
  boostStatus: BoostStatusResult | null;
  isLoading: boolean;
  isPremium: boolean;
  badge: 'PRO' | 'VIP' | null;
  hasFeature: (feature: FeatureKey) => boolean;
  refreshSubscription: () => Promise<void>;
  activateBoost: () => Promise<boolean>;
  upgradeModalState: UpgradeModalState;
  openUpgradeModal: (feature?: FeatureKey, title?: string, description?: string) => void;
  closeUpgradeModal: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const socketContext = useSocket();

  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionItem | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [boostStatus, setBoostStatus] = useState<BoostStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(isAuthenticated));

  const [upgradeModalState, setUpgradeModalState] = useState<UpgradeModalState>({
    isOpen: false,
  });

  const refreshSubscription = useCallback(async () => {
    try {
      // 1. Fetch public plans in non-blocking background task
      SubscriptionService.getActivePlans()
        .then((plansData) => {
          if (Array.isArray(plansData) && plansData.length > 0) {
            setPlans(plansData);
          }
        })
        .catch(() => {
          // Non-blocking fallback
        });

      // 2. If user is not authenticated, clear user-specific subscription state immediately
      if (!isAuthenticated) {
        setEntitlements(null);
        setSubscription(null);
        setBoostStatus(null);
        setIsLoading(false);
        return;
      }

      // 3. Fetch user-specific subscription and boost statuses
      const [subData, boostData] = await Promise.all([
        SubscriptionService.getCurrentSubscription().catch(() => ({
          subscription: null,
          entitlements: null,
        })),
        SubscriptionService.getBoostStatus().catch(() => ({
          isActive: false,
          remainingSeconds: 0,
        })),
      ]);

      setSubscription(subData.subscription);
      setEntitlements(subData.entitlements);
      setBoostStatus(boostData);
    } catch (err) {
      console.error('[SubscriptionContext] Error loading subscription info:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial load on auth state change
  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription, user?.id]);

  // Listen for real-time subscription update socket events
  useEffect(() => {
    if (!socketContext?.socket) return;

    const handleSubUpdated = () => {
      refreshSubscription();
    };

    const handleBoostUpdated = (data: BoostStatusResult) => {
      setBoostStatus(data);
    };

    socketContext.socket.on('subscription:updated', handleSubUpdated);
    socketContext.socket.on('boost:updated', handleBoostUpdated);

    return () => {
      socketContext.socket?.off('subscription:updated', handleSubUpdated);
      socketContext.socket?.off('boost:updated', handleBoostUpdated);
    };
  }, [socketContext?.socket, refreshSubscription]);

  const hasFeature = useCallback(
    (feature: FeatureKey): boolean => {
      if (!entitlements) return false;
      return entitlements.features.includes(feature);
    },
    [entitlements]
  );

  const activateBoost = useCallback(async (): Promise<boolean> => {
    try {
      const result = await SubscriptionService.activateBoost();
      setBoostStatus(result);
      toast.success('🚀 Profile Boost activated! Your profile visibility has been prioritized for the next 30 minutes.');
      await refreshSubscription();
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to activate profile boost.';
      toast.error(msg);
      return false;
    }
  }, [toast, refreshSubscription]);

  const openUpgradeModal = useCallback(
    (feature?: FeatureKey, title?: string, description?: string) => {
      setUpgradeModalState({
        isOpen: true,
        feature,
        title,
        description,
      });
    },
    []
  );

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const isPremium = Boolean(entitlements?.isPremium);
  const badge = entitlements?.badge || null;

  const contextValue = React.useMemo<SubscriptionContextValue>(
    () => ({
      entitlements,
      subscription,
      plans,
      boostStatus,
      isLoading,
      isPremium,
      badge,
      hasFeature,
      refreshSubscription,
      activateBoost,
      upgradeModalState,
      openUpgradeModal,
      closeUpgradeModal,
    }),
    [
      entitlements,
      subscription,
      plans,
      boostStatus,
      isLoading,
      isPremium,
      badge,
      hasFeature,
      refreshSubscription,
      activateBoost,
      upgradeModalState,
      openUpgradeModal,
      closeUpgradeModal,
    ]
  );

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextValue => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export default SubscriptionContext;
