import { ArrowRight } from 'lucide-react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Notice from '../components/Notice.jsx'
import { StatusBadge } from '../components/Badge.jsx'
import { changeStatus, isTextEnabled } from '../api/index.js'
import { canTransition, isHomeDelivery, isPaid, statusLabel } from '../utils/orderRules.js'
import { formatPeso, orderTotal } from '../utils/pricing.js'
import { ErrorNotice, orderLine, useSubmit } from './shared.jsx'

const COPY = {
  received: { title: (id) => `Mark ${id} received?`, confirm: 'Mark received' },
  in_progress: { title: (id) => `Start washing ${id}?`, confirm: 'Start washing' },
  ready: { title: (id) => `Mark ${id} ready?`, confirm: 'Mark ready' },
  out_for_delivery: { title: (id) => `Send ${id} out for delivery?`, confirm: 'Send out' },
}

/** What the customer will (or won't) be texted — rule 5. Never shows costs. */
function textNote(order, to) {
  switch (to) {
    case 'received':
      return isTextEnabled('order_received')
        ? 'The customer gets an "Order received" text.'
        : 'No text is sent now.'
    case 'in_progress':
      return isTextEnabled('washing_started')
        ? 'The customer gets a "Washing started" text.'
        : 'No text is sent now. The customer gets one text when the order is ready.'
    case 'ready':
      if (isHomeDelivery(order)) return 'No text is sent now. The customer gets a text when it is out for delivery.'
      return isTextEnabled('ready_for_pickup')
        ? 'The customer gets a text that it is ready, with the amount due and the tracking link.'
        : 'No text is sent (Ready texts are off in Settings).'
    case 'out_for_delivery':
      return isTextEnabled('out_for_delivery') ? 'The customer gets a text that it is on the way.' : 'No text is sent.'
    default:
      return ''
  }
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
