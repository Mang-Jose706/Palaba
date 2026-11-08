import { MapPin, Phone } from 'lucide-react'
import Card from './Card.jsx'
import { cx, focusRing } from './cx.js'
import { formatMobile } from '../utils/format.js'

const action = cx(
  'flex min-h-control-mobile flex-1 items-center justify-center gap-2 rounded-control bg-tint text-[15px] font-semibold text-accent hover:bg-[#dce9fd]',
  focusRing,
)

/**
 * Customer name, number and address with big Call / Open map buttons (rider pages).
 * `onCall` lets the page log the call attempt.
 */
export default function ContactCard({ customer, address, landmark, onCall }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div>
        <p className="text-lg font-semibold text-navy">{customer?.name}</p>
        <p className="text-sm text-muted">{formatMobile(customer?.mobile)}</p>
      </div>
      <div>
        <p className="text-sm text-navy">{address}</p>
        {landmark && <p className="text-[13px] text-muted">Landmark: {landmark}</p>}
      </div>
      <div className="flex gap-3">
        <a href={`tel:${customer?.mobile}`} onClick={onCall} className={action}>
          <Phone className="size-4.5" aria-hidden="true" />
          Call
        </a>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={action}>
          <MapPin className="size-4.5" aria-hidden="true" />
          Open map
        </a>
      </div>
    </Card>
  )
}
