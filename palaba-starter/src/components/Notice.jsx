import { cx } from './cx.js'

const TONES = {
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
  success: 'bg-success-bg text-success-fg',
  neutral: 'bg-[#F3F5F6] text-navy',
}

/** Colored message box: warnings, rule explanations, confirmations. */
export default function Notice({ tone = 'warning', role, className, children }) {
  return (
    <div role={role} className={cx('rounded-control px-3 py-2.5 text-sm leading-5', TONES[tone], className)}>
      {children}
    </div>
  )
}
