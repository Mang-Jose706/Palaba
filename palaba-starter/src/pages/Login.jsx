import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Info, User } from 'lucide-react'
import AuthCard, { AuthError, PasswordInput } from '../components/AuthCard.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../components/AuthProvider.jsx'
import { cx, focusRing } from '../components/cx.js'

// Mock accounts, shown only while developing (npm run dev) so nobody gets locked out.
const DEMO_ACCOUNTS = {
  staff: [
    { username: 'ana', who: 'Owner' },
    { username: 'bea', who: 'Staff' },
  ],
  rider: [
    { username: 'arnel', who: 'Rider' },
    { username: 'jun', who: 'Rider' },
  ],
}

export const linkClass = cx('rounded-sm font-semibold text-accent hover:underline', focusRing)

/**
 * Log in card shared by staff/owner (/login) and riders (/rider/login).
 * @param {{ app?: 'staff'|'rider' }} props
 */
export function LoginCard({ app = 'staff' }) {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState(location.state?.username ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const home = app === 'rider' ? '/rider' : '/'
  const from = location.state?.from?.pathname ?? home
  const signedInHere = user && (app === 'rider' ? user.role === 'rider' : user.role !== 'rider')

  if (!loading && signedInHere) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await signIn(username, password, { app })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Log in"
      srTitle={app === 'rider' ? 'Rider log in' : 'Log in'}
      footer={
        <>
          <p>
            Don’t have an account?{' '}
            <Link to={app === 'rider' ? '/signup?role=rider' : '/signup'} className={linkClass}>
              Sign up
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            className={cx('inline-flex min-h-control items-center gap-1.5 rounded-control px-2 text-sm text-muted hover:text-navy', focusRing)}
          >
            <Info className="size-4" aria-hidden="true" />
            Forgot password?
          </button>
          {showHelp && <p className="text-center text-[13px]">Ask the owner to reset your password.</p>}
          <p className="text-[13px]">
            {app === 'rider' ? (
              <>
                Shop staff?{' '}
                <Link to="/login" className={linkClass}>
                  Staff log in
                </Link>
              </>
            ) : (
              <>
                Rider?{' '}
                <Link to="/rider/login" className={linkClass}>
                  Rider log in
                </Link>
              </>
            )}
          </p>
        </>
      }
    >
      {location.state?.message && (
        <p role="status" className="mb-4 rounded-control bg-success-bg px-3 py-2 text-sm text-success-fg">
          {location.state.message}
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
        <PasswordInput
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <AuthError>{error}</AuthError>
        <Button type="submit" fullWidth disabled={busy} className="mt-2 min-h-12">
          {busy ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-6 rounded-control border border-dashed border-line p-3 text-[13px] text-muted">
          <p className="font-semibold text-navy">Demo accounts (password: palaba123)</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS[app].map((a) => (
              <button
                key={a.username}
                type="button"
                onClick={() => {
                  setUsername(a.username)
                  setPassword('palaba123')
                  setError('')
                }}
                className={cx('min-h-control rounded-control bg-tint px-3 font-medium text-accent hover:bg-[#dce9fd]', focusRing)}
              >
                {a.who}: {a.username}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthCard>
  )
}

export default function Login() {
  return <LoginCard app="staff" />
}
