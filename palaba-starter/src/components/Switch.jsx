import { useId } from 'react'
import { cx, focusRing } from './cx.js'

/**
 * On/off switch with a title and description (Settings text switches).
 * Uses role="switch" so screen readers announce on/off.
 */
export default function Switch({ checked, onChange, label, description, disabled, className }) {
  const id = useId()
  return (
    <div className={cx('flex min-h-control items-center justify-between gap-4 rounded-control border border-line px-4 py-3', className)}>
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-[15px] font-medium text-navy">
          {label}
        </p>
        {description && (
          <p id={`${id}-desc`} className="text-[13px] text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-[#1B5A9E]' : 'bg-[#C9D1D6]',
          focusRing,
        )}
      >
        <span
          aria-hidden="true"
          className={cx('absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')}
        />
      </button>
    </div>
  )
}
