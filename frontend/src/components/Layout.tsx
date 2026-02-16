import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleNav = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="text-xl font-bold text-white hover:text-teal-400 transition-colors">
          Metric Gain
        </Link>
        <button
          onClick={() => setMenuOpen(true)}
          className="text-gray-300 hover:text-white p-2"
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMenuOpen(false)}
          />

          {/* Slide-in Panel */}
          <div className="relative w-72 max-w-[80vw] bg-gray-800 h-full shadow-xl flex flex-col animate-slide-in-right">
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => setMenuOpen(false)}
                className="text-gray-400 hover:text-white text-xl p-1"
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-4">
              <button onClick={() => handleNav('/?showCalendar=true')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                Current Mesocycle
              </button>
              <button onClick={() => handleNav('/mesocycles')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                Mesocycles
              </button>
              <button onClick={() => handleNav('/exercises')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                Exercises
              </button>
              <button onClick={() => handleNav('/how-it-works')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                How It Works
              </button>
              <button onClick={() => handleNav('/')} className="w-full text-left text-lg text-gray-200 hover:text-white py-4 border-b border-gray-700 transition-colors">
                Home
              </button>
            </nav>

            {/* Logout */}
            <div className="px-4 pb-8 pt-4 border-t border-gray-700">
              <button onClick={handleLogout} className="w-full text-left text-lg text-red-400 hover:text-red-300 py-4 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Content */}
      {children}
    </div>
  );
}
