import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { THEMES, STYLES, readTheme, applyTheme, themeById, readStyle, applyStyle } from '../utils/theme'

const I = {
  grid:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  home:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  cal:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  plus:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  list:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h11M9 6h11M9 18h11M4 12h.01M4 6h.01M4 18h.01"/></svg>,
  door:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  login:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
  palette: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 110-20c5.5 0 10 4 10 9a5 5 0 01-5 5h-1.8a1.7 1.7 0 00-1.2 2.9A1.7 1.7 0 0112 22z"/><circle cx="7.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="12" cy="7" r="1.2" fill="currentColor"/><circle cx="16.5" cy="10.5" r="1.2" fill="currentColor"/></svg>,
  tick:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  logo:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01"/></svg>,
}

const TITLES = {
  '/':            'Home',
  '/dashboard':   'Dashboard',
  '/calendar':    'Schedule',
  '/book':        'Book a Room',
  '/my-requests': 'My Requests',
  '/rooms':       'Rooms',
  '/admin':       'Admin Panel',
}

const ROLE_LABEL = { admin: 'Administrator', user: 'Member', staff: 'Staff', khidmat_guzar: 'Khidmat Guzar' }

function useClickOutside(onOutside) {
  const ref = useRef(null)
  useEffect(() => {
    const handle = e => { if (ref.current && !ref.current.contains(e.target)) onOutside() }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onOutside])
  return ref
}

// Palette button that opens the colour theme picker.
function ThemeMenu({ theme, onPick, style, onStyle }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const groups = [['Light', THEMES.filter(t => t.base === 'light')], ['Dark', THEMES.filter(t => t.base === 'dark')]]
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen(o => !o)} aria-label="Colour theme" title={`Theme: ${themeById(theme).name}`}>
        {I.palette}
      </button>
      {open && (
        <div className="menu theme-menu">
          <div className="menu-head">
            <div className="menu-name">Look &amp; feel</div>
            <div className="menu-sub">Pick a style and a colour. Saved on this device.</div>
          </div>
          <div className="theme-group">
            <p className="theme-group-label">Style</p>
            <div className="style-grid">
              {STYLES.map(st => (
                <button key={st.id} className={`style-option${st.id === style ? ' active' : ''}`} onClick={() => onStyle(st.id)}
                  aria-pressed={st.id === style}>
                  <span className="style-sample" style={{ fontFamily: `'${st.font}', sans-serif` }}>{st.sample}</span>
                  <strong>{st.name}</strong>
                  <small>{st.note}</small>
                </button>
              ))}
            </div>
          </div>
          {groups.map(([label, list]) => (
            <div key={label} className="theme-group">
              <p className="theme-group-label">{label}</p>
              <div className="theme-grid">
                {list.map(t => (
                  <button key={t.id} className={`theme-option${t.id === theme ? ' active' : ''}`} onClick={() => onPick(t.id)}
                    aria-pressed={t.id === theme}>
                    <span className="theme-swatch" style={{ background: t.swatch[0] }}>
                      <span style={{ background: t.swatch[1] }} />
                      <span style={{ background: t.swatch[2] }} />
                      {t.id === theme && <i>{I.tick}</i>}
                    </span>
                    <span className="theme-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountMenu({ user, initials, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="avatar-btn" onClick={() => setOpen(o => !o)} title={user.name}>{initials}</button>
      {open && (
        <div className="menu">
          <div className="menu-head">
            <div className="menu-name">{user.name}</div>
            <div className="menu-sub">{ROLE_LABEL[user.role] || user.role} · {user.email}</div>
          </div>
          <button className="menu-item danger" onClick={onSignOut}>{I.logout}Sign out</button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [theme, setTheme] = useState(readTheme)
  const [style, setStyle] = useState(readStyle)
  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { applyStyle(style) }, [style])

  const signOut = () => { logout(); navigate('/login') }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const currentTitle = TITLES[location.pathname] || ''
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const navItems = [
    { to: '/',         label: 'Home',        icon: I.home, end: true },
    { to: '/calendar', label: 'Schedule',    icon: I.cal },
    { to: '/book',     label: 'Book a Room', icon: I.plus },
    user && { to: '/my-requests', label: 'My Requests', icon: I.list },
    { to: '/rooms',    label: 'Rooms',       icon: I.door },
    isAdmin && { to: '/dashboard',   label: 'Dashboard',   icon: I.grid },
    isAdmin && { to: '/admin',       label: 'Admin',       icon: I.shield },
  ].filter(Boolean)

  const pillCls = ({ isActive }) => `pill${isActive ? ' active' : ''}`
  const railCls = ({ isActive }) => `rail-item${isActive ? ' active' : ''}`
  const bnavCls = ({ isActive }) => `bnav-item${isActive ? ' active' : ''}`

  return (
    <div className="app-layout">

      {/* ── Desktop left rail ── */}
      <aside className="rail glass">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className={railCls} aria-label={item.label}>
            {item.icon}
            <span className="rail-tip">{item.label}</span>
          </NavLink>
        ))}
      </aside>

      <div className="main-content">

        {/* ── Desktop floating top bar ── */}
        <div className="topbar-wrap">
          <header className="topbar glass">
            <button className="brand" onClick={() => navigate('/')} title="Home">
              <span className="logo-mark">{I.logo}</span>
              <span className="brand-text">
                <span className="logo-name">Meeting<span>Desk</span></span>
                <span className="brand-sub">Room booking</span>
              </span>
            </button>

            <nav className="topnav">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end} className={pillCls} title={item.label}>
                  {item.icon}<span className="pill-label">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="topbar-right">
              <span className="topbar-date">{dateLabel}</span>
              <ThemeMenu theme={theme} onPick={setTheme} style={style} onStyle={setStyle} />
              {user
                ? <AccountMenu user={user} initials={initials} onSignOut={signOut} />
                : <button className="signin-pill" onClick={() => navigate('/login')}>{I.login}Sign in</button>
              }
            </div>
          </header>
        </div>

        {/* ── Mobile header ── */}
        <div className="mobile-topbar-wrap">
          <header className="mobile-topbar glass">
            <div className="mobile-brand">
              <span className="logo-mark mobile-logo-mark">{I.logo}</span>
              <span className="mobile-brand-name">Meeting<span>Desk</span></span>
              {currentTitle && <span className="mobile-page-chip">{currentTitle}</span>}
            </div>
            <div className="mobile-topbar-right">
              <ThemeMenu theme={theme} onPick={setTheme} style={style} onStyle={setStyle} />
              {user
                ? <AccountMenu user={user} initials={initials} onSignOut={signOut} />
                : <button className="signin-pill" onClick={() => navigate('/login')}>Sign in</button>
              }
            </div>
          </header>
        </div>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile floating dock ── */}
      <nav className="bottom-nav">
        {isAdmin
          ? <NavLink to="/dashboard" className={bnavCls}>
              <span className="bnav-icon">{I.grid}</span>
              <span className="bnav-label">Dashboard</span>
            </NavLink>
          : <NavLink to="/" end className={bnavCls}>
              <span className="bnav-icon">{I.home}</span>
              <span className="bnav-label">Home</span>
            </NavLink>
        }

        <NavLink to="/calendar" className={bnavCls}>
          <span className="bnav-icon">{I.cal}</span>
          <span className="bnav-label">Schedule</span>
        </NavLink>

        <NavLink to="/book" className={({ isActive }) => `bnav-fab${isActive ? ' active' : ''}`}>
          <span className="bnav-fab-btn">{I.plus}</span>
          <span className="bnav-label">Book</span>
        </NavLink>

        {user
          ? <NavLink to="/my-requests" className={bnavCls}>
              <span className="bnav-icon">{I.list}</span>
              <span className="bnav-label">Requests</span>
            </NavLink>
          : <NavLink to="/login" className={bnavCls}>
              <span className="bnav-icon">{I.login}</span>
              <span className="bnav-label">Sign in</span>
            </NavLink>
        }

        {isAdmin && (
          <NavLink to="/admin" className={bnavCls}>
            <span className="bnav-icon">{I.shield}</span>
            <span className="bnav-label">Admin</span>
          </NavLink>
        )}
      </nav>

    </div>
  )
}
