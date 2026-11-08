import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AtSign, CircleCheck, Phone, User } from 'lucide-react'
import AuthCard, { AuthError, PasswordInput } from '../components/AuthCard.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import SegmentedControl from '../components/SegmentedControl.jsx'
import { useAuth } from '../components/AuthProvider.jsx'
import { linkClass } from './Login.jsx'
import { signUp } from '../api/index.js'
import { formatMobile, isValidMobile } from '../utils/format.js'

const ROLE_HELP = {
  staff: 'Staff take orders, record payments, and edit customers.',
  rider: 'Riders do home pickups and deliveries and only see their own trips.',
}

/**
 * Sign up (same layout as Log in). New accounts wait for the owner's approval
 * before they can sign in; the very first account of a new shop becomes the
 * owner and is signed in right away.
 */
export default function SignUp() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [params] = useSearchParams()
  const [role, setRole] = useState(params.get('role') === 'rider' ? 'rider' : 'staff')
  const [form, setForm] = useState({ name: '', mobile: '', username: '', password: '', again: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null) // { name, username, role }
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const loginPath = role === 'rider' ? '/rider/login' : '/login'

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Enter your full name.'
    if (!isValidMobile(form.mobile)) e.mobile = 'Enter an 11-digit mobile number starting with 09.'
    if (!/^[a-z0-9._-]{3,}$/i.test(form.username.trim())) e.username = 'At least 3 letters or numbers, no spaces.'
    if (form.password.length < 6) e.password = 'At least 6 characters.'
    if (form.again !== form.password) e.again = 'The passwords don’t match.'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    setError('')
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const { user, pending } = await signUp({ role, name: form.name, mobile: form.mobile, username: form.username, password: form.password })
      if (!pending) {
        // First account of a new shop: the owner. Sign in and go to the dashboard.
        await signIn(form.username, form.password, { app: 'staff' })
        navigate('/', { replace: true })
        return
      }
      setDone({ name: user.name, username: user.username, role: user.role })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthCard title="Request sent" srTitle="Sign up request sent">
        <div className="flex flex-col items-center gap-4 text-center">
          <CircleCheck className="size-12 text-success-fg" aria-hidden="true" />
          <p className="text-sm text-navy">
            Thanks, {done.name.split(' ')[0]}! Your {done.role === 'rider' ? 'rider' : 'staff'} account <strong>@{done.username}</strong> was created.
          </p>
          <p className="text-sm text-muted">
            The shop owner needs to approve it first (Settings → Staff and riders). You can log in once it’s approved.
          </p>
          <Button fullWidth className="min-h-12" onClick={() => navigate(done.role === 'rider' ? '/rider/login' : '/login', { state: { username: done.username } })}>
            Back to log in
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Sign up"
      footer={
        <p>
          Already have an account?{' '}
          <Link to={loginPath} className={linkClass}>
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-navy">I am a</span>
          <SegmentedControl
            label="Account type"
            options={[
              { value: 'staff', label: 'Staff' },
              { value: 'rider', label: 'Rider' },
            ]}
            value={role}
            onChange={setRole}
            size="lg"
          />
          <p className="text-[13px] text-muted">{ROLE_HELP[role]}</p>
        </div>

        <Input label="Full name" icon={User} placeholder="Enter your full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <Input
          label="Mobile number"
          icon={Phone}
          type="tel"
          inputMode="tel"
          placeholder="0917 555 0142"
          autoComplete="tel"
          value={form.mobile}
          onChange={set('mobile')}
          onBlur={() => isValidMobile(form.mobile) && setForm((f) => ({ ...f, mobile: formatMobile(f.mobile) }))}
          error={errors.mobile}
        />
        <Input
          label="Username"
          icon={AtSign}
          placeholder="Choose a username"
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          onChange={set('username')}
          error={errors.username}
        />
        <PasswordInput
          placeholder="At least 6 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />
        <PasswordInput
          label="Confirm password"
          placeholder="Enter your password again"
          autoComplete="new-password"
          value={form.again}
          onChange={set('again')}
          error={errors.again}
        />

        <AuthError>{error}</AuthError>
        <Button type="submit" fullWidth disabled={busy} className="mt-2 min-h-12">
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-[13px] text-muted">The shop owner approves new accounts before they can log in.</p>
      </form>
    </AuthCard>
  )
}
