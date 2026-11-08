import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Tabs from '../components/Tabs.jsx'
import { StatCard } from '../components/Card.jsx'
import OrderRow, { OrderList } from '../components/OrderRow.jsx'
import useApiData from '../components/useApiData.js'
import { useAuth } from '../components/AuthProvider.jsx'
import OrderDialogs, { dialogForAction } from '../dialogs/OrderDialogs.jsx'
import { getDashboardSummary, getSettings, listOrders, markReady } from '../api/index.js'
import { formatPeso } from '../utils/pricing.js'

// Dashboard tabs (CLAUDE.md "Dashboard behavior").
const TABS = [
  {
    id: 'to_start',
    label: 'To start',
    shortLabel: 'Start',
    statuses: ['received'],
    hint: 'Received and waiting to be washed. Starting a wash locks cancelling.',
  },
  {
    id: 'processing',
    label: 'Processing',
    shortLabel: 'Washing',
    statuses: ['in_progress'],
    hint: 'Being washed. Mark ready when done; the customer gets a text.',
  },
  {
    id: 'ready',
    label: 'Ready',
    shortLabel: 'Ready',
    statuses: ['ready'],
    hint: 'Waiting for the customer. Collect payment before releasing.',
  },
  {
    id: 'on_the_way',
    label: 'On the way',
    shortLabel: 'Trips',
    statuses: ['pickup_scheduled', 'out_for_delivery'],
    hint: 'Home pickups and deliveries with a rider.',
  },
]

const ACTIVE_STATUSES = TABS.flatMap((t) => t.statuses)

function todayHeading(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function matches(order, q) {
  if (!q) return true
  const s = q.toLowerCase()
  return (
    order.id.toLowerCase().includes(s) ||
    order.customer?.name.toLowerCase().includes(s) ||
    order.customer?.mobile.replace(/\s/g, '').includes(s.replace(/\s/g, ''))
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tabId = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'to_start'
  const tab = TABS.find((t) => t.id === tabId)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null) // { name, order, to }
  const [notice, setNotice] = useState(null) // { tone, text }

  const orders = useApiData(() => listOrders({ status: ACTIVE_STATUSES }), [])
  const summary = useApiData(() => getDashboardSummary(), [])
  const settings = useApiData(() => getSettings(), [])

  const all = useMemo(() => orders.data ?? [], [orders.data])
  const counts = Object.fromEntries(TABS.map((t) => [t.id, all.filter((o) => t.statuses.includes(o.status)).length]))
  const rows = all
    .filter((o) => tab.statuses.includes(o.status))
    .filter((o) => matches(o, query.trim()))
    // oldest first: the order waiting longest is at the top
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  function changeTab(id) {
    setParams(id === 'to_start' ? {} : { tab: id }, { replace: true })
  }

  async function handleAction(action, order) {
    setNotice(null)
    if (action.type === 'mark_ready') {
      // No dialog: Mark ready sends the Ready text right away (rule 5).
      try {
        await markReady(order.id, { by: user?.id })
        setNotice({
          tone: 'success',
          text:
            order.returnMethod === 'home_delivery'
              ? `${order.id} is ready for delivery.`
              : `${order.id} is ready. ${order.customer?.name ?? 'The customer'} was sent a text.`,
        })
      } catch (err) {
        setNotice({ tone: 'danger', text: err.message })
      }
      return
    }
    setDialog(dialogForAction(action, order))
  }

  const s = summary.data

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          {/* Phones: "Today" + short date (staff-mobile-dashboard.html); desktop: full date (Figma). */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy">
              <span className="md:hidden">Today</span>
              <span className="max-md:hidden">{todayHeading()}</span>
            </h1>
            <p className="text-sm text-muted md:hidden">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <Button to="/orders/new" icon={Plus} className="md:hidden">
            New order
          </Button>
        </div>
        <div className="flex gap-3 md:items-center">
          <Input
            icon={Search}
            type="search"
            placeholder="Search name, mobile, or order code"
            aria-label="Search orders"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 md:w-[340px] md:flex-none"
          />
          <Button to="/orders/new" icon={Plus} className="max-md:hidden md:px-5">
            New order
          </Button>
        </div>
      </header>

      <section aria-label="Today's summary" className="grid grid-cols-2 gap-4 max-md:hidden lg:grid-cols-4">
        <StatCard label="Today's orders" value={s ? s.todaysOrders : '–'} />
        <StatCard label="Unclaimed orders" value={s ? s.unclaimedOrders : '–'} />
        <StatCard
          label="Kilos washed today"
          value={s ? `${s.kilosWashedToday} kg` : '–'}
          caption={s ? `${s.sessionsToday} ${s.sessionsToday === 1 ? 'session' : 'sessions'}` : null}
        />
        <StatCard label="Collected today" value={s ? formatPeso(s.collectedToday) : '–'} caption="Paid orders" />
      </section>

      <section aria-label="Order board" className="flex flex-col gap-4">
        <Tabs
          label="Order board"
          value={tabId}
          onChange={changeTab}
          tabs={TABS.map((t) => ({ id: t.id, label: t.label, shortLabel: t.shortLabel, count: counts[t.id] }))}
        />
        <p className="text-[13px] text-muted md:hidden">{tab.hint}</p>

        {notice && (
          <p
            role="status"
            className={
              notice.tone === 'success'
                ? 'rounded-control bg-success-bg px-4 py-3 text-sm text-success-fg'
                : 'rounded-control bg-danger-bg px-4 py-3 text-sm text-danger-fg'
            }
          >
            {notice.text}
          </p>
        )}

        <div role="tabpanel" aria-label={tab.label}>
          {orders.loading ? (
            <p className="py-10 text-center text-sm text-muted">Loading orders…</p>
          ) : rows.length === 0 ? (
            <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center text-sm text-muted">
              {query ? `No orders in “${tab.label}” match “${query}”.` : `Nothing in “${tab.label}” right now.`}
            </div>
          ) : (
            <OrderList>
              {rows.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  settings={settings.data}
                  onAction={handleAction}
                  showStatus={tabId === 'on_the_way'}
                />
              ))}
            </OrderList>
          )}
        </div>
      </section>

      <OrderDialogs
        dialog={dialog}
        user={user}
        onClose={() => setDialog(null)}
        onSwitch={setDialog}
        onDone={(text) => {
          setDialog(null)
          setNotice({ tone: 'success', text })
        }}
      />
    </main>
  )
}
