// Small pieces shared by the order dialogs.
import { useState } from 'react'
import Notice from '../components/Notice.jsx'
import { serviceSummary } from '../components/OrderRow.jsx'

/** "Leo Cruz · Wash & dry · 4 kg" */
export function orderLine(order) {
  return `${order.customer?.name ?? 'Customer'} · ${serviceSummary(order)}`
}

/** Busy + error state around an async save. */
export function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(fn) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return { busy, error, run }
}

export function ErrorNotice({ error }) {
  if (!error) return null
  return (
    <Notice tone="danger" role="alert">
      {error}
    </Notice>
  )
}

/** Gray caption under the dialog buttons. */
export function Caption({ children }) {
  return <p className="text-center text-[13px] text-muted">{children}</p>
}
