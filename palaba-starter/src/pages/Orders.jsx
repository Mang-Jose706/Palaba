import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import Tabs from '../components/Tabs.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Table, { Td, Th } from '../components/Table.jsx'
import { PaymentBadge, StatusBadge, UnclaimedBadge } from '../components/Badge.jsx'
import { serviceSummary } from '../components/OrderRow.jsx'
import { cx, focusRing } from '../components/cx.js'
import useApiData from '../components/useApiData.js'
import { getSettings, listOrders } from '../api/index.js'
import { formatPeso, orderTotal } from '../utils/pricing.js'
import { howLabel, timeLabel } from '../utils/orderDisplay.js'

const TABS = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'received', label: 'Received', statuses: ['received'] },
  { id: 'processing', label: 'Processing', statuses: ['in_progress'] },
  { id: 'ready', label: 'Ready', statuses: ['ready'] },
  { id: 'on_the_way', label: 'On the way', statuses: ['pickup_scheduled', 'out_for_delivery'] },
  { id: 'claimed', label: 'Claimed', statuses: ['claimed', 'delivered'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
]

const PERIODS = [
  { value: 'week', label: 'This week', days: 7 },
  { value: 'month', label: 'Last 30 days', days: 30 },
  { value: 'all', label: 'All time', days: null },
]

export default function Orders() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tabId = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'all'
  const periodId = PERIODS.some((p) => p.value === params.get('period')) ? params.get('period') : 'week'
  const query = params.get('q') ?? ''

  const orders = useApiData(() => listOrders({ search: query }), [query])
  const settings = useApiData(() => getSettings(), [])

  function setParam(key, value, fallback) {
    const next = new URLSearchParams(params)
    if (!value || value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const period = PERIODS.find((p) => p.value === periodId)
  const since = period.days ? Date.now() - period.days * 24 * 60 * 60 * 1000 : 0
  // Open orders always show, even if they were created before the period.
  const inPeriod = (orders.data ?? []).filter(
    (o) => new Date(o.createdAt).getTime() >= since || !['claimed', 'delivered', 'cancelled'].includes(o.status),
  )
  const tab = TABS.find((t) => t.id === tabId)
  const rows = inPeriod.filter((o) => !tab.statuses || tab.statuses.includes(o.status))
  const count = (t) => inPeriod.filter((o) => !t.statuses || t.statuses.includes(o.status)).length

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-5 md:px-8 md:py-8">
      <PageHeader
        title="Orders"
        subtitle={`${period.label} · ${inPeriod.length} ${inPeriod.length === 1 ? 'order' : 'orders'}`}
      >
        <Input
          icon={Search}
          type="search"
          placeholder="Search name, mobile, or order code"
          aria-label="Search orders"
          value={query}
          onChange={(e) => setParam('q', e.target.value, '')}
          className="md:w-[340px]"
        />
        <Button to="/orders/new" icon={Plus}>
          New order
        </Button>
      </PageHeader>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs
          variant="segment"
          label="Filter by status"
          value={tabId}
          onChange={(id) => setParam('tab', id, 'all')}
          tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: t.id === 'all' ? count(t) : undefined }))}
          className="min-w-0 flex-1"
        />
        <Select
          aria-label="Period"
          value={periodId}
          onChange={(e) => setParam('period', e.target.value, 'week')}
          options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
          className="lg:w-44"
        />
      </div>

      {/* Phones: cards instead of the wide table */}
      <ul className="mt-4 flex flex-col gap-3 md:hidden">
        {!orders.loading && rows.length === 0 && (
          <li className="rounded-card border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
            {query ? `No orders match “${query}”.` : 'No orders here.'}
          </li>
        )}
        {rows.map((o) => {
          const total = orderTotal(o)
          return (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`} className={cx('block rounded-card border border-line bg-surface p-4', focusRing)}>
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-navy">{o.customer?.name}</span>
                  <span className="text-sm text-accent">{o.id}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {serviceSummary(o)} · {howLabel(o)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusBadge status={o.status} />
                  {o.status !== 'cancelled' && <PaymentBadge order={o} />}
                  <UnclaimedBadge order={o} settings={settings.data} />
                </div>
                <div className="mt-2 flex justify-between gap-3 text-sm">
                  <span className="text-muted">{timeLabel(o)}</span>
                  <span className={cx('font-semibold', o.status === 'cancelled' ? 'text-muted line-through' : 'text-navy')}>
                    {total == null ? 'After weighing' : formatPeso(total)}
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      <Table caption={`Orders, ${tab.label}`} className="mt-5 max-md:hidden">
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Customer</Th>
            <Th>Service</Th>
            <Th>How</Th>
            <Th>Status</Th>
            <Th>Payment</Th>
            <Th>Total</Th>
            <Th>Time</Th>
          </tr>
        </thead>
        <tbody>
          {orders.loading && (
            <tr>
              <Td colSpan={8} className="py-10 text-center text-muted">
                Loading orders…
              </Td>
            </tr>
          )}
          {!orders.loading && rows.length === 0 && (
            <tr>
              <Td colSpan={8} className="py-10 text-center text-muted">
                {query ? `No orders match “${query}”.` : 'No orders here.'}
              </Td>
            </tr>
          )}
          {rows.map((o) => {
            const total = orderTotal(o)
            return (
              <tr
                key={o.id}
                onClick={(e) => {
                  if (!e.target.closest('a')) navigate(`/orders/${o.id}`)
                }}
                className="cursor-pointer hover:bg-bg"
              >
                <Td>
                  <Link to={`/orders/${o.id}`} className={cx('rounded-sm font-medium whitespace-nowrap text-accent hover:underline', focusRing)}>
                    {o.id}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-navy">{o.customer?.name}</Td>
                <Td className="min-w-44 text-muted">{serviceSummary(o)}</Td>
                <Td className="whitespace-nowrap text-muted">{howLabel(o)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={o.status} />
                    <UnclaimedBadge order={o} settings={settings.data} />
                  </div>
                </Td>
                <Td>{o.status === 'cancelled' ? <span className="text-muted">—</span> : <PaymentBadge order={o} />}</Td>
                <Td className={cx('font-semibold whitespace-nowrap', o.status === 'cancelled' ? 'text-muted line-through' : 'text-navy')}>
                  {total == null ? (o.paymentOption === 'at_the_door' ? 'When weighed' : 'After weighing') : formatPeso(total)}
                </Td>
                <Td className="min-w-32 text-muted">{timeLabel(o)}</Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </main>
  )
}
