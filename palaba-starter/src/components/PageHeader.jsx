import { cx } from './cx.js'

/** Page title + subtitle on the left, actions (search, buttons) on the right. */
export default function PageHeader({ title, subtitle, children, className }) {
  return (
    <header className={cx('flex flex-col gap-4 md:flex-row md:items-center md:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center">{children}</div>}
    </header>
  )
}
