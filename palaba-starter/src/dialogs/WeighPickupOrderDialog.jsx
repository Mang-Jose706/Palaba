import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Notice from '../components/Notice.jsx'
import Badge from '../components/Badge.jsx'
import PriceLines from '../components/PriceLines.jsx'
import { isTextEnabled, previewOrderText, weighOrder } from '../api/index.js'
import { canWeigh, paymentOptionLabel } from '../utils/orderRules.js'
import { orderPrice, roundKg, serviceLabel } from '../utils/pricing.js'
import { formatTime } from '../utils/format.js'
import { ErrorNotice, useSubmit } from './shared.jsx'

/**
 * Staff weigh a home-pickup order at the shop. Price comes from computePrice
 * (via orderPrice). Rule 8: a weight the rider took at the door is final.
 */
export default function WeighPickupOrderDialog({ order, onClose, onDone }) {
  const [kg, setKg] = useState('')
  const { busy, error, run } = useSubmit()
  const allowed = canWeigh(order)
  const preview = { ...order, kg: Number(kg) || null }
  const price = orderPrice(preview)
  const sendsText = order.paymentOption === 'after_weighing' && isTextEnabled('amount_after_weighing')
  const pickedUp = order.history?.find((h) => h.status === 'received')

  function submit() {
    run(async () => {
      await weighOrder(order.id, Number(kg), { by: 'staff' })
      onDone(`${order.id} weighed at ${roundKg(kg)} kg.${sendsText ? ' The customer was sent the amount due.' : ''}`)
    })
  }

  const details = [
    pickedUp && `Picked up${order.rider ? ` by ${order.rider.name.split(' ')[0]}` : ''} at ${formatTime(pickedUp.at)}`,
    `${order.bags ?? 1} ${order.bags === 1 ? 'bag' : 'bags'}`,
    order.returnMethod === 'home_delivery' ? 'Deliver back home' : 'Customer picks up at the shop',
  ].filter(Boolean)

  return (
    <Modal
      open
      onClose={onClose}
      title={`Weigh ${order.id}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !allowed || !roundKg(kg)}>
            {sendsText ? 'Save and send text' : 'Save weight'}
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">
          {order.customer?.name} · {serviceLabel(order.service)}
        </p>
        <Badge tone="info">Pay {paymentOptionLabel(order.paymentOption).toLowerCase()}</Badge>
      </div>
      <p className="-mt-2 text-[13px] text-muted">{details.join(' · ')}</p>

      {!allowed ? (
        <Notice tone="warning">
          {order.weighedBy === 'rider'
            ? `The rider weighed this order at the door (${roundKg(order.kg)} kg). That weight is final.`
            : 'This order can no longer be weighed.'}
        </Notice>
      ) : (
        <>
          <Input
            label="Weight (kg)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            suffix="kg"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            hint={roundKg(kg) && roundKg(kg) !== Number(kg) ? `Billed as ${roundKg(kg)} kg (rounded up)` : undefined}
            className="[&_input]:text-lg [&_input]:font-semibold"
            data-autofocus
          />
          {roundKg(kg) ? (
            <PriceLines price={price} service={order.service} sessionPrice={order.rates?.sessionPrice ?? 0} totalLabel="Amount due" />
          ) : (
            <p className="text-sm text-muted">Enter the weight to see the amount due.</p>
          )}
          {sendsText && roundKg(kg) && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Text to the customer</span>
              <p className="rounded-control border border-line bg-[#F3F5F6] p-3 text-[13px] leading-5">
                {previewOrderText('amount_after_weighing', preview)}
              </p>
            </div>
          )}
        </>
      )}
      <ErrorNotice error={error} />
    </Modal>
  )
}
