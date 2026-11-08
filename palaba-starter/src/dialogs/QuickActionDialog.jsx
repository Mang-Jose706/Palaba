// TEMPORARY stand-in for the real dialogs (Change status, Record payment,
// Mark claimed, Weigh pickup order), which are built from
// design/reference-html/ in step 6. It lets the Dashboard buttons work now.
// All rules are still enforced by the API layer.

import { useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import { serviceSummary } from '../components/OrderRow.jsx'
import { markClaimed, recordPayment, sendOutForDelivery, startWashing, weighOrder } from '../api/index.js'
import { PAYMENT_METHODS, canRelease } from '../utils/orderRules.js'
import { formatPeso, orderTotal } from '../utils/pricing.js'

const TITLES = {
  start_washing: 'Start washing?',
  send_out: 'Send out for delivery?',
  collect: 'Record payment',
  release: 'Mark claimed',
  weigh: 'Weigh pickup order',
}

/**
 * @param {{ action: { type: string, label: string } | null, order: object | null, onClose: () => void, onDone: (message: string) => void, user?: object }} props
 */
export default function QuickActionDialog({ action, order, onClose, onDone, user }) {
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [kg, setKg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMethod('cash')
    setReference('')
    setKg('')
    setError('')
    setBusy(false)
  }, [order?.id, action?.type])

  if (!action || !order) return <Modal open={false} onClose={onClose} title="" />

  const name = order.customer?.name ?? 'the customer'
  const total = orderTotal(order)
  const by = user?.id ?? null

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      switch (action.type) {
        case 'start_washing':
          await startWashing(order.id, { by })
          onDone(`${order.id} is now in progress.`)
          break
        case 'send_out':
          await sendOutForDelivery(order.id, { by })
          onDone(`${order.id} is out for delivery. ${name} was sent a text.`)
          break
        case 'collect':
          await recordPayment(order.id, { method, reference, by })
          onDone(`Recorded ${formatPeso(total)} for ${order.id}.`)
          break
        case 'release':
          await markClaimed(order.id, { by })
          onDone(`${order.id} was released to ${name}.`)
          break
        case 'weigh':
          await weighOrder(order.id, Number(kg), { by: 'staff' })
          onDone(`${order.id} weighed. ${order.paymentOption === 'after_weighing' ? `${name} was sent the amount due.` : ''}`)
          break
        default:
          break
      }
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const confirmLabel = {
    start_washing: 'Start washing',
    send_out: 'Send out',
    collect: `Record ${formatPeso(total)}`,
    release: 'Mark claimed',
    weigh: 'Save weight',
  }[action.type]

  return (
    <Modal
      open
      onClose={onClose}
      title={TITLES[action.type] ?? action.label}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Back
          </Button>
          <Button
            onClick={confirm}
            disabled={busy || (action.type === 'weigh' && !(Number(kg) > 0)) || (action.type === 'release' && !canRelease(order))}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex justify-between gap-4 text-sm">
        <span className="font-semibold">
          {order.id} · {name}
        </span>
        <span className="text-muted">{serviceSummary(order)}</span>
      </div>

      {action.type === 'start_washing' && (
        <p className="text-sm text-muted">Once washing starts, this order can no longer be cancelled.</p>
      )}

      {action.type === 'collect' && (
        <>
          <div className="flex flex-col gap-0.5 rounded-control bg-[#EEF2F7] p-4">
            <span className="text-[13px] text-muted">Amount to collect</span>
            <span className="text-[28px] leading-9 font-bold">{formatPeso(total)}</span>
            <span className="text-[13px] text-muted">Full payment only</span>
          </div>
          <Select
            label="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))}
          />
          {method !== 'cash' && (
            <Input label="Reference number" value={reference} onChange={(e) => setReference(e.target.value)} />
          )}
        </>
      )}

      {action.type === 'release' && (
        <p className="text-sm text-muted">Check the claim slip, or that the name and mobile number match, before handing over.</p>
      )}

      {action.type === 'weigh' && (
        <Input
          label="Weight"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          suffix="kg"
          hint="Rounded up to the whole kg."
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          data-autofocus
        />
      )}

      {error && (
        <p role="alert" className="rounded-control bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-muted">Temporary dialog. The full version is built in step 6.</p>
    </Modal>
  )
}
