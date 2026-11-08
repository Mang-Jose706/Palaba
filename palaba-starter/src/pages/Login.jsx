import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Info, Lock, User } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../components/AuthProvider.jsx'
import { cx, focusRing } from '../components/cx.js'

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const from = location.state?.from?.pathname ?? '/'

  if (!loading && user && user.role !== 'rider') return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await signIn(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <Card className="w-full max-w-[420px] px-6 py-9 sm:px-8">
        <div className="flex flex-col items-center gap-5">
          <Logo />
          <h1 className="text-[34px] leading-tight font-bold text-navy">Log in</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4">
          <Input
            label="Username"
            name="username"
            icon={User}
            placeholder="Enter your username"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
          <Input
            label="Password"
            name="password"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            end={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className={cx('grid size-10 place-items-center rounded-control text-navy hover:bg-bg', focusRing)}
              >
                {showPassword ? <EyeOff className="size-4.5" aria-hidden="true" /> : <Eye className="size-4.5" aria-hidden="true" />}
              </button>
            }
          />

          {error && (
            <p role="alert" className="rounded-control bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth disabled={busy} className="mt-2 min-h-12">
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            className={cx('inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 text-sm text-muted hover:text-navy', focusRing)}
          >
            <Info className="size-4" aria-hidden="true" />
            Forgot password?
          </button>
          {showHelp && (
            <p className="text-center text-[13px] text-muted">Ask the owner to reset your password in Settings.</p>
          )}
        </div>
      </Card>
    </main>
  )
}
