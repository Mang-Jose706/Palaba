import { useId } from 'react'
import { cx } from './cx.js'

export const fieldClasses =
  'w-full min-h-control max-md:min-h-control-mobile rounded-control border border-line bg-surface px-3 text-sm text-navy ' +
  'placeholder:text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 ' +
  'disabled:bg-bg disabled:text-muted aria-invalid:border-danger-fg aria-invalid:focus:ring-danger-fg/30'

/** Label + hint + error wrapper shared by Input and Select. */
export function Field({ id, label, hint, error, className, children }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-navy">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs text-danger-fg">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/**
 * Text input with a real <label>.
 * @param {{ label?: string, hint?: string, error?: string, icon?: React.ComponentType, suffix?: string, end?: React.ReactNode }} props
 *   `end` is an interactive element inside the right edge (e.g. a show-password button).
 */
export default function Input({ label, hint, error, icon: Icon, suffix, end, className, id, ...rest }) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field id={inputId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        {Icon && (
          <Icon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted" />
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${inputId}-msg` : undefined}
          className={cx(fieldClasses, Icon && 'pl-10', (suffix || end) && 'pr-12')}
          {...rest}
        />
        {end && <span className="absolute top-1/2 right-1 -translate-y-1/2">{end}</span>}
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">{suffix}</span>
        )}
      </div>
    </Field>
  )
}
