import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from './cx.js'
import { Field, fieldClasses } from './Input.jsx'

/**
 * Native <select> styled like Input.
 * @param {{ label?: string, hint?: string, error?: string, options: ({ value: string, label: string } | string)[], placeholder?: string }} props
 */
export default function Select({ label, hint, error, options = [], placeholder, className, id, ...rest }) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <Field id={selectId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${selectId}-msg` : undefined}
          className={cx(fieldClasses, 'appearance-none pr-10')}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            )
          })}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
      </div>
    </Field>
  )
}
