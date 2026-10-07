import React from 'react';
import type { FeatureKey } from '../../types/subscription';
import { useSubscription } from '../../hooks/useSubscription';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback = null }) => {
  const { hasFeature, isLoading } = useSubscription();

  if (isLoading) {
    return null;
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default FeatureGate;
