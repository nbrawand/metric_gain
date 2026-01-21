/**
 * Protected route component that requires authentication
 */

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, accessToken, fetchCurrentUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // If we have a token but no user info yet, fetch it
    if (isAuthenticated && accessToken) {
      fetchCurrentUser().catch(() => {
        // Error handling is done in the store
      });
    }
  }, [isAuthenticated, accessToken, fetchCurrentUser]);

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
