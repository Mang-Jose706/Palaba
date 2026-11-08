import { ArrowRight } from 'lucide-react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Notice from '../components/Notice.jsx'
import { StatusBadge } from '../components/Badge.jsx'
import { changeStatus, textToSend } from '../api/index.js'
import { canTransition, isHomeDelivery, isPaid, statusLabel } from '../utils/orderRules.js'
import { formatPeso, orderTotal } from '../utils/pricing.js'
import { ErrorNotice, orderLine, useSubmit } from './shared.jsx'

const COPY = {
  received: { title: (id) => `Mark ${id} received?`, confirm: 'Mark received' },
  in_progress: { title: (id) => `Start washing ${id}?`, confirm: 'Start washing' },
  ready: { title: (id) => `Mark ${id} ready?`, confirm: 'Mark ready' },
  out_for_delivery: { title: (id) => `Send ${id} out for delivery?`, confirm: 'Send out' },
}

/** What the customer will (or won't) be texted — decided by the API's rule 5 helper. Never shows costs. */
const TEXT_NOTE = {
  order_received: 'The customer gets an "Order received" text.',
  washing_started: 'The customer gets a "Washing started" text.',
  ready_for_pickup: 'The customer gets a text that it is ready, with the amount due and the tracking link.',
  out_for_delivery: 'The customer gets a text that it is on the way.',
}

function textNote(order, to) {
  const kind = textToSend(order, to)
  if (kind) return TEXT_NOTE[kind]
  // The one text this order will get later (ready, or out for delivery).
  const delivery = isHomeDelivery(order)
  const laterStep = delivery ? 'out_for_delivery' : 'ready'
  if (to !== laterStep && textToSend(order, laterStep)) {
    return `No text is sent now. The customer gets one text when ${delivery ? 'it is out for delivery' : 'the order is ready'}.`
  }
  return 'No text is sent.'
}

/**
 * Move an order one step forward (rule 3). Claimed/Delivered/Cancelled have
 * their own dialogs (Mark claimed, Cancel order).
 */
export default function ChangeStatusDialog({ order, to, user, onClose, onDone }) {
  const { busy, error, run } = useSubmit()
  const copy = COPY[to] ?? { title: (id) => `Change ${id} to ${statusLabel(to)}?`, confirm: 'Confirm' }
  const allowed = canTransition(order, to)

  function submit() {
    run(async () => {
      await changeStatus(order.id, to, { by: user?.id })
      onDone(`${order.id} is now ${statusLabel(to).toLowerCase()}.`)
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={copy.title(order.id)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Not yet
          </Button>
          <Button onClick={submit} disabled={busy || !allowed}>
            {copy.confirm}
          </Button>
        </>
      }
    >
      <p className="text-sm font-semibold">{orderLine(order)}</p>

      <div className="flex items-center gap-3 rounded-control bg-[#F3F5F6] p-4">
        <StatusBadge status={order.status} />
        <ArrowRight className="size-4 text-muted" aria-label="to" />
        <StatusBadge status={to} />
      </div>

      {!allowed && <Notice tone="danger">This order can’t move to {statusLabel(to)} right now.</Notice>}
      {to === 'in_progress' && allowed && <Notice tone="warning">After this, the order can no longer be cancelled.</Notice>}
      {to === 'out_for_delivery' && !isPaid(order) && (
        <Notice tone="warning">
          The rider must collect the full {formatPeso(orderTotal(order))} before handing over the laundry.
        </Notice>
      )}

      <p className="text-[13px] text-muted">{textNote(order, to)}</p>
      <ErrorNotice error={error} />
    </Modal>
  )
}
