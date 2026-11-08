import { cx } from './cx.js'

/** Checkbox with a real <label>; 44px tall touch target. */
export default function Checkbox({ checked, onChange, children, disabled, className }) {
  return (
    <label
      className={cx(
        'flex min-h-control cursor-pointer items-start gap-3 py-2 text-sm leading-5 text-navy',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-px size-5 shrink-0 cursor-pointer rounded accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <span>{children}</span>
    </label>
  )
}
