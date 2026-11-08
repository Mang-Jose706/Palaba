import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MessageSquareText } from 'lucide-react'
import BackLink from '../components/BackLink.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import ChoiceCards from '../components/ChoiceCards.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import SegmentedControl from '../components/SegmentedControl.jsx'
import PriceLines from '../components/PriceLines.jsx'
import useApiData from '../components/useApiData.js'
import { useAuth } from '../components/AuthProvider.jsx'
import { createOrder, findCustomerByMobile, getSettings, listRiders } from '../api/index.js'
import { SERVICES, computePrice, formatPeso, roundKg } from '../utils/pricing.js'
import { PAYMENT_METHODS, paymentOptionsFor } from '../utils/orderRules.js'
import { formatMobile, fromDateKey, isValidMobile, upcomingDays } from '../utils/format.js'

const TYPES = [
  { value: 'drop_off', label: 'Drop-off at the shop' },
  { value: 'home_pickup', label: 'Home pickup' },
]

const RETURN_METHODS = [
  { value: 'home_delivery', label: 'Deliver back home' },
  { value: 'shop_pickup', label: 'Customer picks up at the shop' },
]

// Promised pickup times for drop-offs: 8:00 AM – 8:00 PM, every hour.
const PROMISE_TIMES = Array.from({ length: 13 }, (_, i) => {
  const h = 8 + i
  const label = `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`
  return { value: String(h), label }
})

const PAYMENT_HELP = {
  at_the_door: 'the rider weighs the laundry and collects the full amount. That weight is final.',
  after_weighing: 'staff weigh it at the shop, and the customer pays by GCash or Maya.',
  on_delivery: 'the rider collects the full amount before handing over the laundry.',
}

function SectionCard({ title, children }) {
  return (
    <Card as="section" className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      {children}
    </Card>
  )
}

export default function NewOrder() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const type = params.get('type') === 'pickup' ? 'home_pickup' : 'drop_off'
  const isPickup = type === 'home_pickup'

  const settings = useApiData(() => getSettings(), [])
  const riders = useApiData(() => listRiders({ activeOnly: true }), [])
  const days = useMemo(() => upcomingDays(7), [])

  // Customer
  const [mobile, setMobile] = useState('')
  const [name, setName] = useState('')
  const [returning, setReturning] = useState(null)
  // Service
  const [service, setService] = useState('wash_dry_fold')
  const [kg, setKg] = useState('')
  // Drop-off
  const [promiseDay, setPromiseDay] = useState(days[1].value)
  const [promiseTime, setPromiseTime] = useState('16')
  const [notes, setNotes] = useState('')
  // Home pickup
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [pickupDay, setPickupDay] = useState(days[0].value)
  const [pickupWindow, setPickupWindow] = useState('')
  const [returnMethod, setReturnMethod] = useState('home_delivery')
  const [riderId, setRiderId] = useState('')
  // Payment
  const [paymentOption, setPaymentOption] = useState('pay_now')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')

  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const s = settings.data
  const windows = s?.pickupWindows ?? []
  const options = useMemo(() => paymentOptionsFor(type, returnMethod), [type, returnMethod])

  // Defaults that depend on loaded data / the chosen tab.
  useEffect(() => {
    if (!pickupWindow && windows.length) setPickupWindow(windows[0])
  }, [windows, pickupWindow])
  useEffect(() => {
    if (!riderId && riders.data?.length) setRiderId(riders.data[0].id)
  }, [riders.data, riderId])
  useEffect(() => {
    // Keep the payment choice valid for the tab and the return method.
    if (!options.some((o) => o.id === paymentOption)) setPaymentOption(options[0].id)
  }, [options, paymentOption])

  // Returning customer: fill in what we already know.
  useEffect(() => {
    if (!isValidMobile(mobile)) {
      setReturning(null)
      return
    }
    let alive = true
    findCustomerByMobile(mobile).then((c) => {
      if (!alive) return
      setReturning(c)
      if (c) {
        setName((n) => n || c.name)
        setAddress((a) => a || c.address || '')
        setLandmark((l) => l || c.landmark || '')
      }
    })
    return () => {
      alive = false
    }
  }, [mobile])

  // Live price (rule 1: always from computePrice).
  const sessionPrice = s?.prices?.[service] ?? 0
  const price = computePrice({
    kg: isPickup ? null : kg,
    sessionPrice,
    pickup: isPickup,
    delivery: isPickup && returnMethod === 'home_delivery',
    pickupFee: s?.pickupFee ?? 0,
    deliveryFee: s?.deliveryFee ?? 0,
  })
  const billableKg = roundKg(kg)

  function switchType(next) {
    setParams(next === 'home_pickup' ? { type: 'pickup' } : {}, { replace: true })
    setErrors({})
    setFormError('')
  }

  function validate() {
    const e = {}
    if (!isValidMobile(mobile)) e.mobile = 'Enter an 11-digit mobile number starting with 09.'
    if (!name.trim()) e.name = 'Enter the customer name.'
    if (!isPickup && !billableKg) e.kg = 'Enter the weight.'
    if (isPickup && !address.trim()) e.address = 'Enter the pickup address.'
    if (isPickup && !riderId) e.riderId = 'Choose a rider.'
    if (!isPickup && paymentOption === 'pay_now' && method !== 'cash' && !reference.trim()) {
      e.reference = 'Enter the reference number.'
    }
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    setFormError('')
    if (Object.keys(e).length) {
      setFormError('Please fix the highlighted fields.')
      return
    }
    setBusy(true)
    try {
      const base = {
        type,
        customerId: returning?.id,
        customer: returning ? undefined : { name, mobile, address, landmark },
        service,
        paymentOption,
        notes: notes.trim(),
        by: user?.id,
      }
      let order
      if (isPickup) {
        order = await createOrder({
          ...base,
          returnMethod,
          riderId,
          pickup: { date: pickupDay, window: pickupWindow, address: address.trim(), landmark: landmark.trim() },
        })
      } else {
        const promised = fromDateKey(promiseDay)
        promised.setHours(Number(promiseTime), 0, 0, 0)
        order = await createOrder({
          ...base,
          kg: Number(kg),
          returnMethod: 'shop_pickup',
          promisedAt: promised.toISOString(),
          payment: paymentOption === 'pay_now' ? { method, reference: reference.trim() } : undefined,
        })
      }
      navigate(`/orders/${order.id}/created${isPickup ? '' : '?print=1'}`)
    } catch (err) {
      setFormError(err.message)
      setBusy(false)
    }
  }

  const serviceOptions = Object.values(SERVICES).map((svc) => ({
    value: svc.id,
    title: svc.label,
    caption: `${formatPeso(s?.prices?.[svc.id])} per session`,
  }))

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-5 md:px-8 md:py-8">
      <BackLink />
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy">New order</h1>

      <SegmentedControl
        label="Order type"
        options={TYPES}
        value={type}
        onChange={switchType}
        size="lg"
        className="mt-5 max-w-[420px] [&>button]:min-h-10"
      />

      <form onSubmit={handleSubmit} noValidate className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Left: details ─────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionCard title="Customer">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Mobile number"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="0917 555 0142"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                onBlur={() => isValidMobile(mobile) && setMobile(formatMobile(mobile))}
                error={errors.mobile}
                hint={returning ? `Returning customer · ${returning.orderCount} ${returning.orderCount === 1 ? 'order' : 'orders'}` : undefined}
              />
              <Input
                label="Customer name"
                autoComplete="off"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />
            </div>
          </SectionCard>

          {isPickup && (
            <SectionCard title="Pickup address">
              <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} placeholder="House no., street, barangay" />
              <Input label="Landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near the chapel, blue gate" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Pickup date" value={pickupDay} onChange={(e) => setPickupDay(e.target.value)} options={days} />
                <Select label="Time window" value={pickupWindow} onChange={(e) => setPickupWindow(e.target.value)} options={windows} />
              </div>
            </SectionCard>
          )}

          <SectionCard title="Service requested">
            <ChoiceCards label="Service" options={serviceOptions} value={service} onChange={setService} />
            {!isPickup && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Weight (kg)"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  suffix="kg"
                  placeholder="0"
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  error={errors.kg}
                  hint={billableKg && billableKg !== Number(kg) ? `Billed as ${billableKg} kg (rounded up)` : 'Rounded up to the whole kg'}
                />
              </div>
            )}
          </SectionCard>

          {isPickup ? (
            <SectionCard title="After washing">
              <SegmentedControl label="After washing" options={RETURN_METHODS} value={returnMethod} onChange={setReturnMethod} size="lg" />
              <Select
                label="Assign rider"
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
                error={errors.riderId}
                placeholder={riders.data?.length ? undefined : 'No active riders'}
                options={(riders.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
              />
              <Input label="Notes for staff (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Handle the white shirts separately" />
            </SectionCard>
          ) : (
            <SectionCard title="Promised pickup">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Date" value={promiseDay} onChange={(e) => setPromiseDay(e.target.value)} options={days} />
                <Select label="Time" value={promiseTime} onChange={(e) => setPromiseTime(e.target.value)} options={PROMISE_TIMES} />
              </div>
              <Input label="Notes for staff (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Handle the white shirts separately" />
            </SectionCard>
          )}
        </div>

        {/* ── Right: summary, payment, submit ───────────── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <SectionCard title={isPickup ? 'Charges' : 'Order summary'}>
            {!isPickup && !billableKg ? (
              <p className="text-sm text-muted">Enter the weight to see the price.</p>
            ) : (
              <PriceLines price={price} service={service} sessionPrice={sessionPrice} />
            )}
          </SectionCard>

          <SectionCard title="When will the customer pay?">
            <SegmentedControl
              label="When will the customer pay?"
              options={paymentOptionsFor(type, 'home_delivery').map((o) => ({
                value: o.id,
                label: o.label,
                disabled: !options.some((x) => x.id === o.id),
              }))}
              value={paymentOption}
              onChange={setPaymentOption}
            />

            {isPickup ? (
              <div className="flex flex-col gap-3 text-[13px] leading-5 text-muted">
                {paymentOptionsFor(type, 'home_delivery').map((o) => (
                  <p key={o.id} className={paymentOption === o.id ? 'text-navy' : undefined}>
                    <span className="font-semibold text-navy">{o.label}:</span> {PAYMENT_HELP[o.id]}
                  </p>
                ))}
                {returnMethod === 'shop_pickup' && (
                  <p className="text-xs">On delivery is only for orders delivered back home.</p>
                )}
              </div>
            ) : (
              <>
                {paymentOption === 'pay_now' && (
                  <>
                    <Select
                      label="Method"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      options={PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))}
                    />
                    {method !== 'cash' && (
                      <Input label="Reference number" value={reference} onChange={(e) => setReference(e.target.value)} error={errors.reference} />
                    )}
                  </>
                )}
                <div className="mt-2 flex justify-between border-t border-line pt-3 font-semibold">
                  <span>{paymentOption === 'pay_now' ? 'Collect now' : 'Due at pickup'}</span>
                  <span>{price.total == null ? '—' : formatPeso(price.total)}</span>
                </div>
                <p className="text-xs text-muted">Full payment only.</p>
              </>
            )}
          </SectionCard>

          {isPickup && s?.texts?.pickup_scheduled && (
            <div className="flex gap-3 rounded-card bg-info-bg p-4 text-[13px] leading-5 text-navy">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-info-fg" aria-hidden="true" />
              <div>
                <p className="font-semibold text-info-fg">Automatic SMS</p>
                <p>
                  The customer gets a text now confirming the pickup time.
                  {paymentOption === 'after_weighing' && ' Because they pay after weighing, they also get a text with the amount due.'}
                </p>
              </div>
            </div>
          )}

          {formError && (
            <p role="alert" className="rounded-control bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth disabled={busy || settings.loading} className="min-h-12">
            {busy ? 'Saving…' : isPickup ? 'Schedule pickup' : 'Create order and print slip'}
          </Button>
          {!isPickup && (
            <p className="text-center text-xs text-muted">No text is sent now. The customer gets a text when the laundry is ready.</p>
          )}
        </div>
      </form>
    </main>
  )
}
