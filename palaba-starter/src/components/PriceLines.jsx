import { cx } from './cx.js'
import { SESSION_KG, formatPeso, serviceLabel } from '../utils/pricing.js'

/**
 * Turn a computePrice() result into display lines. Amount is a number, or a
 * string when the order is not weighed yet ("₱175 per session").
 * @returns {{ label: string, amount: number|string }[]}
 */
export function priceLines(price, { service, sessionPrice }) {
  const svc = serviceLabel(service)
  const lines = []
  if (price.laundry == null) {
    lines.push({ label: svc, amount: `${formatPeso(sessionPrice)} per session` })
  } else if (price.extraKg > 0) {
    lines.push({ label: `${svc} · first ${SESSION_KG} kg`, amount: sessionPrice })
    lines.push({
      label: `Extra ${price.extraKg} kg × ${formatPeso(price.perExtraKg)}`,
      amount: price.laundry - sessionPrice,
    })
  } else {
    lines.push({ label: `${svc} · ${price.billableKg} kg`, amount: price.laundry })
  }
  if (price.pickupFee) lines.push({ label: 'Pickup fee', amount: price.pickupFee })
  if (price.deliveryFee) lines.push({ label: 'Delivery fee', amount: price.deliveryFee })
  return lines
}

/** Price breakdown + total row, used by New order and the claim slip. */
export default function PriceLines({ price, service, sessionPrice, totalLabel = 'Total', pendingTotal = 'After weighing', className }) {
  return (
    <dl className={cx('flex flex-col gap-2.5 text-sm', className)}>
      {priceLines(price, { service, sessionPrice }).map((line) => (
        <div key={line.label} className="flex justify-between gap-4">
          <dt className="text-muted">{line.label}</dt>
          <dd className="text-right text-navy">{typeof line.amount === 'number' ? formatPeso(line.amount) : line.amount}</dd>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
        <dt>{totalLabel}</dt>
        <dd>{price.total == null ? pendingTotal : formatPeso(price.total)}</dd>
      </div>
    </dl>
  )
}
