import { cx } from './cx.js'

/** White detergent-bottle icon (cap, handle, label) for the logo tile. */
function BottleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="9" y="2.5" width="5" height="3" rx="0.8" fill="currentColor" />
      <path
        d="M8 7.5c0-.8.7-1.5 1.5-1.5h4c.8 0 1.5.7 1.5 1.5V9h.5A2.5 2.5 0 0 1 18 11.5V19a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19v-7.5C6 10.1 6.9 9 8 8.6V7.5Z"
        fill="currentColor"
      />
      <rect x="9" y="13" width="6" height="4" rx="1" fill="#7493F7" opacity="0.55" />
    </svg>
  )
}

/**
 * Palaba logo: gradient tile + wordmark ("Pal" light blue, "aba" navy, weight 800).
 * @param {{ size?: 'sm'|'md'|'lg', showText?: boolean }} props
 */
export default function Logo({ size = 'md', showText = true, className }) {
  const tile = { sm: 'size-7 rounded-md', md: 'size-8 rounded-control', lg: 'size-12 rounded-card' }[size]
  const icon = { sm: 'size-4', md: 'size-5', lg: 'size-7' }[size]
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-3xl' }[size]
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span className={cx('bg-brand-gradient grid place-items-center text-white', tile)}>
        <BottleIcon className={icon} />
      </span>
      {showText && (
        <span className={cx('font-extrabold tracking-tight', text)}>
          <span className="text-logo">Pal</span>
          <span className="text-navy">aba</span>
        </span>
      )}
      {!showText && <span className="sr-only">Palaba</span>}
    </span>
  )
}
