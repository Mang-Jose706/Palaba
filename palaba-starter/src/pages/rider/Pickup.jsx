import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RiderShell from '../../components/RiderShell.jsx'
import Badge, { StatusBadge } from '../../components/Badge.jsx'
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
import { RIDER_PAYMENT_METHODS, completePickup, getRiderTrip, logRiderCall } from '../../api/index.js'
import { paymentOptionLabel, paymentOptionsFor } from '../../utils/orderRules.js'
import { formatPeso, orderPrice, roundKg, serviceLabel } from '../../utils/pricing.js'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-navy">{children}</dd>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <Card as="section" className="flex flex-col gap-3 p-4">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      {children}
    </Card>
  )
}

export default function Pickup() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const trip = useApiData(() => getRiderTrip(id, user.id), [id, user.id])
  const o = trip.data

  const [option, setOption] = useState(null)
  const [kg, setKg] = useState('')
  const [method, setMethod] = useState('cash')
  const [bags, setBags] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (trip.error) {
    return (
      <RiderShell title={`Pickup · ${id}`}>
        <Notice tone="danger">{trip.error.message}</Notice>
      </RiderShell>
    )
  }
  if (!o) {
    return (
      <RiderShell title={`Pickup · ${id}`}>
        <p className="text-sm text-muted">Loading…</p>
      </RiderShell>
    )
  }

  const paymentOption = option ?? o.paymentOption
  const options = paymentOptionsFor('home_pickup', o.returnMethod)
  const atDoor = paymentOption === 'at_the_door'
  const weighHere = atDoor || paymentOption === 'on_delivery'
  const billable = roundKg(kg)
  // Price always from computePrice (via orderPrice) — rule 1.
  const price = orderPrice({ ...o, kg: weighHere ? billable : null })
  const done = o.status !== 'pickup_scheduled'

  async function submit() {
    setError('')
    if (atDoor && !billable) return setError('Enter the weight from the hanging scale.')
    setBusy(true)
    try {
      await completePickup(o.id, {
        riderId: user.id,
        paymentOption,
        kg: weighHere && billable ? Number(kg) : undefined,
        method: atDoor ? method : undefined,
        bags: bags === '' ? undefined : Number(bags),
        note,
      })
      navigate('/rider', {
        state: { message: atDoor ? `${o.id} picked up. ${formatPeso(price.total)} recorded.` : `${o.id} picked up.` },
      })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <RiderShell title={`Pickup · ${o.id}`}>
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={o.status} />
        <Badge tone="neutral">{o.pickup?.window}</Badge>
      </div>

      <ContactCard
        customer={o.customer}
        address={o.pickup?.address}
        landmark={o.pickup?.landmark}
        onCall={() => logRiderCall(o.id, user.id)}
      />

      <Section title="Order">
        <dl className="flex flex-col gap-2.5">
          <Row label="Service">{serviceLabel(o.service)}</Row>
          <Row label="After washing">{o.returnMethod === 'home_delivery' ? 'Deliver back home' : 'Customer picks up at the shop'}</Row>
          <Row label="Customer chose">Pay {paymentOptionLabel(o.paymentOption).toLowerCase()}</Row>
          {o.notes && <Row label="Notes">{o.notes}</Row>}
        </dl>
      </Section>

      {done ? (
        <Notice tone="success">This pickup is done.</Notice>
      ) : (
        <>
          <Section title="How will the customer pay?">
            <SegmentedControl
              label="How will the customer pay?"
              options={paymentOptionsFor('home_pickup', 'home_delivery').map((p) => ({
                value: p.id,
                label: p.label,
                disabled: !options.some((x) => x.id === p.id),
              }))}
              value={paymentOption}
              onChange={setOption}
            />
            <p className="text-[13px] text-muted">Ask the customer again before weighing. They can still switch.</p>
          </Section>

          {weighHere ? (
            <Section title={atDoor ? 'Weigh and collect' : 'Weigh (optional)'}>
              <Input
                label="Weight on the hanging scale (kg)"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                suffix="kg"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                hint={billable && billable !== Number(kg) ? `Billed as ${billable} kg (rounded up)` : undefined}
                className="[&_input]:text-lg"
              />
              {billable ? (
                <PriceLines
                  price={price}
                  service={o.service}
                  sessionPrice={o.rates?.sessionPrice ?? 0}
                  totalLabel={atDoor ? 'Collect now' : 'Customer pays on delivery'}
                />
              ) : (
                <p className="text-sm text-muted">Enter the weight to see the amount.</p>
              )}
              {atDoor && (
                <SegmentedControl
                  label="Payment method"
                  options={RIDER_PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))}
                  value={method}
                  onChange={setMethod}
                />
              )}
              <Notice tone="info">The weight taken here is final. Staff re-check it at the shop and add a note if it differs.</Notice>
            </Section>
          ) : (
            <Notice tone="info">Don’t weigh it here. Staff weigh it at the shop and text the customer the amount due.</Notice>
          )}

          <Section title="Bags">
            <Input
              label="Number of bags"
              type="number"
              inputMode="numeric"
              min="1"
              placeholder={String(o.bags ?? 1)}
              value={bags}
              onChange={(e) => setBags(e.target.value)}
            />
            <Input label="Note for the shop (optional)" placeholder="Stains, delicate items, missing items" value={note} onChange={(e) => setNote(e.target.value)} />
          </Section>

          {error && (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          )}

          <Button fullWidth onClick={submit} disabled={busy || (atDoor && !billable)} className="min-h-12">
            {atDoor ? (billable ? `Record ${formatPeso(price.total)} and mark picked up` : 'Enter the weight to continue') : 'Mark picked up'}
          </Button>
          <Link
            to={`/rider/pickup/${o.id}/not-done`}
            className={cx('flex min-h-control-mobile items-center justify-center rounded-control text-[15px] font-semibold text-muted hover:text-navy', focusRing)}
          >
            Pickup not done
          </Link>
        </>
      )}
    </RiderShell>
  )
}
