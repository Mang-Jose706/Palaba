import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RiderShell from '../../components/RiderShell.jsx'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import Input from '../../components/Input.jsx'
import Notice from '../../components/Notice.jsx'
import SegmentedControl from '../../components/SegmentedControl.jsx'
import { cx } from '../../components/cx.js'
import useApiData from '../../components/useApiData.js'
import { useAuth } from '../../components/AuthProvider.jsx'
import { useConfirm } from '../../components/ConfirmProvider.jsx'
import { getRiderTrip, reportTripProblem } from '../../api/index.js'
import { formatTime, toDateKey } from '../../utils/format.js'

const REASONS = {
  pickup: ['Customer not home', 'Not answering calls', 'Can’t find the address', 'Customer cancelled', 'Other'],
  delivery: ['Customer not home', 'Not answering calls', 'Can’t find the address', 'Customer can’t pay now', 'Other'],
}

/**
 * "Pickup not done" (and "Customer not home" for deliveries): the rider
 * reports what happened. Per rule 5 no text goes to the customer; the shop
 * sees the report on the order and contacts them.
 */
export default function PickupNotDone({ trip: tripType = 'pickup' }) {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const trip = useApiData(() => getRiderTrip(id, user.id), [id, user.id])
  const o = trip.data
  const reasons = REASONS[tripType]
  const [reason, setReason] = useState(reasons[0])
  const [nextStep, setNextStep] = useState('try_later')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()
  const title = `${tripType === 'pickup' ? 'Pickup' : 'Delivery'} not done · ${id}`

  if (!o) {
    return (
      <RiderShell title={title} back={`/rider/${tripType}/${id}`}>
        {trip.error ? <Notice tone="danger">{trip.error.message}</Notice> : <p className="text-sm text-muted">Loading…</p>}
      </RiderShell>
    )
  }

  const callsToday = (o.calls ?? []).filter((c) => toDateKey(c.at) === toDateKey(new Date()))
  const needsNote = reason === 'Other' && !note.trim()

  async function submit() {
    const ok = await confirm({
      title: `Report ${o.id} as not done?`,
      message: `“${reason === 'Other' ? note.trim() : reason}” · ${nextStep === 'try_later' ? 'you’ll try again later today' : 'the shop will call the customer'}. The shop sees this right away.`,
      confirmLabel: 'Report',
      tone: 'warning',
    })
    if (!ok) return
    setError('')
    setBusy(true)
    try {
      await reportTripProblem(o.id, {
        riderId: user.id,
        reason: reason === 'Other' ? `Other: ${note.trim()}` : reason,
        nextStep,
        note,
      })
      navigate('/rider', { state: { message: `Reported ${o.id}. The shop will follow up.` } })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <RiderShell title={title} back={`/rider/${tripType}/${id}`}>
      <Card className="p-4">
        <p className="font-semibold text-navy">{o.customer?.name}</p>
        <p className="text-[13px] text-muted">
          {[o.pickup?.address ?? o.customer?.address, o.pickup?.landmark ?? o.customer?.landmark].filter(Boolean).join(' · ')}
        </p>
      </Card>

      <fieldset className="flex flex-col">
        <legend className="mb-2 text-[13px] font-medium text-navy">What happened?</legend>
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {reasons.map((r) => (
            <label
              key={r}
              className={cx(
                'flex min-h-control-mobile cursor-pointer items-center gap-3 px-4 text-[15px]',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-inset',
                reason === r ? 'bg-tint font-medium' : 'hover:bg-bg',
              )}
            >
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-5 accent-accent" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="rounded-control bg-[#EEF2F7] px-3 py-2.5 text-[13px] text-navy">
        Calls made from this app today: <strong>{callsToday.length}</strong>
        {callsToday.length > 0 && ` (${callsToday.map((c) => formatTime(c.at)).join(', ')})`}
      </p>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-navy">What next?</span>
        <SegmentedControl
          label="What next?"
          size="lg"
          options={[
            { value: 'try_later', label: 'Try later today' },
            { value: 'shop_will_call', label: 'Shop will call' },
          ]}
          value={nextStep}
          onChange={setNextStep}
        />
      </div>

      <Input
        label={reason === 'Other' ? 'Note for the shop' : 'Note for the shop (optional)'}
        placeholder="Gate locked, neighbor said back at 5"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <Notice tone="info">The shop sees this right away and will contact the customer. No text is sent from here.</Notice>

      {error && (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      )}

      <Button fullWidth onClick={submit} disabled={busy || needsNote} className="min-h-12">
        Report and back to trips
      </Button>
    </RiderShell>
  )
}
