import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import Card from './Card.jsx'
import Input from './Input.jsx'
import Logo from './Logo.jsx'
import { cx, focusRing } from './cx.js'

/**
 * Centered card with the logo and a big title (the log in layout),
 * shared by Log in, Sign up and Change password.
 */
export default function AuthCard({ title, srTitle, subtitle, children, footer }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <h1 className="sr-only">{srTitle ?? title}</h1>
      <Card className="w-full max-w-[420px] px-6 py-9 sm:px-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <Logo />
          <p aria-hidden="true" className="text-[34px] leading-tight font-bold text-navy">
            {title}
          </p>
          {subtitle && <p className="-mt-2 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-8 flex flex-col items-center gap-2 text-sm text-muted">{footer}</div>}
      </Card>
    </main>
  )
}

/** Password field with the lock icon and a show/hide eye button. */
export function PasswordInput({ label = 'Password', placeholder = 'Enter your password', autoComplete = 'current-password', ...rest }) {
  const [show, setShow] = useState(false)
  return (
    <Input
      label={label}
      icon={Lock}
      type={show ? 'text' : 'password'}
      placeholder={placeholder}
      autoComplete={autoComplete}
      end={
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className={cx('grid size-11 place-items-center rounded-control text-navy hover:bg-bg', focusRing)}
        >
          {show ? <EyeOff className="size-4.5" aria-hidden="true" /> : <Eye className="size-4.5" aria-hidden="true" />}
        </button>
      }
      {...rest}
    />
  )
}

/** Red error box used under auth forms. */
export function AuthError({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-control bg-danger-bg px-3 py-2 text-sm text-danger-fg">
      {children}
    </p>
  )
}
