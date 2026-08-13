import { NavLink, Outlet } from 'react-router-dom'
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
  return (
    <div className="app-shell">
      <header className="top-bar">
        <NavLink to="/" className="top-bar__brand" aria-label="בית">
          <Logo size={32} />
          <p className="brand-name">MyPilates</p>
        </NavLink>
        <NavLink to="/settings" className="icon-btn" aria-label="הגדרות">
          <Icon name="settings" size={22} />
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
