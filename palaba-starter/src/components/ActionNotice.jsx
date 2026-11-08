import { Undo2 } from 'lucide-react'
import Notice from './Notice.jsx'
import TextButton from './TextButton.jsx'
import useApiData from './useApiData.js'
import { useConfirm } from './ConfirmProvider.jsx'
import { useAuth } from './AuthProvider.jsx'
import { getOrder, markReady, textToSend, undoLastStatus, undoPayment } from '../api/index.js'
import { canUndoPayment, statusLabel, undoInfo } from '../utils/orderRules.js'
import { formatPeso } from '../utils/pricing.js'

/**
 * Asks before undoing; explains what can't be taken back (texts). Shared by
 * the Undo button after an action and the Undo link on Order details.
 */
export function useUndo() {
  const confirm = useConfirm()
  const { user } = useAuth()

  async function undoStatus(order) {
    const undo = undoInfo(order)
    if (!undo) return null
    const textSent = (order.texts ?? []).some((t) => t.at >= (order.history?.at(-1)?.at ?? ''))
    const ok = await confirm({
      title: `Move ${order.id} back to ${statusLabel(undo.to)}?`,
      message: (
        <>
          <p>
            This undoes “{statusLabel(undo.from)}”. Use it only if the status was changed by mistake.
          </p>
          {textSent && (
            <p className="mt-2 font-medium text-warning-fg">
              The customer already got a text for this step. It can’t be taken back. Call them if needed.
            </p>
          )}
          <p className="mt-2 text-muted">No text is sent.</p>
        </>
      ),
      confirmLabel: `Back to ${statusLabel(undo.to)}`,
      tone: 'warning',
    })
    if (!ok) return null
    await undoLastStatus(order.id, { by: user?.id })
    return `${order.id} is back to ${statusLabel(undo.to)}.`
  }

  async function removePayment(order) {
    if (!canUndoPayment(order)) return null
    const ok = await confirm({
      title: `Remove the ${formatPeso(order.payment.amount)} payment?`,
      message: (
        <>
          <p>Use this only if the payment was recorded by mistake. {order.id} will show as unpaid again.</p>
          <p className="mt-2 text-muted">If money was really received, give it back to the customer first.</p>
        </>
      ),
      confirmLabel: 'Remove payment',
      tone: 'danger',
    })
    if (!ok) return null
    await undoPayment(order.id, { by: user?.id })
    return `Payment removed. ${order.id} is unpaid again.`
  }

  return { undoStatus, removePayment }
}

/**
 * Success message after an action, with an Undo button while the action can
 * still be reversed. notice: { tone, text, orderId?, undo?: 'status'|'payment' }
 */
export default function ActionNotice({ notice, onChange, className }) {
  const order = useApiData(() => (notice?.orderId ? getOrder(notice.orderId) : Promise.resolve(null)), [notice?.orderId, notice?.text])
  const { undoStatus, removePayment } = useUndo()
  if (!notice) return null
  const o = order.data
  const canUndo = o && (notice.undo === 'payment' ? canUndoPayment(o) : notice.undo === 'status' && undoInfo(o))

  async function undo() {
    try {
      const text = notice.undo === 'payment' ? await removePayment(o) : await undoStatus(o)
      if (text) onChange({ tone: 'neutral', text })
    } catch (err) {
      onChange({ tone: 'danger', text: err.message })
    }
  }

  return (
    <Notice tone={notice.tone} role="status" className={['flex items-center justify-between gap-3', className].filter(Boolean).join(' ')}>
      <span>{notice.text}</span>
      {canUndo && (
        <TextButton onClick={undo} className="-my-2 shrink-0 text-inherit underline underline-offset-2 hover:bg-white/50">
          <Undo2 className="mr-1 size-4" aria-hidden="true" />
          Undo
        </TextButton>
      )}
    </Notice>
  )
}

/**
 * "Mark ready" has no dialog of its own (CLAUDE.md), but it texts the
 * customer, so ask first. Returns the notice to show, or null if cancelled.
 */
export function useMarkReady() {
  const confirm = useConfirm()
  const { user } = useAuth()
  return async function markOrderReady(order) {
    const sent = textToSend(order, 'ready')
    const delivery = order.returnMethod === 'home_delivery'
    const ok = await confirm({
      title: `Mark ${order.id} ready?`,
      message: sent
        ? `${order.customer?.name ?? 'The customer'} gets a text now that the laundry is ready, with the amount due and the tracking link.`
        : delivery
          ? 'No text is sent now. The customer gets a text when it is out for delivery.'
          : 'No text is sent (Ready texts are off in Settings).',
      confirmLabel: 'Mark ready',
      tone: 'primary',
    })
    if (!ok) return null
    await markReady(order.id, { by: user?.id })
    return {
      tone: 'success',
      text: delivery
        ? `${order.id} is ready for delivery.`
        : `${order.id} is ready.${sent ? ` ${order.customer?.name ?? 'The customer'} was sent a text.` : ''}`,
      orderId: order.id,
      undo: 'status',
    }
  }
}
