import { Link } from 'react-router-dom'
import Button from './Button.jsx'
import Badge, { PaymentBadge, StatusBadge, UnclaimedBadge } from './Badge.jsx'
import { cx, focusRing } from './cx.js'
import { nextAction, openTripIssue } from '../utils/orderRules.js'
import { formatShortDate, fromDateKey, toDateKey } from '../utils/format.js'
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
    const date = order.pickup?.date
    const day = date && date !== toDateKey(new Date()) ? formatShortDate(fromDateKey(date)) : null
    return [day, order.pickup?.window, rider].filter(Boolean).join(' · ')
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
        // Phones: a card (name + code, service, badges, full-width button).
        'flex flex-col gap-2 p-4',
        // Desktop: one row in four columns.
        'md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_10.5rem] md:items-center md:gap-4 md:px-5',
        className,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3 md:block">
        <Link
          to={`/orders/${order.id}`}
          className={cx('block truncate rounded-sm font-medium text-navy hover:text-accent', focusRing)}
        >
          {order.customer?.name ?? 'Customer'}
        </Link>
        <span className="shrink-0 text-sm text-muted">{order.id}</span>
      </div>

      <span className="truncate text-sm text-muted">{serviceSummary(order)}</span>

      <div className="flex flex-wrap items-center gap-2">
        {showStatus && <StatusBadge status={order.status} />}
        <PaymentBadge order={order} />
        <UnclaimedBadge order={order} settings={settings} />
        {openTripIssue(order) && (
          <Badge tone="danger">{openTripIssue(order).trip === 'pickup' ? 'Pickup' : 'Delivery'} not done</Badge>
        )}
        {order.status === 'pickup_scheduled' && order.pickup?.date < toDateKey(new Date()) && <Badge tone="danger">Overdue</Badge>}
      </div>

      <div className="flex md:justify-end">
        {action ? (
          <Button
            variant="secondary"
            className="mt-1 w-full md:mt-0 md:max-w-36"
            onClick={() => onAction?.(action, order)}
            aria-label={`${action.label}: ${order.id}`}
          >
            {action.label}
          </Button>
        ) : (
          <span className="text-[13px] leading-5 whitespace-nowrap text-muted md:text-right">{tripSummary(order)}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Wrapper for OrderRows: separate cards on phones, one bordered list with
 * dividers on desktop.
 */
export function OrderList({ children, className }) {
  return (
    <div
      className={cx(
        'flex flex-col gap-3 max-md:[&>*]:rounded-card max-md:[&>*]:border max-md:[&>*]:border-line max-md:[&>*]:bg-surface',
        'md:gap-0 md:divide-y md:divide-line md:overflow-hidden md:rounded-card md:border md:border-line md:bg-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}
