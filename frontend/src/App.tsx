import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import Landing from './pages/Landing';
import { Exercises } from './pages/Exercises';
import Mesocycles from './pages/Mesocycles';
import MesocycleDetail from './pages/MesocycleDetail';
import WorkoutExecution from './pages/WorkoutExecution';
import HowItWorks from './pages/HowItWorks';
import Subscribe from './pages/Subscribe';
import Admin from './pages/Admin';
import Terms from './pages/Terms';
import { ProtectedRoute } from './components/ProtectedRoute';
import SubscriptionRoute from './components/SubscriptionRoute';
import Layout from './components/Layout';
import { useAuthStore } from './stores/authStore';
import { setAuthStoreRef, onConnectivityChange, getServerReachable } from './api/client';
import { getGoogleClientId } from './api/auth';
import { GoogleAuthContext } from './contexts/GoogleAuthContext';

function ConnectivityBanner() {
  const [reachable, setReachable] = useState(getServerReachable);

  useEffect(() => onConnectivityChange(setReachable), []);

  if (reachable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-center text-sm font-medium py-2 px-4">
      Can't reach the server
    </div>
  );
}

function UpdateBanner() {
  const [updateFn, setUpdateFn] = useState<(() => Promise<void>) | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Wrap in a thunk so React doesn't invoke the function as a state initializer
      setUpdateFn(() => detail.updateSW);
    };
    window.addEventListener('sw-update-available', handler);
    return () => window.removeEventListener('sw-update-available', handler);
  }, []);

  if (!updateFn) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-[100] flex justify-center px-4">
      <div className="bg-gray-800 border border-teal-500 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 max-w-sm w-full">
        <span className="text-white text-sm flex-1">New version available</span>
        <button
          onClick={async () => {
            setUpdating(true);
            await updateFn();
          }}
          disabled={updating}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors disabled:opacity-50"
        >
          {updating ? 'Updating...' : 'Update'}
        </button>
        <button
          onClick={() => setUpdateFn(null)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function RootPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <SubscriptionRoute><Home /></SubscriptionRoute> : <Landing />;
}

function BillingSuccess() {
  const navigate = useNavigate();
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const [confirming, setConfirming] = useState(true);

  // Stripe sends the customer back before its webhook has necessarily reached
  // us, so poll until the account actually flips to active. Navigating away on
  // the stale status sent someone who had just paid back to the paywall — where
  // subscribing again would have charged them a second time.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      // A failed poll must not end the loop: fetchCurrentUser rejects on any
      // error, and giving up here left the page stuck on "Confirming..." with
      // its only button disabled.
      try {
        await fetchCurrentUser();
      } catch {
        /* keep polling */
      }
      if (cancelled) return;

      attempts += 1;
      const status = useAuthStore.getState().user?.subscription_status;
      if (status === 'active' || attempts >= 10) {
        setConfirming(false);
        return;
      }
      timer = setTimeout(poll, 1500);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fetchCurrentUser]);

  return (
    <main className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-4">
          {confirming ? 'Confirming your payment...' : 'Subscription active'}
        </h1>
        <p className="text-gray-300 mb-6">
          {confirming
            ? 'This takes a few seconds. Please keep this page open.'
            : 'Your payment was successful. You now have full access.'}
        </p>
        <button
          onClick={() => navigate('/')}
          disabled={confirming}
          className="inline-block bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Go to Home
        </button>
      </div>
    </main>
  );
}

function BillingCancel() {
  return (
    <main className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Checkout canceled</h1>
        <p className="text-gray-300 mb-6">No worries — you can subscribe whenever you're ready.</p>
        <a href="/subscribe" className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
          Back to Subscribe
        </a>
      </div>
    </main>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <ConnectivityBanner />
      <UpdateBanner />
      <Routes>
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/terms" element={<Terms />} />
          {/* Authenticated but not subscription-gated */}
          <Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/billing/success" element={<ProtectedRoute><BillingSuccess /></ProtectedRoute>} />
          <Route path="/billing/cancel" element={<ProtectedRoute><BillingCancel /></ProtectedRoute>} />
          {/* Protected + subscription-gated routes */}
          <Route path="/" element={<RootPage />} />
          <Route path="/exercises" element={<SubscriptionRoute><Exercises /></SubscriptionRoute>} />
          <Route path="/mesocycles" element={<SubscriptionRoute><Mesocycles /></SubscriptionRoute>} />
          <Route path="/mesocycles/:id" element={<SubscriptionRoute><MesocycleDetail /></SubscriptionRoute>} />
          <Route path="/workout/:sessionId" element={<SubscriptionRoute><WorkoutExecution /></SubscriptionRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  const logout = useAuthStore((s) => s.logout);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Wire the API client to the auth store so token refresh updates in-memory state
  useEffect(() => {
    setAuthStoreRef(
      (token) => useAuthStore.setState({ accessToken: token }),
      logout,
    );
  }, [logout]);

  // Fetch Google Client ID from backend. Retried, because giving up on one
  // failed request used to leave the sign-in button stuck on "Loading" forever.
  useEffect(() => {
    let cancelled = false;

    const load = async (attempt = 0) => {
      try {
        const res = await getGoogleClientId();
        if (cancelled) return;
        if (res.client_id) setGoogleClientId(res.client_id);
        setConfigLoaded(true);
      } catch (err) {
        if (cancelled) return;
        if (attempt < 3) {
          setTimeout(() => load(attempt + 1), 1000 * 2 ** attempt);
          return;
        }
        console.error('Could not load the Google sign-in configuration', err);
        setConfigLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Wait for the config before mounting the routes: swapping the provider in
  // afterwards remounts the whole tree and refires every request on the page.
  if (!configLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId ?? ''}>
      <GoogleAuthContext.Provider value={!!googleClientId}>
        <AppRoutes />
      </GoogleAuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export default App;
