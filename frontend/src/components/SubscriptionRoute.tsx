import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface SubscriptionRouteProps {
  children: React.ReactNode;
}

function isSubscriptionActive(user: { subscription_status: string; trial_ends_at: string | null } | null): boolean {
  if (!user) return false;
  if (user.subscription_status === 'active') return true;
  if (user.subscription_status === 'trialing') {
    if (user.trial_ends_at && new Date(user.trial_ends_at) > new Date()) return true;
  }
  return false;
}

export default function SubscriptionRoute({ children }: SubscriptionRouteProps) {
  const { isAuthenticated, accessToken, fetchCurrentUser, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchCurrentUser().catch(() => {});
    }
  }, [isAuthenticated, accessToken, fetchCurrentUser]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && !isSubscriptionActive(user)) {
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}
