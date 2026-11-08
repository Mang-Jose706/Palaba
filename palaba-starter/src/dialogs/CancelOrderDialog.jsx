import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Checkbox from '../components/Checkbox.jsx'
import Input from '../components/Input.jsx'
import Notice from '../components/Notice.jsx'
import { StatusBadge } from '../components/Badge.jsx'
import { cx } from '../components/cx.js'
import { cancelOrder } from '../api/index.js'
import { CANNOT_CANCEL_MESSAGE, PAYMENT_METHODS, canCancel } from '../utils/orderRules.js'
import { formatPeso } from '../utils/pricing.js'
import { Caption, ErrorNotice, orderLine, useSubmit } from './shared.jsx'

const REASONS = ['Customer changed their mind', 'Entered by mistake', 'Duplicate order', 'Other']

/**
 * Rule 4: cancel only before washing starts (pickup scheduled or received). A prepaid order needs the money
 * returned first. No cancellation text is sent (rule 5: texts only when the
 * customer must act).
 */
export default function CancelOrderDialog({ order, user, onClose, onDone }) {
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')
  const [refunded, setRefunded] = useState(false)
  const { busy, error, run } = useSubmit()
  const allowed = canCancel(order)
  const paid = order.payment
  const method = PAYMENT_METHODS.find((m) => m.id === paid?.method)?.label
  const needsNote = reason === 'Other' && !note.trim()

  function submit() {
    run(async () => {
      await cancelOrder(order.id, { reason: reason === 'Other' ? `Other: ${note.trim()}` : reason, note, refunded, by: user?.id })
      onDone(`${order.id} was cancelled.`)
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Cancel order ${order.id}?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep order
          </Button>
          {allowed && (
            <Button variant="dangerSolid" onClick={submit} disabled={busy || needsNote || (paid && !refunded)}>
              Cancel order
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">{orderLine(order)}</p>
        <StatusBadge status={order.status} />
      </div>

      {!allowed ? (
        <Notice tone="danger">{CANNOT_CANCEL_MESSAGE}</Notice>
      ) : (
        <>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] font-medium">Reason</legend>
            <div className="divide-y divide-line overflow-hidden rounded-control border border-line">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className={cx(
                    'flex min-h-control cursor-pointer items-center gap-3 px-3 text-sm max-md:min-h-control-mobile',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-inset',
                    reason === r ? 'bg-tint font-medium' : 'hover:bg-bg',
                  )}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="size-4.5 accent-accent"
                  />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>

          <Input
            label={reason === 'Other' ? 'Note' : 'Note (optional)'}
            placeholder="Add details for the record"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {paid && (
            <>
              <Notice tone="warning">
                This order was paid in advance:{' '}
                <strong>
                  {formatPeso(paid.amount)} · {method}
                </strong>
                . Return the money before cancelling.
              </Notice>
              <Checkbox checked={refunded} onChange={setRefunded}>
                I returned {formatPeso(paid.amount)} to the customer
              </Checkbox>
            </>
          )}
        </>
      )}

      <ErrorNotice error={error} />
      <Caption>Orders can be cancelled only before washing starts.</Caption>
    </Modal>
  )
}
