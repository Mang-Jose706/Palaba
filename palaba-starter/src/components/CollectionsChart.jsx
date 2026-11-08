import { useState } from 'react'
import { cx } from './cx.js'
import { formatPeso } from '../utils/pricing.js'
import { formatLongDay } from '../utils/format.js'

// One series, so one hue; today is emphasized with the darker step.
// Colors checked with the dataviz validator (lightness, chroma, CVD all pass).
// Bars sit below 3:1 contrast, so every bar has a visible value label and the
// data is also available as a table for screen readers.
const BAR = '#6FA0EA'
const BAR_TODAY = '#1B5A9E'

/**
 * Collections per day as vertical bars.
 * @param {{ days: { key, date, label, total, count, isToday }[] }} props
 */
export default function CollectionsChart({ days, height = 170, className }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...days.map((d) => d.total))

  return (
    <figure className={cx('relative', className)}>
      <div className="flex items-end gap-2 sm:gap-3" style={{ height: height + 48 }} aria-hidden="true">
        {days.map((d, i) => {
          const h = d.total ? Math.max(4, Math.round((d.total / max) * height)) : 0
          const active = hover === i
          return (
            <div
              key={d.key}
              className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="mb-1.5 text-xs whitespace-nowrap text-muted">{formatPeso(d.total)}</span>
              <span
                className={cx('w-full rounded-t-[4px] transition-opacity', hover != null && !active && 'opacity-60')}
                style={{ height: h, background: d.isToday ? BAR_TODAY : BAR }}
              />
              {/* baseline */}
              <span className="h-px w-full bg-line" />
              <span className={cx('mt-2 text-[13px]', d.isToday ? 'font-semibold text-navy' : 'text-muted')}>{d.label}</span>

              {active && (
                <span
                  role="presentation"
                  className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-control bg-navy px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
                >
                  <span className="block font-semibold">{formatLongDay(d.date)}</span>
                  {formatPeso(d.total)} · {d.count} {d.count === 1 ? 'payment' : 'payments'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Accessible version of the chart */}
      <table className="sr-only">
        <caption>Collections per day, last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Collected</th>
            <th scope="col">Payments</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.key}>
              <th scope="row">
                {formatLongDay(d.date)}
                {d.isToday ? ' (today)' : ''}
              </th>
              <td>{formatPeso(d.total)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
