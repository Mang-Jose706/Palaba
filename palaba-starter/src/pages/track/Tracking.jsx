// Public customer tracking page /t/:code.
// No login. Shows status steps (no times), the amount due and a Call the shop button.

import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Phone } from 'lucide-react'
import Card from '../../components/Card.jsx'
import Logo from '../../components/Logo.jsx'
import { cx, focusRing } from '../../components/cx.js'
import useApiData from '../../components/useApiData.js'
import { getOrderByTrackingCode, getShopContact } from '../../api/index.js'
import { formatPeso, roundKg, serviceLabel, sessionsFor } from '../../utils/pricing.js'
import { formatLongDay, fromDateKey, toDateKey } from '../../utils/format.js'

const delivery = (o) => o.returnMethod === 'home_delivery'

/** Customer-friendly step names. */
function stepLabel(o, step) {
  switch (step.status) {
    case 'pickup_scheduled':
      return step.state === 'done' ? 'Picked up from your home' : 'Pickup scheduled'
    case 'received':
      return o.type === 'home_pickup' ? 'Received at the shop' : 'Received'
    case 'in_progress':
      return 'In progress'
    case 'ready':
      return delivery(o) ? 'Ready' : 'Ready for pickup'
    case 'out_for_delivery':
      return 'Out for delivery'
    case 'delivered':
      return 'Delivered'
    case 'claimed':
      return 'Claimed'
    default:
      return step.status
  }
}

/** "today" / "tomorrow" / "on Friday, November 6" — a day, never a time. */
function dayPhrase(dateKey) {
  if (!dateKey) return ''
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  if (dateKey === toDateKey(today)) return 'today'
  if (dateKey === toDateKey(tomorrow)) return 'tomorrow'
  return `on ${formatLongDay(fromDateKey(dateKey))}`
}

function headline(o) {
  const textWhen = delivery(o)
    ? o.textsOn.onTheWay
      ? "We'll text you when it's on the way."
      : 'Check this page for updates.'
    : o.textsOn.ready
      ? "We'll text you when it's ready."
      : 'Check this page for updates.'
  switch (o.status) {
    case 'pickup_scheduled':
      return ['Pickup scheduled', `${o.riderFirstName ? `${o.riderFirstName}, our rider,` : 'Our rider'} will pick up your laundry ${dayPhrase(o.pickupDate)}.`]
    case 'received':
      return ['We have your laundry', textWhen]
    case 'in_progress':
      return ['Washing in progress', textWhen]
    case 'ready':
      return delivery(o)
        ? ['Ready for delivery', o.textsOn.onTheWay ? "We'll text you when the rider is on the way." : 'Your rider will bring it soon.']
        : ['Ready for pickup', 'Please bring your claim slip.']
    case 'out_for_delivery':
      return ['Out for delivery', o.riderFirstName ? `Your rider is ${o.riderFirstName}` : 'Your rider is on the way']
    case 'claimed':
    case 'delivered':
      return [o.status === 'claimed' ? 'Claimed' : 'Delivered', 'Thank you for choosing us!']
    case 'cancelled':
      return ['Order cancelled', 'Please call the shop if you have questions.']
    default:
      return ['Your laundry', '']
  }
}

function amountNote(o) {
  if (o.paid) return 'Paid in full. Thank you!'
  if (o.price.total == null) {
    if (o.paymentOption === 'after_weighing') return "We'll text you the amount after we weigh it at the shop."
    if (o.paymentOption === 'at_the_door') return 'The rider weighs it at your door. Please prepare the full amount.'
    return 'You pay the rider the full amount when your laundry comes back.'
  }
  if (delivery(o)) {
    if (o.paymentOption === 'after_weighing' && o.status !== 'out_for_delivery') {
      return `Please pay the full amount by GCash or Maya to ${o.shop.phone}.`
    }
    return 'Please prepare the full amount. Cash, GCash, and Maya are accepted.'
  }
  return 'Please pay the full amount and bring your claim slip.'
}

function totalLabel(o) {
  if (o.paid) return 'Paid'
  if (o.price.total == null) return 'Amount due'
  if (delivery(o)) return o.status === 'out_for_delivery' || o.paymentOption === 'on_delivery' ? 'Pay the rider' : 'Amount due'
  return 'Amount due at pickup'
}

function Shell({ shopName, children }) {
  return (
    <div className="min-h-screen bg-[#E9EDEC]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-bg">
        <header className="flex min-h-14 items-center gap-3 border-b border-line bg-surface px-4 py-2">
          <Logo size="sm" showText={false} />
          <span className="text-lg font-semibold text-navy">{shopName || 'Palaba'}</span>
        </header>
        <main className="flex flex-1 flex-col gap-4 px-4 py-5">{children}</main>
      </div>
    </div>
  )
}

function CallButton({ phone }) {
  if (!phone) return null
  return (
    <a
      href={`tel:${phone?.replace(/\s/g, '')}`}
      className={cx(
        'flex min-h-control-mobile items-center justify-center gap-2 rounded-control bg-tint text-base font-semibold text-accent hover:bg-[#dce9fd]',
        focusRing,
      )}
    >
      <Phone className="size-5" aria-hidden="true" />
      Call the shop
    </a>
  )
}

export default function Tracking() {
  const { code } = useParams()
  const track = useApiData(() => getOrderByTrackingCode(code), [code])
  const shop = useApiData(() => getShopContact(), [])
  const o = track.data

  useEffect(() => {
    document.title = o ? `${o.id} · ${o.shop.name || 'Palaba'}` : 'Track your laundry'
  }, [o])

  if (track.error) {
    return (
      <Shell shopName={shop.data?.name}>
        <h1 className="text-2xl font-bold text-navy">We couldn’t find this order</h1>
        <p className="text-sm text-muted">Check the link on your claim slip, or call the shop and give them your order number.</p>
        {shop.data && <CallButton phone={shop.data.phone} />}
      </Shell>
    )
  }
  if (!o) {
    return (
      <Shell shopName={shop.data?.name}>
        <p className="text-sm text-muted">Loading your order…</p>
      </Shell>
    )
  }

  const [title, sub] = headline(o)
  const kg = roundKg(o.kg)
  const fees = o.price.pickupFee + o.price.deliveryFee
  const feeLabel = o.price.pickupFee && o.price.deliveryFee ? 'Pickup and delivery fees' : o.price.pickupFee ? 'Pickup fee' : 'Delivery fee'

  return (
    <Shell shopName={o.shop.name}>
      <div>
        <p className="text-sm text-muted">
          Hi {o.customerFirstName} · {o.id}
        </p>
        <h1 className="text-[28px] leading-9 font-bold tracking-tight text-navy">{title}</h1>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>

      {/* Status steps — no times on purpose. */}
      <Card className="p-4">
        <ol aria-label="Order progress" className="flex flex-col">
          {o.steps.map((step, i) => {
            const reached = step.state === 'done' || step.state === 'current'
            const last = i === o.steps.length - 1
            return (
              <li key={step.status} aria-current={step.state === 'current' ? 'step' : undefined} className="relative flex min-h-11 items-center gap-3">
                {!last && (
                  <span
                    aria-hidden="true"
                    className={cx('absolute top-[34px] bottom-[-10px] left-[11px] w-0.5', step.state === 'done' ? 'bg-accent' : 'bg-line')}
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cx(
                    'relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2',
                    reached ? 'border-accent bg-accent text-white' : 'border-[#D5DCE0] bg-surface',
                  )}
                >
                  {reached && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={cx('text-base', step.state === 'current' ? 'font-semibold text-navy' : reached ? 'text-navy' : 'text-muted')}>
                  {stepLabel(o, step)}
                  <span className="sr-only">{step.state === 'current' ? ' (current)' : reached ? ' (done)' : ' (not yet)'}</span>
                </span>
              </li>
            )
          })}
          {o.status === 'cancelled' && (
            <li className="mt-2 rounded-control bg-danger-bg px-3 py-2 text-sm text-danger-fg">This order was cancelled.</li>
          )}
        </ol>
      </Card>

      {o.status !== 'cancelled' && (
        <Card className="flex flex-col gap-2.5 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">
              {serviceLabel(o.service)}
              {kg && ` · ${kg} kg`}
              {kg && sessionsFor(o.kg) > 1 && ` (${sessionsFor(o.kg)} sessions)`}
            </span>
            <span className="text-navy">{o.price.laundry == null ? `${formatPeso(o.rates?.sessionPrice)} per session` : formatPeso(o.price.laundry)}</span>
          </div>
          {fees > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-muted">{feeLabel}</span>
              <span className="text-navy">{formatPeso(fees)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-line pt-3 font-semibold text-navy">
            <span>{totalLabel(o)}</span>
            <span>{o.price.total == null ? 'After weighing' : formatPeso(o.price.total)}</span>
          </div>
          <p className={cx('text-[13px]', o.paid ? 'text-success-fg' : 'text-muted')}>{amountNote(o)}</p>
        </Card>
      )}

      {(o.shop.name || o.shop.address) && (
        <Card className="p-4">
          <p className="font-semibold text-navy">{o.shop.name}</p>
          <p className="text-sm text-muted">{o.shop.address}</p>
        </Card>
      )}

      <CallButton phone={o.shop.phone} />
    </Shell>
  )
}
