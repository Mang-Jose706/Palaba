import { Link } from 'react-router-dom'
import Badge from '../../components/Badge.jsx'
import { cx, focusRing } from '../../components/cx.js'
import { isPaid } from '../../utils/orderRules.js'
import { formatPeso, orderTotal } from '../../utils/pricing.js'
import { formatTime } from '../../utils/format.js'

/** What the rider has to do at this stop, in one line. */
export function tripTask(order) {
  const after = order.returnMethod === 'home_delivery' ? 'deliver back home' : 'customer picks up at the shop'
  if (order.status === 'out_for_delivery') return isPaid(order) ? 'Paid · hand over the laundry' : 'Collect before handing over'
  if (order.paymentOption === 'at_the_door') return `Weigh and collect at the door · ${after}`
  if (order.paymentOption === 'on_delivery') return `Customer pays on delivery · ${after}`
  return order.returnMethod === 'home_delivery' ? 'Shop weighs it · deliver back home' : 'Customer picks up at the shop'
}

/** One stop on the rider's list; the whole card is a link. */
export default function TripCard({ order, highlight = false, done = false }) {
  const delivery = order.status === 'out_for_delivery' || order.status === 'delivered'
  const href = done ? null : delivery ? `/rider/delivery/${order.id}` : `/rider/pickup/${order.id}`
  const total = orderTotal(order)
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <Badge tone={delivery ? 'success' : 'info'}>{delivery ? 'Delivery' : 'Pickup'}</Badge>
        {done ? (
          <span className="text-[13px] text-muted">
            {order.status === 'delivered' ? 'Delivered' : 'Picked up'} {formatTime(order.status === 'delivered' ? order.closedAt : order.pickedUpAt)}
          </span>
        ) : delivery ? (
          <Badge tone="info">On the way</Badge>
        ) : (
          <span className="text-sm text-muted">{order.pickup?.window}</span>
        )}
      </div>
      <p className="mt-3 font-semibold text-navy">
        {order.customer?.name} · {order.id}
      </p>
      <p className="text-[13px] text-muted">
        {[order.pickup?.address ?? order.customer?.address, order.pickup?.landmark ?? order.customer?.landmark].filter(Boolean).join(' · ')}
      </p>
      {!done && (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">{tripTask(order)}</span>
          {delivery && !isPaid(order) && total != null && <span className="font-semibold text-navy">{formatPeso(total)}</span>}
        </div>
      )}
    </>
  )
  const classes = cx(
    'block rounded-card border bg-surface p-4',
    highlight ? 'border-2 border-accent p-[15px]' : 'border-line',
    href && 'hover:border-accent/60',
    focusRing,
  )
  return href ? (
    <Link to={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}
