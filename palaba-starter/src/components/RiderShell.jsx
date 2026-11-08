import { Link, NavLink } from 'react-router-dom'
import { ArrowLeft, Check, Truck, User } from 'lucide-react'
import Logo from './Logo.jsx'
import Badge from './Badge.jsx'
import { cx, focusRing } from './cx.js'

const NAV = [
  { to: '/rider', label: 'Today', icon: Truck, end: true },
  { to: '/rider/done', label: 'Done', icon: Check },
  { to: '/rider/account', label: 'Account', icon: User },
]

/**
 * Phone-only frame for rider pages (mobile layout only; on a wide screen it
 * stays a centered phone-width column).
 *
 * - With `title` + `back`: back arrow header (Pickup, Delivery, Pickup not done).
 * - Without: logo header + bottom tab bar (Today, Done, Account).
 */
export default function RiderShell({ title, back, children }) {
  const detail = Boolean(title)
  return (
    <div className="min-h-screen bg-[#E9EDEC]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-bg">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-surface px-4 py-2">
          {detail ? (
            <>
              <Link to={back ?? '/rider'} aria-label="Back to trips" className={cx('-ml-2 grid size-12 place-items-center rounded-control text-navy', focusRing)}>
                <ArrowLeft className="size-5" aria-hidden="true" />
              </Link>
              <h1 className="truncate text-lg font-semibold text-navy">{title}</h1>
            </>
          ) : (
            <>
              <Logo size="sm" />
              <Badge tone="neutral" className="ml-auto">
                Rider
              </Badge>
            </>
          )}
        </header>

        <main className={cx('flex flex-1 flex-col gap-4 px-4 py-4', !detail && 'pb-24')}>{children}</main>

        {!detail && (
          <nav
            aria-label="Rider"
            className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[480px] border-t border-line bg-surface px-2 py-1 pb-[max(4px,env(safe-area-inset-bottom))]"
          >
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-control-mobile flex-1 flex-col items-center justify-center gap-0.5 rounded-control text-[11px] font-medium',
                    isActive ? 'text-accent' : 'text-muted',
                    focusRing,
                  )
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
