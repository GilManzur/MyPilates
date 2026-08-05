import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Logo } from './Logo'
import { Icon, type IconName } from './Icon'

const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'בית', icon: 'home' },
  { to: '/calendar', label: 'יומן', icon: 'calendar' },
  { to: '/hours', label: 'שעות', icon: 'clock' },
  { to: '/payments', label: 'תשלום', icon: 'shekel' },
  { to: '/documents', label: 'מסמכים', icon: 'document' },
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
              <Icon name={link.icon} size={22} />
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
        {/* Settings is reached via the top-bar gear on mobile; on desktop it
            becomes a first-class sidebar item (hidden below the desktop breakpoint). */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `bottom-nav__item bottom-nav__item--desktop${isActive ? ' is-active' : ''}`
          }
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            <Icon name="settings" size={22} />
          </span>
          <span>הגדרות</span>
        </NavLink>
      </nav>
    </div>
  )
}
