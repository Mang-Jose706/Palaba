import { useRef } from 'react'
import { cx, focusRing } from './cx.js'

/**
 * Pill switch for picking ONE value (a radio group): Drop-off / Home pickup,
 * Pay now / Pay at pickup, Cash / GCash… Arrow keys move the choice.
 *
 * @param {{ options: { value: string, label: React.ReactNode, disabled?: boolean }[], value: string, onChange: (v: string) => void, label: string, size?: 'md'|'lg' }} props
 */
export default function SegmentedControl({ options, value, onChange, label, size = 'md', className }) {
  const refs = useRef([])
  const enabled = options.filter((o) => !o.disabled)

  function onKeyDown(e) {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!dir || !enabled.length) return
    e.preventDefault()
    const at = enabled.findIndex((o) => o.value === value)
    const next = enabled[(at + dir + enabled.length) % enabled.length]
    onChange(next.value)
    refs.current[options.indexOf(next)]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className={cx('flex gap-1 rounded-card bg-[#EEF2F7] p-1', className)}>
      {options.map((o, i) => {
        const checked = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={o.disabled}
            tabIndex={checked || (!value && i === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={onKeyDown}
            className={cx(
              'flex-1 rounded-control px-3 text-[13px] leading-4 font-semibold transition',
              size === 'lg' ? 'min-h-10 md:text-sm' : 'min-h-10',
              checked ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-navy',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted',
              focusRing,
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
