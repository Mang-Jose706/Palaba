import { useState } from 'react'
import TextButton from '../components/TextButton.jsx'
import { useParams } from 'react-router-dom'
import { Check, Copy, Printer } from 'lucide-react'
import BackLink from '../components/BackLink.jsx'
import { MobileTopBar } from '../components/MobileHeader.jsx'
import Badge, { UnclaimedBadge } from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import ClaimSlip from '../components/ClaimSlip.jsx'
import Notice from '../components/Notice.jsx'
import PriceLines from '../components/PriceLines.jsx'
import StatusTracker from '../components/StatusTracker.jsx'
import { cx, focusRing } from '../components/cx.js'
import useApiData from '../components/useApiData.js'
import { useAuth } from '../components/AuthProvider.jsx'
import OrderDialogs, { dialogForAction } from '../dialogs/OrderDialogs.jsx'
import { TEXT_KINDS, getOrder, getSettings, markReady, textToSend, trackingLink, updateOrder } from '../api/index.js'
import {
  CANNOT_CANCEL_MESSAGE,
  PAYMENT_METHODS,
  STATUSES,
  canCancel,
  canRecordPayment,
  isClosed,
  isHomeDelivery,
  isPaid,
  nextAction,
  paymentOptionLabel,
  showCannotCancel,
  statusHeadline,
  statusSteps,
} from '../utils/orderRules.js'
import { formatPeso, orderPrice, roundKg, sessionsFor } from '../utils/pricing.js'
import { formatDateTime, formatLongDay, formatMobile, formatShortDate, fromDateKey } from '../utils/format.js'

function SectionCard({ title, action, children, className }) {
  return (
    <Card as="section" className={cx('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-navy">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  )
}

function LinkButton({ children, ...rest }) {
  return (
    <TextButton className="-my-2 -mr-3" {...rest}>
      {children}
    </TextButton>
  )
}

function Row({ label, children, strong }) {
  return (
    <div className={cx('flex justify-between gap-4 text-sm', strong && 'font-semibold')}>
      <dt className={strong ? 'text-navy' : 'text-muted'}>{label}</dt>
      <dd className="text-right text-navy">{children}</dd>
    </div>
  )
}

export default function OrderDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const order = useApiData(() => getOrder(id), [id])
  const settings = useApiData(() => getSettings(), [])
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState(null)
  const [copied, setCopied] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  if (order.error) {
    return (
      <main className="px-4 py-8 md:px-8">
        <BackLink />
        <p className="mt-4 text-muted">Order {id} was not found.</p>
      </main>
    )
  }
  const o = order.data
  if (!o) return <main className="px-4 py-8 text-sm text-muted md:px-8">Loading…</main>

  const action = nextAction(o)
  const price = orderPrice(o)
  const steps = statusSteps(o)
  const stepNo = steps.findIndex((s) => s.state === 'current') + 1
  const paid = isPaid(o)
  const method = PAYMENT_METHODS.find((m) => m.id === o.payment?.method)?.label
  const kg = roundKg(o.kg)

  async function runAction() {
    setNotice(null)
    if (action.type === 'mark_ready') {
      try {
        const sent = textToSend(o, 'ready')
        await markReady(o.id, { by: user?.id })
        setNotice({
          tone: 'success',
          text: isHomeDelivery(o) ? `${o.id} is ready for delivery.` : `${o.id} is ready.${sent ? ` ${o.customer?.name} was sent a text.` : ''}`,
        })
      } catch (err) {
        setNotice({ tone: 'danger', text: err.message })
      }
      return
    }
    setDialog(dialogForAction(action, o))
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(trackingLink(o))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setNotice({ tone: 'neutral', text: `Tracking link: ${trackingLink(o)}` })
    }
  }

  async function saveNote() {
    await updateOrder(o.id, { notes: noteDraft.trim() })
    setEditingNote(false)
  }

  const statusTone = STATUSES[o.status]?.tone ?? 'neutral'

  const actionButtons = (
    <>
      <Button variant="secondary" icon={copied ? Check : Copy} onClick={copyLink}>
        {copied ? 'Copied' : <><span className="md:hidden">Copy link</span><span className="max-md:hidden">Copy tracking link</span></>}
      </Button>
      <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
        Print slip
      </Button>
    </>
  )

  return (
    <>
    <MobileTopBar title={o.id} back="/" />
    <main className="mx-auto w-full max-w-[1200px] px-4 py-4 md:px-8 md:py-8">
      <BackLink className="max-md:hidden" />

      <header className="flex flex-col gap-4 md:mt-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <h1 className="text-[28px] leading-9 font-bold tracking-tight text-navy max-md:sr-only">{o.id}</h1>
          <Badge tone={statusTone}>{statusHeadline(o)}</Badge>
          <UnclaimedBadge order={o} settings={settings.data} />
        </div>
        {/* Desktop: actions in the header (Figma). Phones: below Payment (staff-mobile-order-details.html). */}
        <div className="flex flex-wrap gap-3 max-md:hidden">
          {actionButtons}
          {action && <Button onClick={runAction}>{action.label}</Button>}
        </div>
      </header>

      {notice && (
        <Notice tone={notice.tone} role="status" className="mt-4">
          {notice.text}
        </Notice>
      )}

      <div className="mt-4 grid grid-cols-1 items-start gap-4 md:mt-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Left column ───────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionCard title="Items">
            <PriceLines price={price} service={o.service} sessionPrice={o.rates?.sessionPrice ?? 0} />
            {kg && (
              <p className="-mt-1 text-xs text-muted">
                {kg} kg · {sessionsFor(o.kg)} {sessionsFor(o.kg) === 1 ? 'session' : 'sessions'}
                {o.kg !== kg && ` · scale read ${o.kg} kg, rounded up`}
                {o.weighedBy === 'rider' && ' · weighed at the door (final)'}
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Order status"
            action={o.status !== 'cancelled' && <span className="text-sm text-accent">Step {stepNo} of {steps.length}</span>}
          >
            <StatusTracker order={o} />
            {o.status === 'cancelled' ? (
              <Notice tone="danger">
                Cancelled {o.closedAt && formatDateTime(o.closedAt)}
                {o.cancelReason && ` · ${o.cancelReason}`}
                {o.payment?.refundedAt && ` · ${formatPeso(o.payment.amount)} returned to the customer`}
              </Notice>
            ) : canCancel(o) ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-[13px] text-muted">Orders can only be cancelled before washing starts.</p>
                <Button variant="danger" onClick={() => setDialog({ name: 'cancel-order', order: o })}>
                  Cancel order
                </Button>
              </div>
            ) : (
              showCannotCancel(o) && (
                // Rule 4: from in_progress on, hide Cancel and explain why.
                <p className="border-t border-line pt-4 text-[13px] text-muted">{CANNOT_CANCEL_MESSAGE}</p>
              )
            )}
          </SectionCard>

          {o.type === 'home_pickup' && (
            <SectionCard title="Pickup and delivery">
              <dl className="flex flex-col gap-2.5">
                <Row label="Address">{o.pickup?.address}</Row>
                {o.pickup?.landmark && <Row label="Landmark">{o.pickup.landmark}</Row>}
                <Row label="Pickup">
                  {o.pickup?.date && formatLongDay(fromDateKey(o.pickup.date))}, {o.pickup?.window}
                </Row>
                <Row label="Rider">{o.rider?.name ?? 'Not assigned'}</Row>
                <Row label="After washing">{isHomeDelivery(o) ? 'Deliver back home' : 'Customer picks up at the shop'}</Row>
              </dl>
            </SectionCard>
          )}

          {(o.tripIssues?.length > 0 || o.calls?.length > 0) && (
            <SectionCard title="Rider reports">
              {o.tripIssues?.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {o.tripIssues.map((t) => (
                    <li key={t.at}>
                      <Notice tone="warning">
                        <span className="font-semibold">
                          {t.trip === 'pickup' ? 'Pickup' : 'Delivery'} not done · {formatDateTime(t.at)}
                        </span>
                        <br />
                        {t.reason}
                        {t.note && !t.reason.includes(t.note) && ` · “${t.note}”`} ·{' '}
                        {t.nextStep === 'try_later' ? 'Rider will try again later today' : 'Shop will call the customer'}
                      </Notice>
                    </li>
                  ))}
                </ul>
              )}
              {o.calls?.length > 0 && (
                <p className="text-[13px] text-muted">
                  Rider called the customer {o.calls.length} {o.calls.length === 1 ? 'time' : 'times'} (last {formatDateTime(o.calls.at(-1).at)}).
                </p>
              )}
            </SectionCard>
          )}

          <SectionCard
            title="Notes"
            action={
              !editingNote && (
                <LinkButton
                  onClick={() => {
                    setNoteDraft(o.notes ?? '')
                    setEditingNote(true)
                  }}
                >
                  {o.notes ? 'Edit note' : 'Add note'}
                </LinkButton>
              )
            }
          >
            {editingNote ? (
              <div className="flex flex-col gap-3">
                <label className="sr-only" htmlFor="order-note">
                  Note for staff
                </label>
                <textarea
                  id="order-note"
                  rows={3}
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className="w-full rounded-control border border-line p-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                <div className="flex gap-3">
                  <Button onClick={saveNote}>Save note</Button>
                  <Button variant="secondary" onClick={() => setEditingNote(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">{o.notes || 'No notes yet.'}</p>
            )}
          </SectionCard>

          <SectionCard title="Texts sent">
            {o.texts?.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {o.texts.map((t) => (
                  <li key={`${t.kind}-${t.at}`} className="flex justify-between gap-4">
                    <span className="text-navy">{TEXT_KINDS[t.kind] ?? t.kind}</span>
                    <span className="text-muted">{formatDateTime(t.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No texts sent yet.</p>
            )}
          </SectionCard>
        </div>

        {/* ── Right column (first on phones) ────────────── */}
        <div className="flex flex-col gap-4 max-lg:order-first">
          <SectionCard
            title="Customer"
            action={<LinkButton onClick={() => setDialog({ name: 'edit-customer', order: o, customer: o.customer })}>Edit</LinkButton>}
          >
            <div className="-mt-2">
              <p className="font-medium text-navy">{o.customer?.name}</p>
              <p className="text-sm text-muted">{formatMobile(o.customer?.mobile)}</p>
              {o.customer?.notes && <p className="mt-2 text-[13px] text-muted">{o.customer.notes}</p>}
            </div>
          </SectionCard>

          <SectionCard title="Payment">
            <dl className="flex flex-col gap-2.5">
              <Row label="Payment option">{paymentOptionLabel(o.paymentOption)}</Row>
              {paid ? (
                <>
                  <Row label={o.payment.refundedAt ? 'Refunded' : 'Paid'} strong>
                    {formatPeso(o.payment.amount)}
                  </Row>
                  <Row label="Method">
                    {method} · {formatShortDate(o.payment.paidAt)}
                  </Row>
                  {o.payment.reference && <Row label="Reference">{o.payment.reference}</Row>}
                </>
              ) : o.status === 'cancelled' ? (
                <Row label="Amount due" strong>
                  Nothing · cancelled
                </Row>
              ) : (
                <Row label="Amount due" strong>
                  {price.total == null ? 'After weighing' : formatPeso(price.total)}
                </Row>
              )}
            </dl>
            {!paid && !isClosed(o) && price.total != null && (
              <Notice tone="warning">
                {isHomeDelivery(o)
                  ? `The rider collects the full ${formatPeso(price.total)} before handing over the laundry.`
                  : `Collect the full ${formatPeso(price.total)} before marking this order claimed.`}
              </Notice>
            )}
            {canRecordPayment(o) && action?.type !== 'collect' && (
              <Button variant="secondary" onClick={() => setDialog({ name: 'record-payment', order: o })}>
                Record payment
              </Button>
            )}
          </SectionCard>

          <div className="flex flex-col gap-3 md:hidden">
            {action && (
              <Button onClick={runAction} fullWidth>
                {action.label}
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3">{actionButtons}</div>
          </div>

        </div>
      </div>

      {/* Off-screen slip so "Print slip" prints just the slip. */}
      <div aria-hidden="true" className="pointer-events-none fixed top-0 -left-[10000px] w-[360px]">
        {settings.data && <ClaimSlip order={o} settings={settings.data} trackingUrl={trackingLink(o)} />}
      </div>

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
    </>
  )
}
