import { useLocation } from 'react-router-dom'
import RiderShell from '../../components/RiderShell.jsx'
import { StatCard } from '../../components/Card.jsx'
import Notice from '../../components/Notice.jsx'
import useApiData from '../../components/useApiData.js'
import { useAuth } from '../../components/AuthProvider.jsx'
import TripCard from './TripCard.jsx'
import { getRiderDay } from '../../api/index.js'
import { formatPeso } from '../../utils/pricing.js'
import { windowStartLabel } from '../../utils/format.js'

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      {children}
    </section>
  )
}

export default function TodaysTrips() {
  const { user } = useAuth()
  const location = useLocation()
  const day = useApiData(() => getRiderDay(user.id), [user.id])
  const d = day.data
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const flash = location.state?.message

  return (
    <RiderShell>
      <div>
        <h1 className="text-2xl font-bold text-navy">Hi {user.name.split(' ')[0]}</h1>
        <p className="text-sm text-muted">
          {date}
          {d && ` · ${d.tripCount} ${d.tripCount === 1 ? 'trip' : 'trips'} today`}
        </p>
      </div>

      {flash && (
        <Notice tone="success" role="status">
          {flash}
        </Notice>
      )}

      {!d ? (
        <p className="text-sm text-muted">Loading trips…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="To collect on delivery"
              value={formatPeso(d.toCollectOnDelivery)}
              caption={d.doorPayments ? `Plus ${d.doorPayments} door ${d.doorPayments === 1 ? 'payment' : 'payments'}` : 'No door payments'}
              className="min-h-0 p-4 [&>span:nth-child(2)]:text-2xl"
            />
            <StatCard
              label="Pickups"
              value={d.pickups}
              caption={d.nextPickupWindow ? `Next at ${windowStartLabel(d.nextPickupWindow)}` : 'None left today'}
              className="min-h-0 p-4 [&>span:nth-child(2)]:text-2xl"
            />
          </div>

          <Section title="Now">
            {d.now.length ? (
              d.now.map((o) => <TripCard key={o.id} order={o} highlight />)
            ) : (
              <p className="rounded-card border border-dashed border-line bg-surface p-4 text-sm text-muted">No deliveries on the way.</p>
            )}
          </Section>

          <Section title="Later today">
            {d.later.length ? (
              d.later.map((o) => <TripCard key={o.id} order={o} />)
            ) : (
              <p className="rounded-card border border-dashed border-line bg-surface p-4 text-sm text-muted">No more pickups today.</p>
            )}
          </Section>
        </>
      )}
    </RiderShell>
  )
}
