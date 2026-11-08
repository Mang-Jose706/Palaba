// TEMPORARY page to check the shared components against the designs.
// Remove in step 10 (with its route in App.jsx).
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Button from '../components/Button.jsx'
import Badge, { PaymentBadge, StatusBadge, UnclaimedBadge } from '../components/Badge.jsx'
import Card, { StatCard } from '../components/Card.jsx'
import Tabs from '../components/Tabs.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import Modal from '../components/Modal.jsx'
import OrderRow, { OrderList } from '../components/OrderRow.jsx'
import OrderDialogs from '../dialogs/OrderDialogs.jsx'
import AddStaffOrRiderDialog from '../dialogs/AddStaffOrRiderDialog.jsx'
import { getSettings, listOrders, listRiders } from '../api/index.js'
import { STATUSES, PAYMENT_METHODS } from '../utils/orderRules.js'
import { formatPeso, orderTotal } from '../utils/pricing.js'

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-navy">{title}</h2>
      {children}
    </section>
  )
}

const BOARD_TABS = [
  { id: 'received', label: 'To start' },
  { id: 'in_progress', label: 'Processing' },
  { id: 'ready', label: 'Ready' },
  { id: 'on_the_way', label: 'On the way' },
]

export default function ComponentsPreview() {
  const [orders, setOrders] = useState([])
  const [settings, setSettings] = useState(null)
  const [riders, setRiders] = useState([])
  const [boardTab, setBoardTab] = useState('received')
  const [segTab, setSegTab] = useState('all')
  const [modalOrder, setModalOrder] = useState(null)
  const [lastAction, setLastAction] = useState('')
  const [params] = useSearchParams()
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    listOrders().then(setOrders)
    getSettings().then(setSettings)
    listRiders().then(setRiders)
  }, [])

  // Dialog previews (use ?dialog=record-payment etc. to open one on load).
  const byId = (id) => orders.find((o) => o.id === id)
  const DIALOG_SAMPLES = [
    { label: 'Record payment', name: 'record-payment', id: 'LT-1038' },
    { label: 'Change status', name: 'change-status', id: 'LT-1051', to: 'in_progress' },
    { label: 'Cancel order (prepaid)', name: 'cancel-order', id: 'LT-1050' },
    { label: 'Cancel order (washing started)', name: 'cancel-order-locked', id: 'LT-1047' },
    { label: 'Mark claimed (paid)', name: 'mark-claimed', id: 'LT-1045' },
    { label: 'Mark claimed (unpaid)', name: 'mark-claimed-unpaid', id: 'LT-1038' },
    { label: 'Weigh pickup order', name: 'weigh-pickup-order', id: 'LT-1049' },
    { label: 'Edit customer', name: 'edit-customer', id: 'LT-1038' },
  ]
  function openSample(sample) {
    const order = byId(sample.id)
    if (!order) return
    const name = sample.name.replace(/-(locked|unpaid)$/, '')
    setDialog({ name, order, to: sample.to, customer: order.customer })
  }
  const wanted = params.get('dialog')
  useEffect(() => {
    const sample = DIALOG_SAMPLES.find((d) => d.name === wanted)
    if (sample && orders.length) openSample(sample)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, orders.length])

  const count = (status) => orders.filter((o) => o.status === status).length
  const boardTabs = BOARD_TABS.map((t) => ({
    ...t,
    count: t.id === 'on_the_way' ? count('pickup_scheduled') + count('out_for_delivery') : count(t.id),
  }))
  const boardOrders = orders.filter((o) =>
    boardTab === 'on_the_way' ? ['pickup_scheduled', 'out_for_delivery'].includes(o.status) : o.status === boardTab,
  )
  const unpaid = orders.find((o) => !o.payment && o.kg)
  const paidOrder = orders.find((o) => o.payment)
  const unclaimed = orders.find((o) => o.status === 'ready' && o.id === 'LT-1031')

  function handleAction(action, order) {
    setLastAction(`${action.label} → ${order.id}${action.dialog ? ` (opens ${action.dialog})` : ''}`)
    if (action.dialog === 'record-payment') setModalOrder(order)
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface px-6 py-4">
        <h1 className="text-xl font-extrabold">Components preview</h1>
        <p className="text-sm text-muted">Temporary page for checking shared components. Data comes from the mock API.</p>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:px-6">
        <Section title="Logo">
          <div className="flex flex-wrap items-center gap-8">
            <Logo size="sm" />
            <Logo />
            <Logo size="lg" />
            <Logo showText={false} />
          </div>
        </Section>

        <Section title="Sidebar (owner with Dashboard active · staff with Orders active)">
          <div className="flex flex-wrap gap-6">
            <div className="h-[560px] overflow-hidden rounded-card border border-line">
              <Sidebar user={{ name: 'Ana Reyes', role: 'owner' }} activePath="/" />
            </div>
            <div className="h-[560px] overflow-hidden rounded-card border border-line">
              <Sidebar user={{ name: 'Bea Santos', role: 'staff' }} activePath="/orders" />
            </div>
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={Plus}>New order</Button>
            <Button variant="secondary">Start washing</Button>
            <Button variant="danger">Cancel order</Button>
            <Button variant="ghost">Ghost</Button>
            <Button disabled>Mark claimed (disabled)</Button>
            <Button size="sm" variant="secondary">
              Small
            </Button>
            <Button to="/" variant="secondary">
              Link button
            </Button>
          </div>
          <div className="max-w-sm">
            <Button fullWidth>Full width</Button>
          </div>
        </Section>

        <Section title="Badge">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">success</Badge>
            <Badge tone="warning">warning</Badge>
            <Badge tone="danger">danger</Badge>
            <Badge tone="info">info</Badge>
            <Badge tone="neutral">neutral</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(STATUSES).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {paidOrder && <PaymentBadge order={paidOrder} />}
            {unpaid && <PaymentBadge order={unpaid} />}
            {unclaimed && settings && <UnclaimedBadge order={unclaimed} settings={settings} />}
          </div>
        </Section>

        <Section title="Card">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today's orders" value="9" />
            <StatCard label="Unclaimed orders" value="3" />
            <StatCard label="Kilos washed today" value="32 kg" caption="14 sessions" />
            <StatCard label="Collected today" value={formatPeso(2415)} caption="Paid orders" />
          </div>
          <Card>
            <p className="font-semibold">Plain card</p>
            <p className="text-sm text-muted">12px radius, 1px line border, white surface.</p>
          </Card>
        </Section>

        <Section title="Tabs">
          <Tabs tabs={boardTabs} value={boardTab} onChange={setBoardTab} label="Order board" />
          <Tabs
            variant="segment"
            label="Order filter"
            value={segTab}
            onChange={setSegTab}
            tabs={[
              { id: 'all', label: 'All', count: orders.length },
              { id: 'received', label: 'Received' },
              { id: 'in_progress', label: 'Processing' },
              { id: 'ready', label: 'Ready' },
              { id: 'claimed', label: 'Claimed' },
            ]}
          />
        </Section>

        <Section title="OrderRow (live board: use the board tabs above)">
          {lastAction && <p className="text-sm text-muted">Clicked: {lastAction}</p>}
          <OrderList>
            {boardOrders.map((o) => (
              <OrderRow key={o.id} order={o} settings={settings} onAction={handleAction} />
            ))}
            {boardOrders.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No orders here.</p>}
          </OrderList>
          <p className="text-sm text-muted">With status badge:</p>
          <OrderList>
            {orders.slice(0, 4).map((o) => (
              <OrderRow key={o.id} order={o} settings={settings} onAction={handleAction} showStatus />
            ))}
          </OrderList>
        </Section>

        <Section title="Input and Select">
          <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            <Input icon={Search} placeholder="Search name, mobile, or order code" aria-label="Search" />
            <Input label="Customer name" placeholder="Juan Dela Cruz" />
            <Input label="Weight" type="number" inputMode="decimal" suffix="kg" hint="Rounded up to the whole kg" />
            <Input label="Mobile number" defaultValue="0917" error="Enter an 11-digit mobile number" />
            <Select
              label="Assign rider"
              placeholder="Choose a rider"
              defaultValue=""
              options={riders.map((r) => ({ value: r.id, label: r.name }))}
            />
            <Select label="Payment method" options={PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))} />
            <Input label="Disabled" disabled value="Not editable" readOnly />
          </div>
        </Section>

        <Section title="Order dialogs (example data, actions really save)">
          <div className="flex flex-wrap gap-3">
            {DIALOG_SAMPLES.map((d) => (
              <Button key={d.name} variant="secondary" onClick={() => openSample(d)}>
                {d.label}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Modal">
          <div>
            <Button variant="secondary" onClick={() => setModalOrder(unpaid)} disabled={!unpaid}>
              Open Record payment example
            </Button>
          </div>
        </Section>
      </main>

      {(dialog?.name === 'add-staff' || wanted === 'add-staff') && dialog?.name !== 'closed' && (
        <AddStaffOrRiderDialog defaultRole="rider" onClose={() => setDialog({ name: 'closed' })} onDone={() => setDialog({ name: 'closed' })} />
      )}
      <OrderDialogs dialog={dialog} onClose={() => setDialog(null)} onSwitch={setDialog} onDone={(t) => { setDialog(null); setLastAction(t) }} />

      <Modal
        open={Boolean(modalOrder)}
        onClose={() => setModalOrder(null)}
        title="Record payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOrder(null)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOrder(null)}>Record {modalOrder && formatPeso(orderTotal(modalOrder))}</Button>
          </>
        }
      >
        {modalOrder && (
          <>
            <div className="flex justify-between gap-4 text-sm">
              <span className="font-semibold">
                {modalOrder.id} · {modalOrder.customer?.name}
              </span>
              <span className="text-muted">Example only, nothing is saved</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-control bg-[#EEF2F7] p-4">
              <span className="text-[13px] text-muted">Amount to collect</span>
              <span className="text-[28px] leading-9 font-bold">{formatPeso(orderTotal(modalOrder))}</span>
              <span className="text-[13px] text-muted">Full payment only</span>
            </div>
            <Input label="Reference number" placeholder="Optional for cash" />
          </>
        )}
      </Modal>
    </div>
  )
}
