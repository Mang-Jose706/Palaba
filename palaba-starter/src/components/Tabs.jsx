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
 * @param {{ tabs: { id: string, label: string, shortLabel?: string, count?: number }[], value: string, onChange: (id: string) => void, variant?: 'board'|'segment', label?: string }} props
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
                // Phones (staff-mobile-dashboard.html): white pill, "Start 3" centered.
                'flex min-w-0 items-center justify-center gap-1.5 px-2 font-medium',
                active ? 'max-md:bg-surface max-md:text-navy max-md:shadow-sm' : 'max-md:text-muted',
                // Desktop (Figma): label left, count right, light-blue active fill, blue dividers.
                'md:min-w-36 md:justify-between md:gap-3 md:px-4',
                active ? 'md:bg-active-fill md:text-accent' : 'md:text-navy md:hover:bg-white/60',
                i > 0 && !active &&
                  'md:before:absolute md:before:top-1.5 md:before:bottom-1.5 md:before:left-0 md:before:w-px md:before:bg-accent/50',
              ].filter(Boolean).join(' '),
              variant === 'segment' && [
                'min-w-24 font-medium',
                active ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-navy',
              ].join(' '),
            )}
          >
            {variant === 'board' ? (
              <>
                {tab.shortLabel ? (
                  <span>
                    <span className="md:hidden">{tab.shortLabel}</span>
                    <span className="max-md:hidden">{tab.label}</span>
                  </span>
                ) : (
                  <span>{tab.label}</span>
                )}
                {tab.count != null && <span className="font-semibold max-md:text-accent">{tab.count}</span>}
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
