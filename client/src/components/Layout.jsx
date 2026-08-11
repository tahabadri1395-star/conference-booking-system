import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Icons = {
  grid:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  cal:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>,
  plus:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>,
  list:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>,
  door:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01"/></svg>,
  shield:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  sun:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  moon:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  bell:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg>,
}

const PAGE_TITLES = {
  '/dashboard':   ['Dashboard', 'Overview'],
  '/calendar':    ['Calendar', 'Schedule'],
  '/book':        ['Book a Room', 'New Booking'],
  '/my-requests': ['My Requests', 'Bookings'],
  '/rooms':       ['Rooms', 'Directory'],
  '/admin':       ['Admin Panel', 'Management'],
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [darkMode])

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
  const roleLabels = { admin: 'Administrator', user: 'User', staff: 'Staff', khidmat_guzar: 'Khidmat Guzar' }
  const pageInfo = PAGE_TITLES[location.pathname] || ['Page', '']

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="app-layout">

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="sidebar">

        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
              </svg>
            </div>
            <div>
              <div className="logo-text">Meeting<span>Desk</span></div>
              <div className="logo-tagline">Room Booking</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigate</div>

          {isAdmin && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{Icons.grid}</span>
              Dashboard
            </NavLink>
          )}

          <NavLink to="/calendar" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{Icons.cal}</span>
            Calendar
          </NavLink>

          <NavLink to="/book" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{Icons.plus}</span>
            Book a Room
          </NavLink>

          <NavLink to="/my-requests" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{Icons.list}</span>
            My Requests
          </NavLink>

          <NavLink to="/rooms" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{Icons.door}</span>
            Rooms
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-section-label" style={{ marginTop: 16 }}>Admin</div>
              <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <span className="nav-icon">{Icons.shield}</span>
                Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <button className="sidebar-theme-toggle" onClick={() => setDarkMode(d => !d)}>
            {darkMode ? Icons.sun : Icons.moon}
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>

          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{roleLabels[user?.role] || user?.role}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Sign out">{Icons.logout}</button>
          </div>
        </div>

      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="main-content">

        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 14, height: 14, color: 'var(--text-3)' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              {Icons.chevron}
              <span>{pageInfo[0]}</span>
              {pageInfo[1] && (
                <>
                  {Icons.chevron}
                  <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{pageInfo[1]}</span>
                </>
              )}
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-date">{dateStr}</div>
            <button className="topbar-theme-btn" onClick={() => setDarkMode(d => !d)} title="Toggle theme">
              {darkMode ? Icons.sun : Icons.moon}
            </button>
          </div>
        </header>

        <main style={{ flex: 1 }}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}
