import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Checkbox from '../components/Checkbox.jsx'
import Notice from '../components/Notice.jsx'
import { PaymentBadge } from '../components/Badge.jsx'
import { serviceSummary } from '../components/OrderRow.jsx'
import { markClaimed } from '../api/index.js'
import { PAYMENT_METHODS, canRelease, isPaid } from '../utils/orderRules.js'
import { formatPeso, orderTotal } from '../utils/pricing.js'
import { formatShortDate } from '../utils/format.js'
import { Caption, ErrorNotice, useSubmit } from './shared.jsx'

/** Rule 2: release only when paid in full. The button stays off until then. */
export default function MarkClaimedDialog({ order, user, onClose, onDone, onCollect }) {
  const [slipOk, setSlipOk] = useState(false)
  const [bagsOk, setBagsOk] = useState(false)
  const { busy, error, run } = useSubmit()
  const paid = isPaid(order)
  const allowed = canRelease(order)
  const method = PAYMENT_METHODS.find((m) => m.id === order.payment?.method)?.label
  const bags = order.bags ?? 1

  function submit() {
    run(async () => {
      await markClaimed(order.id, { by: user?.id })
      onDone(`${order.id} was released to ${order.customer?.name}.`)
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Release ${order.id} to ${order.customer?.name}?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Back
          </Button>
          <Button onClick={submit} disabled={busy || !allowed || !slipOk || !bagsOk}>
            Mark claimed
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">{serviceSummary(order)}</p>
        <PaymentBadge order={order} />
      </div>

      <dl className="flex flex-col gap-2 rounded-control bg-[#F3F5F6] p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{paid ? 'Paid' : 'Amount due'}</dt>
          <dd>
            {paid
              ? `${formatPeso(order.payment.amount)} · ${method} · ${formatShortDate(order.payment.paidAt)}`
              : formatPeso(orderTotal(order))}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Bags</dt>
          <dd>{bags}</dd>
        </div>
      </dl>

      {!paid && (
        <Notice tone="warning">
          Collect the full {formatPeso(orderTotal(order))} before releasing this order.
          {onCollect && (
            <>
              {' '}
              <button type="button" onClick={onCollect} className="font-semibold underline underline-offset-2">
                Record payment
              </button>
            </>
          )}
        </Notice>
      )}

      <fieldset className="flex flex-col">
        <legend className="mb-1 text-sm font-semibold">Check before handing over</legend>
        <Checkbox checked={slipOk} onChange={setSlipOk} disabled={!paid}>
          Customer showed the claim slip, or the name and mobile number match
        </Checkbox>
        <Checkbox checked={bagsOk} onChange={setBagsOk} disabled={!paid}>
          Bag count matches ({bags} {bags === 1 ? 'bag' : 'bags'})
        </Checkbox>
      </fieldset>

      <ErrorNotice error={error} />
      <Caption>This button stays off until the order is paid in full.</Caption>
    </Modal>
  )
}
