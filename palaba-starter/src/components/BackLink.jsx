import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cx, focusRing } from './cx.js'

/** "← Back to board" link above page titles. */
export default function BackLink({ to = '/', children = 'Back to board', className }) {
  return (
    <Link
      to={to}
      className={cx('inline-flex min-h-8 items-center gap-1.5 rounded-sm text-[13px] font-medium text-navy hover:text-accent', focusRing, className)}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  )
}
