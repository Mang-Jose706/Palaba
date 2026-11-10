import { Link } from 'react-router-dom'
import Badge, { StatusBadge } from '../components/Badge.jsx'
import Card, { StatCard } from '../components/Card.jsx'
import CollectionsChart from '../components/CollectionsChart.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Table, { Td, Th } from '../components/Table.jsx'
import { cx, focusRing, pageShell } from '../components/cx.js'
import useApiData from '../components/useApiData.js'
import { getReport } from '../api/index.js'
import { formatPeso } from '../utils/pricing.js'
import { formatShortDate } from '../utils/format.js'

// Owner only (route guarded in App.jsx). No SMS costs anywhere (rule 5).
export default function Reports() {
  const report = useApiData(() => getReport(), [])
  const r = report.data
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <main className={pageShell}>
      <PageHeader title="Reports" subtitle={`${today} · Owner only`} />

      {!r ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : (
        <>
          <section aria-label="Summary" className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard
              label="Collected today"
              value={formatPeso(r.collectedToday)}
              caption={`From ${r.paymentsToday} ${r.paymentsToday === 1 ? 'payment' : 'payments'}`}
            />
            <StatCard
              label="Last 7 days"
              value={formatPeso(r.last7Days)}
              caption={`${formatShortDate(r.range.from)} to ${formatShortDate(r.range.to)}`}
            />
            <StatCard
              label="To collect at pickup"
              value={formatPeso(r.toCollectTotal)}
              caption={`Across ${r.toCollect.length} ${r.toCollect.length === 1 ? 'order' : 'orders'}`}
            />
            <StatCard
              label="Unclaimed orders"
              value={r.unclaimedCount}
              caption={`Past the ${r.unclaimedAfterDays}-day limit`}
            />
          </section>

          <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card as="section" className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-navy">Collections, last 7 days</h2>
              <CollectionsChart days={r.days} />
            </Card>

            <Card as="section" className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-navy">Collected today by method</h2>
              <dl className="flex flex-col gap-3 text-sm">
                {r.byMethod.map((m) => (
                  <div key={m.id} className="flex justify-between gap-4">
                    <dt className="text-muted">{m.label}</dt>
                    <dd className="text-navy">{formatPeso(m.total)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatPeso(r.collectedToday)}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <h2 className="mt-8 text-lg font-semibold text-navy">Orders to collect at pickup</h2>
          <Table caption="Orders to collect at pickup" className="mt-3">
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Amount due</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {r.toCollect.length === 0 && (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-muted">
                    Nothing to collect. Every open order is paid.
                  </Td>
                </tr>
              )}
              {r.toCollect.map((o) => (
                <tr key={o.id}>
                  <Td className="text-navy">{o.id}</Td>
                  <Td className="text-navy">{o.customerName}</Td>
                  <Td>{o.unclaimed ? <Badge tone="danger">{o.unclaimedLabel}</Badge> : <StatusBadge status={o.status} />}</Td>
                  <Td className="font-semibold text-navy">{formatPeso(o.amount)}</Td>
                  <Td align="right">
                    <Link
                      to={`/orders/${o.id}`}
                      aria-label={`View ${o.id}`}
                      className={cx('rounded-sm px-2 py-1 text-sm font-medium text-accent hover:underline', focusRing)}
                    >
                      View
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </main>
  )
}
