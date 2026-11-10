import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Bike, ChevronRight, Info, Store, User } from 'lucide-react'
import AuthCard, { AuthError, PasswordInput } from '../components/AuthCard.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { useAuth } from '../components/AuthProvider.jsx'
import useApiData from '../components/useApiData.js'
import { getSetupState } from '../api/index.js'
import { cx, focusRing } from '../components/cx.js'

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
  const setup = useApiData(() => getSetupState(), [])

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
      bubbles
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
          <SwitchAppLink app={app} />
        </>
      }
    >
      {setup.data && !setup.data.hasOwner && (
        <div className="mb-5 rounded-control bg-info-bg p-4 text-sm text-info-fg">
          <p className="font-semibold">New shop? Start here.</p>
          <p className="mt-0.5">There are no accounts yet. Create the owner account first, then add your staff and riders.</p>
          <Button to="/signup" fullWidth className="mt-3">
            Create the owner account
          </Button>
        </div>
      )}
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
        <div className="-mt-2 flex flex-col items-end">
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-controls="forgot-help"
            className={cx('inline-flex min-h-control items-center rounded-control px-1 text-[13px] font-semibold text-accent hover:underline max-md:min-h-control-mobile', focusRing)}
          >
            Forgot password?
          </button>
          {showHelp && (
            <p id="forgot-help" className="flex w-full items-start gap-2 rounded-control bg-info-bg px-3 py-2 text-[13px] text-info-fg">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Ask the owner to reset your password from Settings.
            </p>
          )}
        </div>
        <AuthError>{error}</AuthError>
        <Button type="submit" fullWidth disabled={busy} className="mt-2 min-h-12">
          {busy ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

    </AuthCard>
  )
}

/** Row that sends staff to the rider log in, and riders back to the shop log in. */
function SwitchAppLink({ app }) {
  const rider = app === 'rider'
  const Icon = rider ? Store : Bike
  return (
    <div className="mt-4 flex w-full flex-col gap-4 self-stretch">
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <Link
        to={rider ? '/login' : '/rider/login'}
        className={cx('flex items-center gap-3 rounded-control border border-line px-4 py-3 text-left transition-colors hover:border-accent hover:bg-tint', focusRing)}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint text-accent">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-navy">{rider ? 'Shop staff or owner?' : 'Are you a rider?'}</span>
          <span className="text-[13px] text-muted">{rider ? 'Log in to the shop' : 'Log in to see today’s trips'}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </div>
  )
}

export default function Login() {
  return <LoginCard app="staff" />
}
