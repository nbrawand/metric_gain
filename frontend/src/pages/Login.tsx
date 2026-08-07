/**
 * Login page — Google OAuth only
 */

import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '../stores/authStore';
import { useGoogleAuthAvailable } from '../contexts/GoogleAuthContext';

export function Login() {
  const navigate = useNavigate();
  const { googleLogin, error, clearError } = useAuthStore();
  const googleAvailable = useGoogleAuthAvailable();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Strength Guider</h1>
          <p className="text-gray-400 text-sm italic">The evidence-based strength guide that adapts to you</p>
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
                      .then(() => navigate('/'))
                      .catch(() => {});
                  }
                }}
                onError={() => {
                  clearError();
                }}
                theme="filled_black"
                size="large"
                width="100%"
                text="signin_with"
              />
            </div>
          ) : (
            <p className="text-gray-400 text-center text-sm">
              Sign-in is unavailable right now. Please check your connection and reload.
            </p>
          )}
      </div>
    </div>
  );
}
