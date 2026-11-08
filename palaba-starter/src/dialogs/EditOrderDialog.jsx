import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import ChoiceCards from '../components/ChoiceCards.jsx'
import Input from '../components/Input.jsx'
import Notice from '../components/Notice.jsx'
import PriceLines from '../components/PriceLines.jsx'
import useApiData from '../components/useApiData.js'
import { editOrder, getSettings } from '../api/index.js'
import { canWeigh } from '../utils/orderRules.js'
import { SERVICES, formatPeso, orderPrice, ratesFromSettings, roundKg } from '../utils/pricing.js'
import { Caption, ErrorNotice, useSubmit } from './shared.jsx'

/**
 * Fix a mistake on a received, unpaid order: service, weight, bags.
 * Price is recomputed with computePrice (via orderPrice). A rider's door
 * weight can't be changed (rule 8).
 */
export default function EditOrderDialog({ order, onClose, onDone }) {
  const settings = useApiData(() => getSettings(), [])
  const [service, setService] = useState(order.service)
  const [kg, setKg] = useState(order.kg != null ? String(order.kg) : '')
  const [bags, setBags] = useState(String(order.bags ?? 1))
  const { busy, error, run } = useSubmit()
  const weighable = canWeigh(order)

  const rates = service === order.service || !settings.data ? order.rates : ratesFromSettings(service, settings.data)
  const preview = orderPrice({ ...order, service, rates, kg: weighable ? roundKg(kg) : order.kg })

  function submit() {
    run(async () => {
      await editOrder(order.id, { service, kg: weighable ? kg : undefined, bags })
      onDone(`Saved changes to ${order.id}.`)
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${order.id}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || (weighable && kg !== '' && !roundKg(kg))}>
            Save changes
          </Button>
        </>
      }
    >
      <ChoiceCards
        label="Service"
        value={service}
        onChange={setService}
        options={Object.values(SERVICES).map((s) => ({
          value: s.id,
          title: s.label,
          caption: `${formatPeso(s.id === order.service ? order.rates?.sessionPrice : settings.data?.prices?.[s.id])} per session`,
        }))}
      />
      <div className="grid grid-cols-2 gap-4">
        {weighable ? (
          <Input label="Weight (kg)" type="number" inputMode="decimal" min="0" step="0.1" suffix="kg" value={kg} onChange={(e) => setKg(e.target.value)} />
        ) : (
          <Input label="Weight (kg)" value={order.kg != null ? `${order.kg} kg` : 'Not weighed'} readOnly disabled />
        )}
        <Input label="Bags" type="number" inputMode="numeric" min="1" value={bags} onChange={(e) => setBags(e.target.value)} />
      </div>
      {!weighable && order.weighedBy === 'rider' && <Notice tone="info">The rider weighed this at the door. That weight is final.</Notice>}
      <PriceLines price={preview} service={service} sessionPrice={rates?.sessionPrice ?? 0} />
      <ErrorNotice error={error} />
      <Caption>Only received, unpaid orders can be edited. A new service uses today’s price.</Caption>
    </Modal>
  )
}
