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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exercises"
          element={
            <ProtectedRoute>
              <Exercises />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mesocycles"
          element={
            <ProtectedRoute>
              <Mesocycles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mesocycles/:id"
          element={
            <ProtectedRoute>
              <MesocycleDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workout/:sessionId"
          element={
            <ProtectedRoute>
              <WorkoutExecution />
            </ProtectedRoute>
          }
        />
        <Route
          path="/how-it-works"
          element={
            <ProtectedRoute>
              <HowItWorks />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
