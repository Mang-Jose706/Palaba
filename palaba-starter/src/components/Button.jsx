import { Link } from 'react-router-dom'
import { cx, focusRing } from './cx.js'

const VARIANTS = {
  primary: 'bg-brand-gradient text-white hover:brightness-95 shadow-sm',
  secondary: 'bg-tint text-accent hover:bg-[#dce9fd]',
  danger: 'bg-danger-bg text-danger-fg hover:bg-[#f7dcd8]',
  ghost: 'bg-transparent text-accent hover:bg-tint',
}

const SIZES = {
  md: 'min-h-control px-4 text-sm', // 44px desktop, 48px on phones
  sm: 'min-h-9 px-3 text-[13px]',
}

/**
 * Button. Renders a <Link> when `to` is given, otherwise a real <button>.
 * @param {{ variant?: 'primary'|'secondary'|'danger'|'ghost', size?: 'md'|'sm', icon?: React.ComponentType, fullWidth?: boolean, to?: string }} props
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  fullWidth = false,
  to,
  type = 'button',
  className,
  children,
  ...rest
}) {
  const classes = cx(
    'inline-flex items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100',
    size === 'md' && 'max-md:min-h-control-mobile',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    focusRing,
    className,
  )
  const content = (
    <>
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {children}
    </>
  )
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }
  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  )
}
