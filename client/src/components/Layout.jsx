import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const I = {
  home:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  cal:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  plus:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 5v14M5 12h14"/></svg>,
  list:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 12h6M9 6h6M9 18h6M3 12h.01M3 6h.01M3 18h.01"/></svg>,
  door:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01"/></svg>,
  shield:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  sun:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
}

const TITLES = {
  '/dashboard':   'Dashboard',
  '/calendar':    'Calendar',
  '/book':        'Book a Room',
  '/my-requests': 'My Requests',
  '/rooms':       'Rooms',
  '/admin':       'Admin Panel',
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
  const roleLabel = { admin: 'Administrator', user: 'Member', staff: 'Staff', khidmat_guzar: 'Khidmat Guzar' }
  const currentTitle = TITLES[location.pathname] || 'Page'
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const nav = cls => `nav-item${cls ? ' active' : ''}`

  return (
    <div className="app-layout">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-lockup">
            <div className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01"/>
              </svg>
            </div>
            <span className="logo-name">MeetingDesk</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {isAdmin && (
            <>
              <div className="nav-label">Overview</div>
              <NavLink to="/dashboard" className={({ isActive }) => nav(isActive)}>
                <span className="nav-icon">{I.home}</span>Dashboard
              </NavLink>
            </>
          )}

          <div className="nav-label" style={isAdmin ? { marginTop: 8 } : {}}>Workspace</div>
          <NavLink to="/calendar"    className={({ isActive }) => nav(isActive)}>
            <span className="nav-icon">{I.cal}</span>Calendar
          </NavLink>
          <NavLink to="/book"        className={({ isActive }) => nav(isActive)}>
            <span className="nav-icon">{I.plus}</span>Book a Room
          </NavLink>
          <NavLink to="/my-requests" className={({ isActive }) => nav(isActive)}>
            <span className="nav-icon">{I.list}</span>My Requests
          </NavLink>
          <NavLink to="/rooms"       className={({ isActive }) => nav(isActive)}>
            <span className="nav-icon">{I.door}</span>Rooms
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-label" style={{ marginTop: 8 }}>Admin</div>
              <NavLink to="/admin" className={({ isActive }) => nav(isActive)}>
                <span className="nav-icon">{I.shield}</span>Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <>
              <div className="user-row">
                <div className="user-avatar">{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="user-name">{user.name}</div>
                  <div className="user-role">{roleLabel[user.role] || user.role}</div>
                </div>
              </div>
              <div className="sidebar-actions">
                <button className="sidebar-action-btn" onClick={() => setDark(d => !d)} title="Toggle theme">
                  {dark ? I.sun : I.moon}
                  {dark ? 'Light' : 'Dark'}
                </button>
                <button className="sidebar-action-btn" onClick={() => { logout(); navigate('/login') }} title="Sign out">
                  {I.logout}
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.75rem', color: 'var(--sb-tx)', lineHeight: 1.5, marginBottom: 10, padding: '0 2px' }}>
                Sign in to book rooms and manage your requests.
              </div>
              <div className="sidebar-actions">
                <button className="sidebar-action-btn" onClick={() => setDark(d => !d)} title="Toggle theme">
                  {dark ? I.sun : I.moon}
                  {dark ? 'Light' : 'Dark'}
                </button>
                <button
                  className="sidebar-action-btn"
                  style={{ color: 'var(--sb-tx-logo)', fontWeight: 700 }}
                  onClick={() => navigate('/login')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:16,height:16}}><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <nav className="breadcrumb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10, opacity: 0.4 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <span className="breadcrumb-current">{currentTitle}</span>
            </nav>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{dateLabel}</span>
            <button className="topbar-btn" onClick={() => setDark(d => !d)}>
              {dark ? I.sun : I.moon}
              {dark ? 'Light' : 'Dark'}
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
