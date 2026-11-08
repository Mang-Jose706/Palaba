import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Logo from '../components/Logo.jsx'
import Notice from '../components/Notice.jsx'
import { useAuth } from '../components/AuthProvider.jsx'
import { changePassword } from '../api/index.js'

/**
 * Set a new password. New staff and riders land here on their first sign-in
 * (temporary password from the owner); anyone can open it from their account.
 */
export default function ChangePassword({ app = 'staff' }) {
  const { user, loading, refresh, signOut } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const home = app === 'rider' ? '/rider' : '/'

  if (loading) return null
  if (!user) return <Navigate to={app === 'rider' ? '/rider/login' : '/login'} replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (next !== again) return setError('The new passwords don’t match.')
    setBusy(true)
    try {
      await changePassword(user.id, { current, next })
      await refresh()
      navigate(home, { replace: true, state: { message: 'Password changed.' } })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <Card className="w-full max-w-[420px] px-6 py-8 sm:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <h1 className="text-2xl font-bold text-navy">Set a new password</h1>
          {user.mustChangePassword && (
            <p className="text-sm text-muted">Hi {user.name.split(' ')[0]}! You signed in with a temporary password. Choose your own to continue.</p>
          )}
        </div>
        <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
          <Input
            label={user.mustChangePassword ? 'Temporary password' : 'Current password'}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Input label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="At least 6 characters." />
          <Input label="New password again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
          {error && (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          )}
          <Button type="submit" fullWidth disabled={busy || !current || !next || !again} className="min-h-12">
            Save new password
          </Button>
          {user.mustChangePassword ? (
            <Button
              variant="ghost"
              fullWidth
              onClick={async () => {
                await signOut()
                navigate(app === 'rider' ? '/rider/login' : '/login', { replace: true })
              }}
            >
              Log out
            </Button>
          ) : (
            <Button variant="ghost" fullWidth to={home}>
              Cancel
            </Button>
          )}
        </form>
      </Card>
    </main>
  )
}
