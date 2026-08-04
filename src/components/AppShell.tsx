import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Logo } from './Logo'

const links = [
  { to: '/', label: 'בית', icon: '⌂' },
  { to: '/calendar', label: 'יומן', icon: '▦' },
  { to: '/hours', label: 'שעות', icon: '◷' },
  { to: '/payments', label: 'תשלום', icon: '₪' },
  { to: '/documents', label: 'מסמכים', icon: '🧾' },
]

export function AppShell() {
  const { user } = useAuth()

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__brand">
          <Logo size={40} />
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
