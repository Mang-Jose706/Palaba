import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Check, Copy, Printer } from 'lucide-react'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import ClaimSlip from '../components/ClaimSlip.jsx'
import useApiData from '../components/useApiData.js'
import { getOrder, getSettings, trackingLink } from '../api/index.js'
import { isPaid } from '../utils/orderRules.js'
import { formatPeso, orderTotal } from '../utils/pricing.js'
import { formatLongDay, formatMobile, formatTime, fromDateKey } from '../utils/format.js'

function subtitle(order) {
  if (order.type === 'home_pickup') {
    const day = order.pickup?.date ? formatLongDay(fromDateKey(order.pickup.date)) : ''
    return `${order.id} is scheduled for pickup on ${day}, ${order.pickup?.window}.`
  }
  if (isPaid(order)) return `${order.id} is saved and paid. Print the slip for the customer.`
  return `${order.id} is saved. ${formatPeso(orderTotal(order))} is due at pickup. Print the slip for the customer.`
}

export default function OrderCreated() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const order = useApiData(() => getOrder(id), [id])
  const settings = useApiData(() => getSettings(), [])
  const [copied, setCopied] = useState(false) // false | 'yes' | 'failed'
  const printed = useRef(false)

  const o = order.data
  const url = o ? trackingLink(o) : ''
  const text = o?.texts?.find((t) => t.kind === 'pickup_scheduled')

  // "Create order and print slip" lands here with ?print=1.
  useEffect(() => {
    if (!o || !settings.data || printed.current || params.get('print') !== '1') return
    printed.current = true
    setParams({}, { replace: true })
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [o, settings.data, params, setParams])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
    setTimeout(() => setCopied(false), 2500)
  }

  if (order.error) {
    return (
      <main className="px-4 py-8 md:px-8">
        <p className="text-muted">Order {id} was not found.</p>
        <Button to="/" variant="secondary" className="mt-4">
          Back to board
        </Button>
      </main>
    )
  }
  if (!o || !settings.data) return <main className="px-4 py-8 text-sm text-muted md:px-8">Loading…</main>

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-5 md:px-8 md:py-8">
      <h1 className="text-2xl font-bold tracking-tight text-navy">{o.type === 'home_pickup' ? 'Pickup scheduled' : 'Order created'}</h1>
      <p className="mt-1 text-sm text-muted">{subtitle(o)}</p>

      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ClaimSlip order={o} settings={settings.data} trackingUrl={url} />

        <Card as="section" className="flex flex-col gap-4 print:hidden">
          <h2 className="text-lg font-semibold text-navy">Tracking link</h2>

          {/* Rule 5: texts only when the customer must act. No text at drop-off. */}
          {text ? (
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <Badge tone="success">Sent</Badge>
              <span>
                Pickup confirmation sent to {formatMobile(text.to)} at {formatTime(text.at)}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <Badge tone="neutral">No text sent</Badge>
              <span>
                The customer gets a text with this link when the laundry is{' '}
                {o.returnMethod === 'home_delivery' ? 'out for delivery' : 'ready'}.
              </span>
            </div>
          )}

          <Input label="Tracking link" value={url} readOnly onFocus={(e) => e.target.select()} />

          <div className="flex flex-wrap gap-3">
            <Button icon={Printer} onClick={() => window.print()}>
              Print slip
            </Button>
            <Button variant="secondary" icon={copied === 'yes' ? Check : Copy} onClick={copyLink} aria-live="polite">
              {copied === 'yes' ? 'Copied' : copied === 'failed' ? 'Select the link to copy' : 'Copy tracking link'}
            </Button>
            <Button variant="secondary" to="/">
              Back to board
            </Button>
          </div>
          <p className="text-[13px] text-muted">The QR code on the slip opens the same link.</p>
        </Card>
      </div>
    </main>
  )
}
