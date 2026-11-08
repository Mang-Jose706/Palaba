import { useRef } from 'react'
import { cx, focusRing } from './cx.js'

/**
 * Tabs with optional counts.
 *
 * - variant "board" (Dashboard): label left, count right, blue dividers,
 *   active tab gets the light-blue active fill.
 * - variant "segment" (Orders): centered labels, active tab is a white pill
 *   with accent text; count shown as "All - 15".
 *
 * @param {{ tabs: { id: string, label: string, count?: number }[], value: string, onChange: (id: string) => void, variant?: 'board'|'segment', label?: string }} props
 */
export default function Tabs({ tabs, value, onChange, variant = 'board', label = 'Tabs', className }) {
  const refs = useRef([])

  function onKeyDown(e, index) {
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!dir) return
    e.preventDefault()
    const next = (index + dir + tabs.length) % tabs.length
    refs.current[next]?.focus()
    onChange(tabs[next].id)
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx(
        'flex overflow-x-auto rounded-card p-1',
        variant === 'board' ? 'bg-[#EEF2F7]' : 'gap-1 bg-[#EEF2F7]',
        className,
      )}
    >
      {tabs.map((tab, i) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              'relative min-h-10 flex-1 rounded-control px-4 text-sm whitespace-nowrap transition',
              focusRing,
              variant === 'board' && [
                'flex min-w-36 items-center justify-between gap-3 font-medium',
                active ? 'bg-active-fill text-accent' : 'text-navy hover:bg-white/60',
                // thin blue divider before every tab except the first and the active one
                i > 0 && !active &&
                  'before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-px before:bg-accent/50',
              ].filter(Boolean).join(' '),
              variant === 'segment' && [
                'min-w-24 font-medium',
                active ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-navy',
              ].join(' '),
            )}
          >
            {variant === 'board' ? (
              <>
                <span>{tab.label}</span>
                {tab.count != null && <span className="font-semibold">{tab.count}</span>}
              </>
            ) : (
              <span>
                {tab.label}
                {tab.count != null && ` - ${tab.count}`}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
