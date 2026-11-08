import { Check } from 'lucide-react'
import { cx } from './cx.js'
import { statusSteps } from '../utils/orderRules.js'
import { formatDateTime, formatShortDate } from '../utils/format.js'

/**
 * Step tracker for an order. Steps and the current step come from
 * orderRules.statusSteps(), so it always matches the real status.
 * Horizontal from 640px, vertical on small phones.
 */
export default function StatusTracker({ order, className }) {
  const steps = statusSteps(order)
  const currentIndex = steps.findIndex((s) => s.state === 'current')

  return (
    <ol className={cx('flex flex-col gap-0 sm:flex-row', className)} aria-label="Order progress">
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        const done = step.state === 'done'
        const current = step.state === 'current'
        const sub = current
          ? `${step.at ? `${formatShortDate(step.at)} · ` : ''}Current`
          : done
            ? step.at
              ? formatDateTime(step.at)
              : 'Done'
            : 'Not started'
        return (
          <li
            key={step.status}
            aria-current={current ? 'step' : undefined}
            className="relative flex min-w-0 flex-1 gap-3 pb-5 sm:flex-col sm:gap-0 sm:pb-0"
          >
            {/* connector line to the next step */}
            {!last && (
              <span
                aria-hidden="true"
                className={cx(
                  'absolute top-6 bottom-0 left-[11px] w-0.5 sm:top-[11px] sm:right-0 sm:bottom-auto sm:left-7 sm:h-0.5 sm:w-auto',
                  done ? 'bg-accent' : 'bg-line',
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cx(
                'relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2',
                done && 'border-accent bg-accent text-white',
                current && 'border-[#1B5A9E] bg-surface ring-4 ring-info-bg',
                !done && !current && 'border-[#C9D1D6] bg-surface',
              )}
            >
              {done && <Check className="size-3.5" strokeWidth={3} />}
              {current && <span className="size-2.5 rounded-full bg-[#1B5A9E]" />}
            </span>
            <span className="flex flex-col sm:mt-3 sm:pr-3">
              <span className={cx('text-[15px] font-medium', done || current ? 'text-navy' : 'text-muted')}>{step.label}</span>
              <span className={cx('text-xs', current ? 'text-info-fg' : 'text-muted')}>
                {sub}
                <span className="sr-only">{done ? ' (done)' : ''}</span>
              </span>
            </span>
          </li>
        )
      })}
      {order.status === 'cancelled' && <li className="sr-only">Cancelled after step {currentIndex + 1}</li>}
    </ol>
  )
}
