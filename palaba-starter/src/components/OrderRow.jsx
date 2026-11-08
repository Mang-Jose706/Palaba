import { Link } from 'react-router-dom'
import Button from './Button.jsx'
import { PaymentBadge, StatusBadge, UnclaimedBadge } from './Badge.jsx'
import { cx, focusRing } from './cx.js'
import { nextAction } from '../utils/orderRules.js'
import { roundKg, serviceLabel } from '../utils/pricing.js'

/** "Wash, dry & fold · 6 kg" or "… · to weigh". */
export function serviceSummary(order) {
  const kg = roundKg(order.kg)
  return `${serviceLabel(order.service)} · ${kg ? `${kg} kg` : 'to weigh'}`
}

/**
 * What happens next when staff have no button (the rider or customer acts):
 * "1:00–3:00 PM · Arnel" (pickup) / "With rider Arnel" (delivery).
 */
export function tripSummary(order) {
  const rider = order.rider?.name?.split(' ')[0]
  if (order.status === 'pickup_scheduled') {
    return [order.pickup?.window, rider].filter(Boolean).join(' · ')
  }
  if (order.status === 'out_for_delivery') return rider ? `With rider ${rider}` : 'Out for delivery'
  return ''
}

/**
 * One order on the Dashboard board: customer + code, service, payment badge
 * and exactly ONE next-step button from orderRules.nextAction.
 *
 * @param {{ order: object, settings?: object, onAction?: (action: object, order: object) => void, showStatus?: boolean }} props
 *   `order` comes from the API (has `customer`).
 */
export default function OrderRow({ order, settings, onAction, showStatus = false, className }) {
  const action = nextAction(order)
  return (
    <div
      className={cx(
        'grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4',
        'md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_10.5rem]',
        className,
      )}
    >
      <div className="min-w-0">
        <Link
          to={`/orders/${order.id}`}
          className={cx('block truncate rounded-sm font-medium text-navy hover:text-accent', focusRing)}
        >
          {order.customer?.name ?? 'Customer'}
        </Link>
        <span className="text-sm text-muted">{order.id}</span>
      </div>

      <span className="order-3 col-span-2 truncate text-sm text-muted md:order-none md:col-span-1">
        {serviceSummary(order)}
      </span>

      <div className="order-4 col-span-2 flex flex-wrap items-center gap-2 md:order-none md:col-span-1">
        {showStatus && <StatusBadge status={order.status} />}
        <PaymentBadge order={order} />
        <UnclaimedBadge order={order} settings={settings} />
      </div>

      <div className="row-span-1 flex justify-end md:row-auto">
        {action ? (
          <Button
            variant="secondary"
            className="w-full max-w-36"
            onClick={() => onAction?.(action, order)}
            aria-label={`${action.label}: ${order.id}`}
          >
            {action.label}
          </Button>
        ) : (
          <span className="text-right text-[13px] leading-5 whitespace-nowrap text-muted">{tripSummary(order)}</span>
        )}
      </div>
    </div>
  )
}

/** Card wrapper that puts OrderRows in a bordered list with dividers. */
export function OrderList({ children, className }) {
  return (
    <div className={cx('divide-y divide-line overflow-hidden rounded-card border border-line bg-surface', className)}>
      {children}
    </div>
  )
}
