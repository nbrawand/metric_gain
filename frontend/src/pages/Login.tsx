/**
 * Login page — Google OAuth only
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '../stores/authStore';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

export function Login() {
  const navigate = useNavigate();
  const { googleLogin, error } = useAuthStore();
  // ProtectedRoute records where the user was headed; sending everyone to the
  // dashboard meant a deep link (a workout URL reopened from the PWA) was lost
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';
  const { available: googleAvailable, loading: googleLoading } = useGoogleAuth();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Strength Guider</h1>
          <p className="text-gray-400 text-sm italic">Evidence-based training blocks, planned by you</p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {googleAvailable ? (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(credentialResponse: CredentialResponse) => {
                  if (credentialResponse.credential) {
                    googleLogin(credentialResponse.credential)
                      .then(() => navigate(redirectTo, { replace: true }))
                      .catch(() => {});
                  }
                }}
                onError={() => {
                  // The only failure callback the Google flow gives us: it used
                  // to clear the error area, leaving a dead button and no message
                  useAuthStore.setState({ error: 'Google sign-in failed. Please try again.' });
                }}
                theme="filled_black"
                size="large"
                width="100%"
                text="signin_with"
              />
            </div>
          ) : googleLoading ? (
            /* Still fetching the config. Saying "unavailable" here would turn a
               slow backend into a visitor who thinks sign-in is broken. */
            <p className="text-gray-400 text-center text-sm">Loading sign-in…</p>
          ) : (
            <p className="text-gray-400 text-center text-sm">
              Sign-in is unavailable right now. Please check your connection and reload.
            </p>
          )}
      </div>
    </div>
  );
}
