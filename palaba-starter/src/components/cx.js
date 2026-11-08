/** Join class names, skipping falsy values: cx('a', ok && 'b') */
export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

/** Shared focus ring for every interactive element. */
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
