import { NavLink } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const links = [
  { to: '/', label: 'בית', icon: '⌂' },
  { to: '/calendar', label: 'יומן', icon: '▦' },
  { to: '/hours', label: 'שעות', icon: '◷' },
  { to: '/studios', label: 'סטודיו', icon: '◎' },
  { to: '/payments', label: 'תשלום', icon: '₪' },
]

export function AppShell() {
  const { user } = useAuth()

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="brand-name">MyPilates</p>
            <p className="brand-sub">{user?.displayName}</p>
          </div>
        </div>
        <NavLink to="/settings" className="icon-btn" aria-label="הגדרות">
          ⚙
        </NavLink>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="ניווט ראשי">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}
          >
            <span className="bottom-nav__icon" aria-hidden="true">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
