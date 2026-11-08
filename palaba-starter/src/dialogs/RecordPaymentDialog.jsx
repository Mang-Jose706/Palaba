import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Notice from '../components/Notice.jsx'
import SegmentedControl from '../components/SegmentedControl.jsx'
import { serviceSummary } from '../components/OrderRow.jsx'
import { recordPayment } from '../api/index.js'
import { PAYMENT_METHODS, canRecordPayment, isHomeDelivery } from '../utils/orderRules.js'
import { formatPeso, orderTotal } from '../utils/pricing.js'
import { Caption, ErrorNotice, useSubmit } from './shared.jsx'

/** Rule 2: record the FULL amount. The amount can't be edited. */
export default function RecordPaymentDialog({ order, user, onClose, onDone }) {
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [refError, setRefError] = useState('')
  const { busy, error, run } = useSubmit()
  const total = orderTotal(order)
  const allowed = canRecordPayment(order)

  function submit() {
    if (method !== 'cash' && !reference.trim()) {
      setRefError('Enter the reference number.')
      return
    }
    run(async () => {
      await recordPayment(order.id, { method, reference: reference.trim(), by: user?.id })
      onDone(`Recorded ${formatPeso(total)} for ${order.id}.`)
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !allowed}>
            Record {formatPeso(total)}
          </Button>
        </>
      }
    >
      <div className="flex justify-between gap-4 text-sm">
        <span className="font-semibold">
          {order.id} · {order.customer?.name}
        </span>
        <span className="text-right text-muted">{serviceSummary(order)}</span>
      </div>

      <div className="flex flex-col gap-0.5 rounded-control bg-[#EEF2F7] p-4">
        <span className="text-[13px] text-muted">Amount to collect</span>
        <span className="text-[28px] leading-9 font-bold">{formatPeso(total)}</span>
        <span className="text-[13px] text-muted">Full payment only</span>
      </div>

      {!allowed && (
        <Notice tone="warning">
          {order.payment ? 'This order is already paid.' : total == null ? 'Weigh the order first.' : 'This order cannot take a payment.'}
        </Notice>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium" id="pay-method">
          Method
        </span>
        <SegmentedControl
          label="Payment method"
          options={PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))}
          value={method}
          onChange={(v) => {
            setMethod(v)
            setRefError('')
          }}
        />
      </div>
      {method !== 'cash' && (
        <Input
          label="Reference number"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          error={refError}
          inputMode="numeric"
          data-autofocus
        />
      )}

      <ErrorNotice error={error} />
      <Caption>
        {isHomeDelivery(order)
          ? 'After recording, the order can be marked delivered.'
          : 'After recording, the order can be marked claimed.'}
      </Caption>
    </Modal>
  )
}
