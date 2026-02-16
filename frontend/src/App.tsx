import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';
import { Exercises } from './pages/Exercises';
import Mesocycles from './pages/Mesocycles';
import MesocycleDetail from './pages/MesocycleDetail';
import WorkoutExecution from './pages/WorkoutExecution';
import HowItWorks from './pages/HowItWorks';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuthStore } from './stores/authStore';
import { setAuthStoreRef, onConnectivityChange, getServerReachable } from './api/client';

function ConnectivityBanner() {
  const [reachable, setReachable] = useState(getServerReachable);

  useEffect(() => onConnectivityChange(setReachable), []);

  if (reachable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-center text-sm font-medium py-2 px-4">
      Can't Reach Server
    </div>
  );
}

function App() {
  const logout = useAuthStore((s) => s.logout);

  // Wire the API client to the auth store so token refresh updates in-memory state
  useEffect(() => {
    setAuthStoreRef(
      (token) => useAuthStore.setState({ accessToken: token }),
      logout,
    );
  }, [logout]);
  return (
    <BrowserRouter>
      <ConnectivityBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/mesocycles" element={<Mesocycles />} />
          <Route path="/mesocycles/:id" element={<MesocycleDetail />} />
          <Route path="/workout/:sessionId" element={<WorkoutExecution />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
