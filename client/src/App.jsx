// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BookRoomPage from './pages/BookRoomPage'
import MyRequestsPage from './pages/MyRequestsPage'
import AdminPanelPage from './pages/AdminPanelPage'
import RoomsPage from './pages/RoomsPage'

// Protects any route that requires login
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-3)' }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Protects admin-only routes
function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-3)' }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/my-requests" replace />
  return children
}

// Minimal top-bar for public pages
function PublicLayout({ children }) {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="public-header-pad" style={{
        height: 56, background: 'var(--bg-2)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-icon" style={{ width: 30, height: 30 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: 'white' }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
            </svg>
          </div>
          <span className="logo-text" style={{ fontSize: '1.05rem' }}>Meeting<span>Desk</span></span>
        </div>

        <nav className="public-header-nav" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <NavLink to="/book" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            style={{ padding: '6px 12px', borderRadius: 7 }}>
            <span className="public-nav-label">Book a Room</span>
          </NavLink>
          <NavLink to="/rooms" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            style={{ padding: '6px 12px', borderRadius: 7 }}>
            <span className="public-nav-label">Schedule</span>
          </NavLink>
          {isAdmin
            ? <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')} style={{ marginLeft: 4 }}>
                Admin →
              </button>
            : <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')} style={{ marginLeft: 4 }}>
                Sign In
              </button>
          }
        </nav>
      </header>

      <div className="public-header-content-pad" style={{ padding: '0 28px' }}>
        {children}
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user, isAdmin } = useAuth()
  return (
    <Routes>
      {/* Public pages — no login needed */}
      <Route path="/book" element={<PublicLayout><BookRoomPage /></PublicLayout>} />
      <Route path="/rooms" element={<PublicLayout><RoomsPage /></PublicLayout>} />

      {/* Login — redirect based on role if already signed in */}
      <Route path="/login" element={
        user
          ? <Navigate to={isAdmin ? '/dashboard' : '/my-requests'} replace />
          : <LoginPage />
      } />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/book" replace />} />

      {/* Any logged-in user */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/my-requests" element={<MyRequestsPage />} />
      </Route>

      {/* Admin-only pages */}
      <Route element={<AdminRoute><Layout /></AdminRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin"     element={<AdminPanelPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/book" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-3)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-3)' } },
            error:   { iconTheme: { primary: 'var(--red)',   secondary: 'var(--bg-3)' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
