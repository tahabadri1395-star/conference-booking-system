import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import HomePage from './pages/HomePage'
import { readTheme, applyTheme, readStyle, applyStyle } from './utils/theme'

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

function AppRoutes() {
  const { user, isAdmin } = useAuth()
  return (
    <>
      <Routes>
        {/* Login */}
        <Route path="/login" element={
          user ? <Navigate to={isAdmin ? '/dashboard' : '/'} replace /> : <LoginPage />
        } />

        {/* Public pages — no login required */}
        <Route element={<Layout />}>
          <Route path="/"         element={<HomePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/rooms"    element={<RoomsPage />} />
          <Route path="/book"     element={<BookRoomPage />} />
        </Route>

        {/* Authenticated pages */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/my-requests" element={<MyRequestsPage />} />
        </Route>

        {/* Admin only */}
        <Route element={<AdminRoute><Layout /></AdminRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin"     element={<AdminPanelPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function ThemeInit() {
  applyTheme(readTheme())
  applyStyle(readStyle())
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
              background: 'var(--bg-solid)',
              color: 'var(--tx)',
              border: '1px solid var(--line-2)',
              fontFamily: 'var(--font)',
              fontSize: '0.845rem',
              fontWeight: '500',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--s3)',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--green-bg)' } },
            error:   { iconTheme: { primary: 'var(--red)',   secondary: 'var(--red-bg)'   } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
