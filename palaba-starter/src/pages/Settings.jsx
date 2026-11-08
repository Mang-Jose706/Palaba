import { useEffect, useState } from 'react'
import TextButton from '../components/TextButton.jsx'
import { Plus } from 'lucide-react'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Notice from '../components/Notice.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Select from '../components/Select.jsx'
import Switch from '../components/Switch.jsx'
import Table, { Td, Th } from '../components/Table.jsx'
import { cx, focusRing } from '../components/cx.js'
import useApiData from '../components/useApiData.js'
import AddStaffOrRiderDialog from '../dialogs/AddStaffOrRiderDialog.jsx'
import { useConfirm } from '../components/ConfirmProvider.jsx'
import { approveUser, rejectSignUp, getSettings, listRiders, listStaff, previewOrderText, updateSettings } from '../api/index.js'
import { SERVICES, SESSION_KG, computePrice, extraKgPrice, formatPeso, serviceLabel } from '../utils/pricing.js'
import { formatMobile, isValidMobile } from '../utils/format.js'

// Rule 5: texts only when the customer must act. The two optional ones are OFF
// by default. No SMS costs are shown anywhere.
const TEXTS_NEEDED = [
  { key: 'ready_for_pickup', label: 'Ready for pickup', description: 'Includes the amount due, if any, and the tracking link' },
  { key: 'pickup_scheduled', label: 'Pickup scheduled', description: 'Confirms the pickup date and time window' },
  { key: 'out_for_delivery', label: 'Out for delivery', description: 'Tells the customer the rider is on the way' },
  { key: 'amount_after_weighing', label: 'Amount after weighing', description: 'Only for “After weighing” orders: the weight and amount due' },
]
const TEXTS_OPTIONAL = [
  { key: 'order_received', label: 'Order received', description: 'Off by default. The customer already has the claim slip.' },
  { key: 'washing_started', label: 'Washing started', description: 'Off by default. The customer does not need to act.' },
]

function SectionCard({ title, subtitle, action, children, className }) {
  return (
    <Card as="section" className={cx('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}

/** Small "Saved" message that clears itself. */
function useFlash() {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2500)
    return () => clearTimeout(t)
  }, [msg])
  return [msg, setMsg]
}

function Flash({ msg }) {
  if (!msg) return null
  return (
    <Notice tone={msg.tone} role="status">
      {msg.text}
    </Notice>
  )
}

function ShopDetails({ settings }) {
  const [form, setForm] = useState({ shopName: settings.shopName, shopPhone: formatMobile(settings.shopPhone), shopAddress: settings.shopAddress })
  const [msg, setMsg] = useFlash()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  async function save(e) {
    e.preventDefault()
    if (!form.shopName.trim()) return setMsg({ tone: 'danger', text: 'Enter the shop name.' })
    if (!isValidMobile(form.shopPhone)) return setMsg({ tone: 'danger', text: 'Enter an 11-digit mobile number starting with 09.' })
    await updateSettings({ shopName: form.shopName.trim(), shopPhone: formatMobile(form.shopPhone), shopAddress: form.shopAddress.trim() })
    setMsg({ tone: 'success', text: 'Shop details saved.' })
  }
  return (
    <SectionCard title="Shop details">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Input label="Shop name" value={form.shopName} onChange={set('shopName')} />
        <Input label="Mobile number" type="tel" value={form.shopPhone} onChange={set('shopPhone')} hint="Shown on claim slips and the tracking page." />
        <Input label="Address" value={form.shopAddress} onChange={set('shopAddress')} />
        <Button type="submit" variant="secondary" fullWidth>
          Save changes
        </Button>
        <Flash msg={msg} />
      </form>
    </SectionCard>
  )
}

function Fees({ settings }) {
  const confirm = useConfirm()
  const [form, setForm] = useState({ pickupFee: String(settings.pickupFee), deliveryFee: String(settings.deliveryFee) })
  const [msg, setMsg] = useFlash()
  async function save(e) {
    e.preventDefault()
    const pickupFee = Number(form.pickupFee)
    const deliveryFee = Number(form.deliveryFee)
    if (!(pickupFee >= 0) || !(deliveryFee >= 0) || form.pickupFee === '' || form.deliveryFee === '') {
      return setMsg({ tone: 'danger', text: 'Enter 0 or more for both fees.' })
    }
    const ok = await confirm({
      title: 'Change the pickup and delivery fees?',
      message: `New home pickups will use ${formatPeso(pickupFee)} pickup and ${formatPeso(deliveryFee)} delivery. Existing orders keep their fees.`,
      confirmLabel: 'Save fees',
      tone: 'warning',
    })
    if (!ok) return
    await updateSettings({ pickupFee, deliveryFee })
    setMsg({ tone: 'success', text: 'Fees saved. They apply to new orders.' })
  }
  return (
    <SectionCard title="Pickup and delivery fees" subtitle="Flat amounts added to home pickup orders">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Pickup fee" type="number" inputMode="numeric" min="0" icon={PesoIcon} value={form.pickupFee} onChange={(e) => setForm((f) => ({ ...f, pickupFee: e.target.value }))} />
          <Input label="Delivery fee" type="number" inputMode="numeric" min="0" icon={PesoIcon} value={form.deliveryFee} onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))} />
        </div>
        <Button type="submit" variant="secondary" fullWidth>
          Save fees
        </Button>
        <Flash msg={msg} />
      </form>
    </SectionCard>
  )
}

/** "₱" as an input icon. */
function PesoIcon({ className }) {
  return (
    <span className={cx(className, 'grid place-items-center text-sm leading-none')} aria-hidden="true">
      ₱
    </span>
  )
}

function PickupWindows({ settings }) {
  const confirm = useConfirm()
  async function remove(i) {
    const w = windows[i]
    if (w.trim()) {
      const ok = await confirm({
        title: `Remove “${w}”?`,
        message: 'It won’t be offered for new pickups after you save. Pickups already booked keep their time.',
        confirmLabel: 'Remove',
        tone: 'danger',
      })
      if (!ok) return
    }
    setWindows((x) => x.filter((_, j) => j !== i))
  }
  const [windows, setWindows] = useState(settings.pickupWindows ?? [])
  const [msg, setMsg] = useFlash()
  const set = (i, v) => setWindows((w) => w.map((x, j) => (j === i ? v : x)))
  async function save() {
    try {
      await updateSettings({ pickupWindows: windows })
      setMsg({ tone: 'success', text: 'Pickup time windows saved.' })
    } catch (err) {
      setMsg({ tone: 'danger', text: err.message })
    }
  }
  return (
    <SectionCard title="Pickup time windows" subtitle="Choices on New order and Reschedule pickup">
      <div className="flex flex-col gap-2">
        {windows.map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input aria-label={`Time window ${i + 1}`} value={w} onChange={(e) => set(i, e.target.value)} placeholder="1:00–3:00 PM" className="flex-1" />
            <TextButton aria-label={`Remove ${w || 'time window'}`} onClick={() => remove(i)} disabled={windows.length <= 1}>
              Remove
            </TextButton>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" icon={Plus} onClick={() => setWindows((w) => [...w, ''])}>
          Add window
        </Button>
        <Button variant="secondary" onClick={save} className="flex-1">
          Save windows
        </Button>
      </div>
      <Flash msg={msg} />
    </SectionCard>
  )
}

function Unclaimed({ settings }) {
  const [msg, setMsg] = useFlash()
  return (
    <SectionCard title="Unclaimed orders">
      <Select
        label="Flag an order after"
        value={String(settings.unclaimedAfterDays)}
        onChange={async (e) => {
          await updateSettings({ unclaimedAfterDays: Number(e.target.value) })
          setMsg({ tone: 'success', text: 'Saved.' })
        }}
        options={[1, 2, 3, 4, 5, 7, 10, 14].map((d) => ({ value: String(d), label: `${d} ${d === 1 ? 'day' : 'days'}` }))}
        hint="Ready orders waiting at the shop longer than this get an “Unclaimed” badge."
      />
      <Flash msg={msg} />
    </SectionCard>
  )
}

function Prices({ settings }) {
  const confirm = useConfirm()
  const [editing, setEditing] = useState(null) // service id
  const [draft, setDraft] = useState('')
  const [msg, setMsg] = useFlash()
  const fold = settings.prices.wash_dry_fold
  const example = computePrice({ kg: 10, sessionPrice: fold })

  async function save(id) {
    const value = Number(draft)
    if (!(value > 0)) return setMsg({ tone: 'danger', text: 'Enter a price more than 0.' })
    const ok = await confirm({
      title: `Change the ${serviceLabel(id)} price?`,
      message: `${formatPeso(settings.prices[id])} → ${formatPeso(value)} per session (${formatPeso(extraKgPrice(value))} per extra kg). New orders use the new price; existing orders keep theirs.`,
      confirmLabel: 'Save price',
      tone: 'warning',
    })
    if (!ok) return
    await updateSettings({ prices: { [id]: value } })
    setEditing(null)
    setMsg({ tone: 'success', text: `${serviceLabel(id)} price saved. It applies to new orders.` })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-navy">Prices per washing session</h2>
      <Table caption="Prices per washing session">
        <thead>
          <tr>
            <Th>Service</Th>
            <Th>Price per session</Th>
            <Th>Each kg over {SESSION_KG}</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {Object.values(SERVICES).map((svc) => {
            const price = settings.prices[svc.id]
            const isEditing = editing === svc.id
            return (
              <tr key={svc.id}>
                <Td className="font-medium whitespace-nowrap text-navy">{svc.label}</Td>
                <Td>
                  {isEditing ? (
                    <Input
                      aria-label={`${svc.label} price per session`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      icon={PesoIcon}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && save(svc.id)}
                      className="w-32"
                      autoFocus
                    />
                  ) : (
                    formatPeso(price)
                  )}
                </Td>
                <Td className="text-navy">{formatPeso(extraKgPrice(isEditing ? Number(draft) || 0 : price))}</Td>
                <Td align="right">
                  {isEditing ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => save(svc.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <TextButton
                      aria-label={`Edit ${svc.label} price`}
                      onClick={() => {
                        setEditing(svc.id)
                        setDraft(String(price))
                      }}
                    >
                      Edit
                    </TextButton>
                  )}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
      <Flash msg={msg} />
      <div className="rounded-card bg-[#EEF2F4] p-4 text-sm text-muted">
        <p>
          One session holds up to {SESSION_KG} kg. Each kg over {SESSION_KG} adds 1/{SESSION_KG} of the session price. Weights are
          rounded up to the next kg. Price changes apply to new orders only.
        </p>
        <p className="mt-1 font-semibold text-navy">
          Example: 10 kg wash, dry &amp; fold = {formatPeso(fold)} + ({example.extraKg} × {formatPeso(example.perExtraKg)}) ={' '}
          {formatPeso(example.total)}
        </p>
      </div>
    </section>
  )
}

function Texts({ settings }) {
  const sample = {
    id: 'LT-1042',
    trackingCode: 'k7m2qx',
    kg: 6,
    type: 'drop_off',
    returnMethod: 'shop_pickup',
    rates: { sessionPrice: settings.prices.wash_dry_fold, pickupFee: 0, deliveryFee: 0 },
    payment: null,
  }
  const confirm = useConfirm()
  const toggle = (key) => async (value) => {
    const needed = TEXTS_NEEDED.find((t) => t.key === key)
    const label = (needed ?? TEXTS_OPTIONAL.find((t) => t.key === key)).label
    const ok = await confirm(
      value
        ? {
            title: `Turn on “${label}” texts?`,
            message: needed ? 'Customers will get this text again.' : 'This text is optional: customers don’t need to act on it.',
            confirmLabel: 'Turn on',
            tone: 'primary',
          }
        : {
            title: `Turn off “${label}” texts?`,
            message: needed
              ? 'Customers need this text to know what to do. Without it, staff must call them.'
              : 'Customers will stop getting this text.',
            confirmLabel: 'Turn off',
            tone: needed ? 'danger' : 'warning',
          },
    )
    if (ok) await updateSettings({ texts: { [key]: value } })
  }
  const on = Object.values(settings.texts).filter(Boolean).length

  return (
    <SectionCard
      title="Automatic SMS"
      subtitle="Texts go out only when the customer needs to do something."
      action={<Badge tone={on ? 'info' : 'neutral'}>{on ? 'On' : 'Off'}</Badge>}
    >
      <div className="flex flex-col gap-3">
        {TEXTS_NEEDED.map((t) => (
          <Switch key={t.key} label={t.label} description={t.description} checked={Boolean(settings.texts[t.key])} onChange={toggle(t.key)} />
        ))}
      </div>
      <h3 className="mt-2 text-sm font-semibold text-navy">Optional texts</h3>
      <div className="flex flex-col gap-3">
        {TEXTS_OPTIONAL.map((t) => (
          <Switch key={t.key} label={t.label} description={t.description} checked={Boolean(settings.texts[t.key])} onChange={toggle(t.key)} />
        ))}
      </div>
      <div className="rounded-control border border-line p-3">
        <p className="text-[13px] font-semibold text-navy">Ready message preview</p>
        <p className="mt-1 text-sm text-navy">{previewOrderText('ready_for_pickup', sample)}</p>
      </div>
    </SectionCard>
  )
}

function Accounts() {
  const confirm = useConfirm()
  const staff = useApiData(() => listStaff(), [])
  const riders = useApiData(() => listRiders(), [])
  const [dialog, setDialog] = useState(null) // { account? }
  const [msg, setMsg] = useFlash()
  // Sign-ups waiting for approval first.
  const people = [...(staff.data ?? []), ...(riders.data ?? [])].sort((a, b) => Number(Boolean(b.pending)) - Number(Boolean(a.pending)))
  const roleLabel = { owner: 'Owner', staff: 'Staff', rider: 'Rider' }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-navy">Staff and riders</h2>
        <Button variant="secondary" icon={Plus} onClick={() => setDialog({})}>
          Add staff or rider
        </Button>
      </div>
      <Flash msg={msg} />
      <Table caption="Staff and riders">
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Role</Th>
            <Th>Mobile</Th>
            <Th>Status</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <Td className="font-medium whitespace-nowrap text-navy">{p.name}</Td>
              <Td className="text-navy">{roleLabel[p.role]}</Td>
              <Td className="whitespace-nowrap text-muted">{formatMobile(p.mobile)}</Td>
              <Td>
                {p.pending ? (
                  <Badge tone="warning">Waiting for approval</Badge>
                ) : p.active ? (
                  <Badge tone="info">Active</Badge>
                ) : (
                  <Badge tone="neutral">Inactive</Badge>
                )}
              </Td>
              <Td align="right">
                {p.pending && (
                  <TextButton
                    aria-label={`Approve ${p.name}`}
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Approve ${p.name}?`,
                        message: `${p.name} (@${p.username}) will be able to log in as ${p.role === 'rider' ? 'a rider' : 'staff'}.`,
                        confirmLabel: 'Approve',
                        tone: 'primary',
                      })
                      if (!ok) return
                      await approveUser(p.id)
                      setMsg({ tone: 'success', text: `${p.name} can now log in.` })
                    }}
                  >
                    Approve
                  </TextButton>
                )}
                {p.pending && (
                  <TextButton
                    aria-label={`Reject ${p.name}`}
                    className="text-danger-fg hover:bg-danger-bg"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Reject ${p.name}’s sign-up?`,
                        message: `The request from @${p.username} will be deleted. They can sign up again later.`,
                        confirmLabel: 'Reject and delete',
                        tone: 'danger',
                      })
                      if (!ok) return
                      await rejectSignUp(p.id)
                      setMsg({ tone: 'neutral', text: `${p.name}’s sign-up was rejected.` })
                    }}
                  >
                    Reject
                  </TextButton>
                )}
                <TextButton
                  aria-label={`Edit ${p.name}`}
                  onClick={() => setDialog({ account: p })}
                >
                  Edit
                </TextButton>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {dialog && (
        <AddStaffOrRiderDialog
          key={dialog.account?.id ?? 'new'}
          account={dialog.account}
          onClose={() => setDialog(null)}
          onDone={(text) => {
            setDialog(null)
            setMsg({ tone: 'success', text })
          }}
        />
      )}
    </section>
  )
}

// Owner only (route guarded in App.jsx).
export default function Settings() {
  const settings = useApiData(() => getSettings(), [])
  const s = settings.data

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-5 md:px-8 md:py-8">
      <PageHeader title="Settings" subtitle="Owner only" />
      {!s ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <ShopDetails settings={s} />
            <Fees settings={s} />
            <PickupWindows settings={s} />
            <Unclaimed settings={s} />
          </div>
          <div className="flex flex-col gap-6">
            <Prices settings={s} />
            <Texts settings={s} />
            <Accounts />
          </div>
        </div>
      )}
    </main>
  )
}
