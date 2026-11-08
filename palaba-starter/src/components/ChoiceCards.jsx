import { useId } from 'react'
import { cx } from './cx.js'

/**
 * Big selectable cards backed by real radio inputs (e.g. the service picker:
 * "Wash & dry · ₱140 per session").
 *
 * @param {{ name?: string, label: string, options: { value: string, title: string, caption?: string }[], value: string, onChange: (v: string) => void }} props
 */
export default function ChoiceCards({ name, label, options, value, onChange, className }) {
  const autoName = useId()
  return (
    <fieldset className={cx('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((o) => {
        const checked = o.value === value
        return (
          <label
            key={o.value}
            className={cx(
              'flex min-h-[70px] cursor-pointer flex-col justify-center rounded-control border px-4 py-3 transition',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2',
              checked ? 'border-2 border-accent bg-tint px-[15px]' : 'border-line bg-surface hover:border-accent/50',
            )}
          >
            <input
              type="radio"
              name={name ?? autoName}
              value={o.value}
              checked={checked}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className={cx('text-base font-semibold', checked ? 'text-accent' : 'text-navy')}>{o.title}</span>
            {o.caption && <span className={cx('text-[13px]', checked ? 'text-accent/80' : 'text-muted')}>{o.caption}</span>}
          </label>
        )
      })}
    </fieldset>
  )
}
