import { cx } from './cx.js'

/** White card with a 1px border and 12px radius. */
export default function Card({ as: Tag = 'div', padded = true, className, children, ...rest }) {
  return (
    <Tag className={cx('rounded-card border border-line bg-surface', padded && 'p-5', className)} {...rest}>
      {children}
    </Tag>
  )
}

/** Dashboard summary card: label, big value, optional caption. */
export function StatCard({ label, value, caption, className }) {
  return (
    <Card className={cx('flex min-h-31 flex-col', className)}>
      <span className="text-sm text-muted">{label}</span>
      <span className="mt-2 text-[28px] leading-9 font-bold text-navy">{value}</span>
      {caption && <span className="mt-1 text-[13px] text-muted">{caption}</span>}
    </Card>
  )
}
