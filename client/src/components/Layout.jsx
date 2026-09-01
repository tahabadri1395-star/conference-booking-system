import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const I = {
  home:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  cal:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  plus:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>,
  list:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 12h6M9 6h6M9 18h6M3 12h.01M3 6h.01M3 18h.01"/></svg>,
  door:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  sun:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
  moon:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
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

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const roleLabel = { admin: 'Administrator', user: 'Member', staff: 'Staff', khidmat_guzar: 'Khidmat Guzar' }
  const currentTitle = TITLES[location.pathname] || ''
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const navCls  = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`
  const bnavCls = ({ isActive }) => `bnav-item${isActive ? ' active' : ''}`

  return (
    <div className="app-layout">

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-lockup">
            <div className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01"/>
              </svg>
            </div>
            <span className="logo-name">Meeting<span>Desk</span></span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {isAdmin && (
            <>
              <div className="nav-section-label">Overview</div>
              <NavLink to="/dashboard" className={navCls}>
                <span className="nav-icon">{I.home}</span>Dashboard
              </NavLink>
            </>
          )}

          <div className="nav-section-label" style={isAdmin ? { marginTop: 8 } : {}}>Workspace</div>
          <NavLink to="/calendar"    className={navCls}><span className="nav-icon">{I.cal}</span>Calendar</NavLink>
          <NavLink to="/book"        className={navCls}><span className="nav-icon">{I.plus}</span>Book a Room</NavLink>
          {user && <NavLink to="/my-requests" className={navCls}><span className="nav-icon">{I.list}</span>My Requests</NavLink>}
          <NavLink to="/rooms"       className={navCls}><span className="nav-icon">{I.door}</span>Rooms</NavLink>

          {isAdmin && (
            <>
              <div className="nav-section-label" style={{ marginTop: 8 }}>Admin</div>
              <NavLink to="/admin" className={navCls}><span className="nav-icon">{I.shield}</span>Admin Panel</NavLink>
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
                <button className="sidebar-action-btn" onClick={() => setDark(d => !d)}>
                  {dark ? I.sun : I.moon}{dark ? 'Light' : 'Dark'}
                </button>
                <button className="sidebar-action-btn" onClick={() => { logout(); navigate('/login') }}>
                  {I.logout}Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.72rem', color: 'var(--sb-tx)', lineHeight: 1.55, marginBottom: 10, padding: '0 4px' }}>
                Sign in to manage your bookings and track requests.
              </p>
              <div className="sidebar-actions">
                <button className="sidebar-action-btn" onClick={() => setDark(d => !d)}>
                  {dark ? I.sun : I.moon}{dark ? 'Light' : 'Dark'}
                </button>
                <button className="sidebar-action-btn"
                  style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, borderColor: 'rgba(114,137,245,0.3)', background: 'rgba(114,137,245,0.1)' }}
                  onClick={() => navigate('/login')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:13,height:13}}>
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="main-content">

        {/* Desktop topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <nav className="breadcrumb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 9, height: 9, opacity: 0.3 }}><polyline points="9 18 15 12 9 6"/></svg>
              <span className="breadcrumb-current">{currentTitle}</span>
            </nav>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{dateLabel}</span>
            <button className="topbar-btn" onClick={() => setDark(d => !d)}>
              {dark ? I.sun : I.moon}{dark ? 'Light' : 'Dark'}
            </button>
          </div>
        </header>

        {/* Mobile topbar */}
        <header className="mobile-topbar">
          <div className="mobile-brand">
            <div className="logo-mark mobile-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01"/>
              </svg>
            </div>
            <span className="mobile-brand-name">Meeting<span>Desk</span></span>
          </div>
          {currentTitle && <span className="mobile-page-chip">{currentTitle}</span>}
          <div className="mobile-topbar-right">
            <button className="mobile-icon-btn" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
              {dark ? I.sun : I.moon}
            </button>
            {user
              ? <button className="mobile-avatar-btn" onClick={() => navigate('/my-requests')}>{initials}</button>
              : <button className="mobile-signin-btn" onClick={() => navigate('/login')}>Sign In</button>
            }
          </div>
        </header>

        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav">
        <NavLink to="/calendar" className={bnavCls}>
          <span className="bnav-icon">{I.cal}</span>
          <span className="bnav-label">Calendar</span>
        </NavLink>

        {isAdmin
          ? <NavLink to="/dashboard" className={bnavCls}>
              <span className="bnav-icon">{I.home}</span>
              <span className="bnav-label">Dashboard</span>
            </NavLink>
          : user
            ? <NavLink to="/my-requests" className={bnavCls}>
                <span className="bnav-icon">{I.list}</span>
                <span className="bnav-label">Requests</span>
              </NavLink>
            : <NavLink to="/rooms" className={bnavCls}>
                <span className="bnav-icon">{I.door}</span>
                <span className="bnav-label">Rooms</span>
              </NavLink>
        }

        <NavLink to="/book" className={({ isActive }) => `bnav-fab${isActive ? ' active' : ''}`}>
          <span className="bnav-fab-btn">{I.plus}</span>
          <span className="bnav-label">Book</span>
        </NavLink>

        {isAdmin
          ? <NavLink to="/admin" className={bnavCls}>
              <span className="bnav-icon">{I.shield}</span>
              <span className="bnav-label">Admin</span>
            </NavLink>
          : <NavLink to="/rooms" className={bnavCls}>
              <span className="bnav-icon">{I.door}</span>
              <span className="bnav-label">Rooms</span>
            </NavLink>
        }

        <button className="bnav-item" onClick={() => { logout(); navigate('/login') }} style={{ cursor: 'pointer' }}>
          {user
            ? <><span className="bnav-icon">{I.logout}</span><span className="bnav-label">Sign Out</span></>
            : <><span className="bnav-icon">{I.shield}</span><span className="bnav-label">Sign In</span></>
          }
        </button>
      </nav>

    </div>
  )
}
