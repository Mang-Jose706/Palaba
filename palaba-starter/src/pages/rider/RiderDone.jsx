import RiderShell from '../../components/RiderShell.jsx'
import useApiData from '../../components/useApiData.js'
import { useAuth } from '../../components/AuthProvider.jsx'
import TripCard from './TripCard.jsx'
import { getRiderDay } from '../../api/index.js'

/** Trips the rider finished today. */
export default function RiderDone() {
  const { user } = useAuth()
  const day = useApiData(() => getRiderDay(user.id), [user.id])
  const done = day.data?.done ?? []
  return (
    <RiderShell>
      <h1 className="text-2xl font-bold text-navy">Done today</h1>
      {day.loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : done.length ? (
        done.map((o) => <TripCard key={o.id} order={o} done />)
      ) : (
        <p className="rounded-card border border-dashed border-line bg-surface p-4 text-sm text-muted">No finished trips yet today.</p>
      )}
    </RiderShell>
  )
}
