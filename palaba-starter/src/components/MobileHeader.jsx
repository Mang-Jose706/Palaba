import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowLeft, ClipboardList, House, LogOut, Truck, Users } from 'lucide-react'
import Logo from './Logo.jsx'
import { Avatar } from './Sidebar.jsx'
import { cx, focusRing } from './cx.js'

/** Top bar for staff on phones (under 768px): logo, avatar, log out. */
export default function MobileHeader({ user, onSignOut, className }) {
  return (
    <header
      className={cx('sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3', className)}
    >
      <Link to="/" className={cx('rounded-control', focusRing)} aria-label="Palaba home">
        <Logo size="sm" />
      </Link>
      {user && (
        <div className="flex items-center gap-1">
          <Avatar name={user.name} className="size-9 text-xs" />
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Log out"
              className={cx('grid size-12 place-items-center rounded-control text-muted', focusRing)}
            >
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </header>
  )
}

const MOBILE_NAV = [
  { to: '/', label: 'Today', icon: House, match: (l) => l.pathname === '/' && !l.search.includes('tab=on_the_way') },
  { to: '/orders', label: 'Orders', icon: ClipboardList, match: (l) => l.pathname.startsWith('/orders') && l.pathname !== '/orders/new' },
  { to: '/?tab=on_the_way', label: 'Trips', icon: Truck, match: (l) => l.pathname === '/' && l.search.includes('tab=on_the_way') },
  { to: '/customers', label: 'Customers', icon: Users, match: (l) => l.pathname.startsWith('/customers') },
]

/** Bottom tab bar for staff on phones. */
export function MobileNav({ className }) {
  const location = useLocation()
  return (
    <nav
      aria-label="Main"
      className={cx('fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface px-2 py-1 pb-[max(4px,env(safe-area-inset-bottom))]', className)}
    >
      {MOBILE_NAV.map(({ to, label, icon: Icon, match }) => {
        const active = match(location)
        return (
          <NavLink
            key={label}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex min-h-control-mobile flex-1 flex-col items-center justify-center gap-0.5 rounded-control text-[11px] font-medium',
              active ? 'text-accent' : 'text-muted',
              focusRing,
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}

/** Back-arrow bar for detail pages on phones (New order, Order details…). */
export function MobileTopBar({ title, back = '/', className }) {
  return (
    <header className={cx('sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-surface px-4 py-2 md:hidden', className)}>
      <Link to={back} aria-label="Back" className={cx('-ml-2 grid size-12 place-items-center rounded-control text-navy', focusRing)}>
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      <span className="truncate text-lg font-semibold text-navy">{title}</span>
    </header>
  )
}
