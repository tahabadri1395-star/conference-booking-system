// src/pages/AdminPanelPage.jsx
import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function ActionModal({ booking, onClose, onConfirm }) {
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(false)
  const isApprove = booking._action === 'approved'

  const handle = async () => {
    setLoading(true)
    try {
      await onConfirm(booking.id, booking._action, remarks)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3 className="modal-title">{isApprove ? '✅ Approve Booking' : '❌ Reject Booking'}</h3>
        <p className="modal-subtitle">
          {booking.purpose} · {booking.room?.name} · {booking.date} {booking.startTime}–{booking.endTime}
        </p>
        <div className="form-group">
          <label className="form-label">Admin Remarks {!isApprove && <span>*</span>}</label>
          <textarea
            className="form-textarea"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder={isApprove ? 'Optional note for the requester…' : 'Reason for rejection…'}
            rows={3}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${isApprove ? 'btn-green' : 'btn-red'}`}
            onClick={handle}
            disabled={loading || (!isApprove && !remarks.trim())}
          >
            {loading ? 'Processing…' : isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handle = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm)
      return toast.error('New passwords do not match')
    setLoading(true)
    try {
      await api.put('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Password updated successfully')
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>Change Password</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 20 }}>Update your admin account password.</p>
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Current Password</label>
          <input type="password" className="form-input" value={form.currentPassword} onChange={set('currentPassword')} required autoComplete="current-password" />
        </div>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input type="password" className="form-input" value={form.newPassword} onChange={set('newPassword')} required autoComplete="new-password" minLength={6} />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input type="password" className="form-input" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" minLength={6} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

export default function AdminPanelPage() {
  const [tab, setTab] = useState('bookings') // 'bookings' | 'settings'
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [rooms, setRooms] = useState([])
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bRes, rRes] = await Promise.all([api.get('/bookings'), api.get('/rooms')])
      setBookings(bRes.data.data)
      setRooms(rRes.data.data)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAction = async (id, status, adminRemarks) => {
    try {
      await api.put(`/bookings/${id}`, { status, adminRemarks })
      toast.success(`Booking ${status} successfully`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
      throw err
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this booking permanently?')) return
    try {
      await api.delete(`/bookings/${id}`)
      toast.success('Booking deleted')
      setBookings(b => b.filter(x => x.id !== id))
    } catch {
      toast.error('Failed to delete')
    }
  }

  const filtered = bookings.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false
    if (dateFilter && b.date !== dateFilter) return false
    if (roomFilter && b.roomId !== roomFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        b.name?.toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q) ||
        b.room?.name?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="page animate-in">
      {modal && (
        <ActionModal
          booking={modal}
          onClose={() => setModal(null)}
          onConfirm={handleAction}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage bookings</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => load()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'bookings',  label: 'Bookings', count: counts.pending },
          { key: 'settings', label: 'Settings', count: 0 },
        ].map(({ key, label, count }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: tab === key ? 'var(--bg-2)' : 'transparent',
              color: tab === key ? 'var(--text)' : 'var(--text-3)',
              fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: tab === key ? 600 : 400,
              boxShadow: tab === key ? 'var(--shadow)' : 'none', transition: 'all 0.18s',
            }}>
            {label}
            {count > 0 && (
              <span style={{ background: key === 'users' ? 'var(--accent)' : 'var(--yellow)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && <ChangePasswordForm />}

      {/* ── BOOKINGS TAB ── */}
      {tab === 'bookings' && <>

      {/* Stats row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total', value: counts.all, color: '' },
          { label: 'Pending', value: counts.pending, color: 'yellow' },
          { label: 'Approved', value: counts.approved, color: 'green' },
          { label: 'Rejected', value: counts.rejected, color: 'red' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`stat-card ${color}`} style={{ padding: '14px 18px', cursor: 'pointer' }}
            onClick={() => setFilter(label.toLowerCase())}>
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>{loading ? '–' : value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="filters-bar" style={{ margin: 0 }}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <input type="date" className="form-input" style={{ width: 160 }} value={dateFilter}
          onChange={e => setDateFilter(e.target.value)} title="Filter by date" />

        <select className="form-select" style={{ width: 160 }} value={roomFilter}
          onChange={e => setRoomFilter(e.target.value)}>
          <option value="">All Rooms</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <div className="search-wrap" style={{ marginLeft: 'auto' }}>
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="form-input search-input" style={{ width: 220 }} placeholder="Search name, email, purpose…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {(filter !== 'all' || dateFilter || roomFilter || search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilter('all'); setDateFilter(''); setRoomFilter(''); setSearch('') }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Requester</th>
              <th>Room</th>
              <th>Date & Time</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Submitted</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-3)' }}>
                  No bookings found matching your filters.
                </td>
              </tr>
            ) : (
              filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{b.email}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.room?.color || 'var(--accent)', flexShrink: 0 }} />
                      <strong>{b.room?.name || b.roomId}</strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{b.room?.floor}</div>
                  </td>
                  <td>
                    <strong>{b.date === today ? '📅 Today' : b.date}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{b.startTime} – {b.endTime}</div>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.purpose}</div>
                    {b.adminRemarks && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>
                        Remark: {b.adminRemarks}
                      </div>
                    )}
                  </td>
                  <td><StatusBadge status={b.status} /></td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {b.createdAt ? format(parseISO(b.createdAt), 'MMM d, HH:mm') : '–'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {b.status === 'pending' && (
                        <>
                          <button className="btn btn-green btn-sm"
                            onClick={() => setModal({ ...b, _action: 'approved' })}>
                            Approve
                          </button>
                          <button className="btn btn-red btn-sm"
                            onClick={() => setModal({ ...b, _action: 'rejected' })}>
                            Reject
                          </button>
                        </>
                      )}
                      {b.status === 'approved' && (
                        <button className="btn btn-red btn-sm"
                          onClick={() => setModal({ ...b, _action: 'rejected' })}>
                          Revoke
                        </button>
                      )}
                      {b.status === 'rejected' && (
                        <button className="btn btn-green btn-sm"
                          onClick={() => setModal({ ...b, _action: 'approved' })}>
                          Approve
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}
                        onClick={() => handleDelete(b.id)}
                        title="Delete booking">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'right' }}>
          Showing {filtered.length} of {bookings.length} bookings
        </div>
      )}
      </>}
    </div>
  )
}
