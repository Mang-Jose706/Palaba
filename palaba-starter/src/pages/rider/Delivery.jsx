import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RiderShell from '../../components/RiderShell.jsx'
import { PaymentBadge, StatusBadge } from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import ContactCard from '../../components/ContactCard.jsx'
import Input from '../../components/Input.jsx'
import Notice from '../../components/Notice.jsx'
import PriceLines from '../../components/PriceLines.jsx'
import SegmentedControl from '../../components/SegmentedControl.jsx'
import { cx, focusRing } from '../../components/cx.js'
import useApiData from '../../components/useApiData.js'
import { useAuth } from '../../components/AuthProvider.jsx'
import { RIDER_PAYMENT_METHODS, completeDelivery, getRiderTrip, logRiderCall, recordDeliveryPayment } from '../../api/index.js'
import { PAYMENT_METHODS, canDeliver, isPaid } from '../../utils/orderRules.js'
import { formatPeso, orderPrice } from '../../utils/pricing.js'

export default function Delivery() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const trip = useApiData(() => getRiderTrip(id, user.id), [id, user.id])
  const o = trip.data
  const [method, setMethod] = useState('cash')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!o) {
    return (
      <RiderShell title={`Delivery · ${id}`}>
        {trip.error ? <Notice tone="danger">{trip.error.message}</Notice> : <p className="text-sm text-muted">Loading…</p>}
      </RiderShell>
    )
  }

  const price = orderPrice(o)
  const paid = isPaid(o)
  const paidMethod = PAYMENT_METHODS.find((m) => m.id === o.payment?.method)?.label

  async function run(fn) {
    setError('')
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <RiderShell title={`Delivery · ${o.id}`}>
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={o.status} />
        <PaymentBadge order={o} />
      </div>

      <ContactCard
        customer={o.customer}
        address={o.pickup?.address ?? o.customer?.address}
        landmark={o.pickup?.landmark ?? o.customer?.landmark}
        onCall={() => logRiderCall(o.id, user.id)}
      />

      <Card as="section" className="flex flex-col gap-3 p-4">
        <h2 className="text-base font-semibold text-navy">{paid ? 'Payment' : 'Amount to collect'}</h2>
        <PriceLines price={price} service={o.service} sessionPrice={o.rates?.sessionPrice ?? 0} totalLabel={paid ? 'Total' : 'Collect'} />
        {paid ? (
          <Notice tone="success">
            Paid · {formatPeso(o.payment.amount)} · {paidMethod}. Hand over the laundry.
          </Notice>
        ) : (
          <Notice tone="warning">Collect the full {formatPeso(price.total)} before handing over the laundry.</Notice>
        )}
      </Card>

      {!paid && o.status === 'out_for_delivery' && (
        <Card as="section" className="flex flex-col gap-3 p-4">
          <h2 className="text-base font-semibold text-navy">Record payment</h2>
          <SegmentedControl
            label="Payment method"
            options={RIDER_PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))}
            value={method}
            onChange={setMethod}
          />
          {/* Rule 2: full payment only — the amount can't be changed. */}
          <Input label="Amount received" value={formatPeso(price.total)} readOnly hint="Full amount only. No partial payments." />
          <Button variant="secondary" fullWidth disabled={busy} onClick={() => run(() => recordDeliveryPayment(o.id, { riderId: user.id, method }))}>
            Record {formatPeso(price.total)}
          </Button>
        </Card>
      )}

      {error && (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      )}

      {o.status === 'delivered' ? (
        <Notice tone="success">Delivered.</Notice>
      ) : (
        <>
          {/* Rule 2: never Delivered while unpaid. */}
          <Button
            fullWidth
            className="min-h-12 disabled:bg-none disabled:bg-[#E5E9EC] disabled:text-muted disabled:opacity-100"
            disabled={busy || !canDeliver(o)}
            onClick={() =>
              run(async () => {
                await completeDelivery(o.id, { riderId: user.id })
                navigate('/rider', { state: { message: `${o.id} delivered.` } })
              })
            }
          >
            Mark delivered
          </Button>
          {!paid && <p className="-mt-2 text-center text-[13px] text-muted">Unlocks after the full amount is recorded.</p>}
          <Link
            to={`/rider/delivery/${o.id}/not-done`}
            className={cx('flex min-h-control-mobile items-center justify-center rounded-control text-[15px] font-semibold text-muted hover:text-navy', focusRing)}
          >
            Customer not home
          </Link>
        </>
      )}
    </RiderShell>
  )
}
