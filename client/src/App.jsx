import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BookRoomPage from './pages/BookRoomPage'
import MyRequestsPage from './pages/MyRequestsPage'
import AdminPanelPage from './pages/AdminPanelPage'
import RoomsPage from './pages/RoomsPage'
import CalendarPage from './pages/CalendarPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <div className="app-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/my-requests" replace />
  return children
}

// ── Mobile global tab bar ────────────────────────────────────────────────────
function MobileTabBar() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (!user || location.pathname === '/login') return null

  const cls = ({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`

  return (
    <nav className="bottom-nav">
      <NavLink to="/calendar" className={cls}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>
        <span>Calendar</span>
      </NavLink>

      <NavLink to="/book" className={cls}>
        <span className="book-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{width:20,height:20}}><path d="M12 5v14M5 12h14"/></svg>
        </span>
        <span>Book</span>
      </NavLink>

      <NavLink to="/my-requests" className={cls}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
        <span>Requests</span>
      </NavLink>

      <NavLink to="/rooms" className={cls}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01"/></svg>
        <span>Rooms</span>
      </NavLink>

      {isAdmin && (
        <NavLink to="/admin" className={cls}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Admin</span>
        </NavLink>
      )}

      <button className="bottom-nav-item" onClick={() => { logout(); navigate('/login') }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:22,height:22}}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        <span>Logout</span>
      </button>
    </nav>
  )
}

// ── Public layout (no login required) ───────────────────────────────────────
function PublicLayout({ children }) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Desktop header — hidden on mobile */}
      <header className="public-header" style={{
        height: 56, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-icon" style={{ width: 30, height: 30 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: 'white' }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <span className="logo-text" style={{ fontSize: '1.05rem' }}>Meeting<span>Desk</span></span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <NavLink to="/calendar" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{ padding: '6px 12px', borderRadius: 7 }}>Calendar</NavLink>
          <NavLink to="/book"     className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{ padding: '6px 12px', borderRadius: 7 }}>Book a Room</NavLink>
          <NavLink to="/rooms"    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{ padding: '6px 12px', borderRadius: 7 }}>Rooms</NavLink>
          {isAdmin
            ? <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')} style={{ marginLeft: 4 }}>Admin →</button>
            : <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')} style={{ marginLeft: 4 }}>Sign In</button>
          }
        </nav>
      </header>

      {/* Mobile top bar — shown only on mobile */}
      <div className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-icon" style={{ width: 28, height: 28 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'white' }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <span className="logo-text" style={{ fontSize: '1.05rem' }}>Meeting<span>Desk</span></span>
        </div>
        {!user && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>Sign In</button>
        )}
      </div>

      <div className="public-content" style={{ padding: '0 28px' }}>
        {children}
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user, isAdmin } = useAuth()
  return (
    <>
      <Routes>
        {/* Public pages */}
        <Route path="/book"     element={<PublicLayout><BookRoomPage /></PublicLayout>} />
        <Route path="/rooms"    element={<PublicLayout><RoomsPage /></PublicLayout>} />
        <Route path="/calendar" element={<PublicLayout><CalendarPage /></PublicLayout>} />

        {/* Login */}
        <Route path="/login" element={
          user ? <Navigate to={isAdmin ? '/dashboard' : '/my-requests'} replace /> : <LoginPage />
        } />

        {/* Root */}
        <Route path="/" element={<Navigate to="/calendar" replace />} />

        {/* Authenticated */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/my-requests" element={<MyRequestsPage />} />
        </Route>

        {/* Admin only */}
        <Route element={<AdminRoute><Layout /></AdminRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin"     element={<AdminPanelPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/book" replace />} />
      </Routes>

      {/* Global mobile tab bar — renders on all pages when logged in */}
      <MobileTabBar />
    </>
  )
}

function ThemeInit() {
  // Apply saved theme before first render
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeInit />
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--bg-2)',
              color: 'var(--tx)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--font)',
              fontSize: '0.845rem',
              fontWeight: '500',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--s3)',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: 'var(--green)', secondary: 'var(--green-bg)' },
            },
            error: {
              iconTheme: { primary: 'var(--red)', secondary: 'var(--red-bg)' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
