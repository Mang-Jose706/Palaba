import { cx } from './cx.js'
import { STATUSES, isPaid, paymentLabel, unclaimedLabel } from '../utils/orderRules.js'

const TONES = {
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
  neutral: 'bg-neutral-bg text-neutral-fg',
}

/**
 * Pill badge.
 * @param {{ tone?: 'success'|'warning'|'danger'|'info'|'neutral' }} props
 */
export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Order status badge with the right color (Received, In progress, Ready…). */
export function StatusBadge({ status, className }) {
  const s = STATUSES[status]
  return (
    <Badge tone={s?.tone ?? 'neutral'} className={className}>
      {s?.label ?? status}
    </Badge>
  )
}

/** Rule 6: "Paid" (green) or "Unpaid · ₱175 due" (amber). */
export function PaymentBadge({ order, className }) {
  const paid = isPaid(order)
  return (
    <Badge tone={paid ? 'success' : 'warning'} className={className}>
      {paid ? 'Paid' : paymentLabel(order)}
    </Badge>
  )
}

/** Rule 7: "Unclaimed N days" (red). Renders nothing when the order is not unclaimed. */
export function UnclaimedBadge({ order, settings, className }) {
  const label = unclaimedLabel(order, settings)
  if (!label) return null
  return (
    <Badge tone="danger" className={className}>
      {label}
    </Badge>
  )
}
