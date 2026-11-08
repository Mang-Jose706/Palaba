import { NavLink } from 'react-router-dom'
import { ChartColumn, ClipboardList, LogOut, PanelsTopLeft, SlidersHorizontal, Users } from 'lucide-react'
import Logo from './Logo.jsx'
import { cx, focusRing } from './cx.js'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: PanelsTopLeft, end: true },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/reports', label: 'Reports', icon: ChartColumn, ownerOnly: true },
  { to: '/settings', label: 'Settings', icon: SlidersHorizontal, ownerOnly: true },
]

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function Avatar({ name, className }) {
  return (
    <span
      aria-hidden="true"
      className={cx('grid size-10 shrink-0 place-items-center rounded-full bg-tint text-sm font-semibold text-accent', className)}
    >
      {initials(name)}
    </span>
  )
}

/**
 * Desktop left sidebar. Reports and Settings show only for the owner.
 * @param {{ user?: { name: string, role: 'owner'|'staff' }, activePath?: string }} props
 *   `activePath` forces the active item (only for previews; normally the URL decides).
 */
export default function Sidebar({ user, activePath, onSignOut, className }) {
  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || user?.role === 'owner')
  return (
    <aside className={cx('flex h-full w-60 shrink-0 flex-col border-r border-line bg-surface px-5 pt-6 pb-6', className)}>
      <NavLink to="/" className={cx('self-start rounded-control', focusRing)} aria-label="Palaba home">
        <Logo />
      </NavLink>

      <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive: routeActive }) => {
              const isActive = activePath != null ? activePath === to : routeActive
              return cx(
                'flex min-h-control items-center gap-3 rounded-control px-4 text-[15px] transition',
                isActive ? 'bg-active-fill font-medium text-navy' : 'text-navy/85 hover:bg-bg',
                focusRing,
              )
            }}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="mt-auto flex items-center gap-3 px-2">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <NavLink to="/change-password" title="Change password" className={cx('block truncate rounded-sm text-sm font-medium text-navy hover:text-accent', focusRing)}>
              {user.name}
            </NavLink>
            <p className="text-xs text-muted capitalize">{user.role}</p>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Log out"
              title="Log out"
              className={cx('grid size-11 place-items-center rounded-control text-muted hover:bg-bg hover:text-navy', focusRing)}
            >
              <LogOut className="size-4.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
