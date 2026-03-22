/**
 * Register page — redirects to login since we use Google OAuth only
 */

import { Navigate } from 'react-router-dom';

export function Register() {
  return <Navigate to="/login" replace />;
}
