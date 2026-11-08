import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'

const ConfirmContext = createContext(null)

/**
 * App-wide "Are you sure?" pop-up for important actions (log out, remove,
 * undo, mark ready…).
 *
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: 'Log out?', confirmLabel: 'Log out' }))) return
 *
 * Options: title, message (text or JSX), confirmLabel, cancelLabel,
 * tone: 'danger' | 'warning' | 'primary'.
 */
export default function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolver.current = resolve
      setRequest(options)
    })
  }, [])

  function close(answer) {
    resolver.current?.(answer)
    resolver.current = null
    setRequest(null)
  }

  const tone = request?.tone ?? 'warning'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(request)}
        onClose={() => close(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            {tone !== 'primary' && (
              <TriangleAlert className={tone === 'danger' ? 'size-5 text-danger-fg' : 'size-5 text-warning-fg'} aria-hidden="true" />
            )}
            {request?.title}
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)} data-autofocus>
              {request?.cancelLabel ?? 'Go back'}
            </Button>
            <Button variant={tone === 'danger' ? 'dangerSolid' : 'primary'} onClick={() => close(true)}>
              {request?.confirmLabel ?? 'Yes, continue'}
            </Button>
          </>
        }
      >
        {request?.message && <div className="text-sm leading-6 text-navy">{request.message}</div>}
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}
