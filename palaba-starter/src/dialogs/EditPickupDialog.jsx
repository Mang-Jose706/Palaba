import { useMemo, useState } from 'react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Notice from '../components/Notice.jsx'
import Select from '../components/Select.jsx'
import useApiData from '../components/useApiData.js'
import { getSettings, listRiders, updateOrder } from '../api/index.js'
import { canChangeRider, canReschedulePickup, openTripIssue } from '../utils/orderRules.js'
import { upcomingDays } from '../utils/format.js'
import { ErrorNotice, useSubmit } from './shared.jsx'

/**
 * Reschedule a home pickup (date, window, address) and/or change the rider.
 * Used after a rider reports "Pickup not done", or to reassign a delivery.
 */
export default function EditPickupDialog({ order, onClose, onDone }) {
  const settings = useApiData(() => getSettings(), [])
  const riders = useApiData(() => listRiders({ activeOnly: true }), [])
  const days = useMemo(() => upcomingDays(7), [])
  const reschedule = canReschedulePickup(order)
  const [date, setDate] = useState(order.pickup?.date && order.pickup.date >= days[0].value ? order.pickup.date : days[0].value)
  const [window, setWindow] = useState(order.pickup?.window ?? '')
  const [address, setAddress] = useState(order.pickup?.address ?? '')
  const [landmark, setLandmark] = useState(order.pickup?.landmark ?? '')
  const [riderId, setRiderId] = useState(order.riderId ?? '')
  const { busy, error, run } = useSubmit()
  const issue = openTripIssue(order)
  const windows = settings.data?.pickupWindows ?? []

  function submit() {
    run(async () => {
      const patch = {}
      if (reschedule) patch.pickup = { date, window: window || windows[0], address, landmark }
      if (canChangeRider(order) && riderId && riderId !== order.riderId) patch.riderId = riderId
      await updateOrder(order.id, patch)
      onDone(reschedule ? `${order.id} pickup updated.` : `${order.id} rider changed.`)
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={reschedule ? `Reschedule pickup ${order.id}` : `Change rider for ${order.id}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || (reschedule && !address.trim())}>
            Save
          </Button>
        </>
      }
    >
      {issue && (
        <Notice tone="warning">
          Rider reported: {issue.reason}
          {issue.note && !issue.reason.includes(issue.note) ? ` · “${issue.note}”` : ''}
        </Notice>
      )}
      {reschedule && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Pickup date" value={date} onChange={(e) => setDate(e.target.value)} options={days} />
            <Select
              label="Time window"
              value={window || windows[0] || ''}
              onChange={(e) => setWindow(e.target.value)}
              options={windows.includes(window) || !window ? windows : [window, ...windows]}
            />
          </div>
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="Landmark (optional)" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
        </>
      )}
      {canChangeRider(order) && (
        <Select
          label="Rider"
          value={riderId}
          onChange={(e) => setRiderId(e.target.value)}
          options={(riders.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
        />
      )}
      <p className="text-[13px] text-muted">No text is sent from here. Call the customer to confirm the new time.</p>
      <ErrorNotice error={error} />
    </Modal>
  )
}
