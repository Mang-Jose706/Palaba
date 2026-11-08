import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx, focusRing } from './cx.js'

// Open dialogs, newest last: only the top one reacts to Esc / Tab
// (a confirm pop-up can open on top of another dialog).
const stack = []

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog: closes with Esc or a click on the backdrop, traps Tab
 * focus inside, and returns focus to where it was when it closes.
 *
 * @param {{ open: boolean, onClose: () => void, title: React.ReactNode, children: React.ReactNode, footer?: React.ReactNode, size?: 'sm'|'md'|'lg' }} props
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md', className }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const token = {}
    stack.push(token)
    const previous = document.activeElement
    const panel = panelRef.current
    const first = panel?.querySelector('[data-autofocus]') ?? panel?.querySelectorAll(FOCUSABLE)[1] ?? panel
    first?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e) {
      if (stack.at(-1) !== token) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
      } else if (e.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll(FOCUSABLE)]
        if (!items.length) return
        const firstEl = items[0]
        const lastEl = items[items.length - 1]
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      stack.splice(stack.indexOf(token), 1)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'flex max-h-[92vh] w-full flex-col gap-4 overflow-y-auto bg-surface p-6 shadow-[0_12px_32px_rgba(20,33,31,0.25)] outline-none',
          'rounded-t-card sm:rounded-card',
          { sm: 'sm:max-w-sm', md: 'sm:max-w-[460px]', lg: 'sm:max-w-2xl' }[size],
          className,
        )}
      >
        <header className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg leading-[26px] font-semibold text-navy">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cx('-mr-2 grid size-11 place-items-center rounded-control text-muted hover:bg-bg hover:text-navy', focusRing)}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex flex-col gap-4">{children}</div>
        {footer && <footer className="flex gap-3 [&>*]:flex-1">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
