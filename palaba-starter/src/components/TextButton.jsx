import { cx, focusRing } from './cx.js'

/** Small text-style button ("Edit", "Add note") that still meets the 44px (48px on phones) touch size. */
export default function TextButton({ className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-control items-center rounded-control px-3 text-sm font-medium text-accent hover:bg-tint max-md:min-h-control-mobile',
        focusRing,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
