import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import AuthCard, { AuthError, PasswordInput } from '../components/AuthCard.jsx'
import { useAuth } from '../components/AuthProvider.jsx'
import { useConfirm } from '../components/ConfirmProvider.jsx'
import { changePassword } from '../api/index.js'

/**
 * Set a new password. New staff and riders land here on their first sign-in
 * (temporary password from the owner); anyone can open it from their account.
 */
export default function ChangePassword({ app = 'staff' }) {
  const { user, loading, refresh, signOut } = useAuth()
  const confirm = useConfirm()
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
    <AuthCard
      title="New password"
      srTitle="Set a new password"
      subtitle={user.mustChangePassword ? `Hi ${user.name.split(' ')[0]}! You signed in with a temporary password. Choose your own to continue.` : undefined}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <PasswordInput
          label={user.mustChangePassword ? 'Temporary password' : 'Current password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <PasswordInput
          label="New password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <PasswordInput
          label="Confirm new password"
          placeholder="Enter it again"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        <AuthError>{error}</AuthError>
        <Button type="submit" fullWidth disabled={busy || !current || !next || !again} className="mt-2 min-h-12">
          Save new password
        </Button>
        {user.mustChangePassword ? (
          <Button
            variant="ghost"
            fullWidth
            onClick={async () => {
              if (!(await confirm({ title: 'Log out?', message: 'You’ll need your username and password to log in again.', confirmLabel: 'Log out', tone: 'warning' }))) return
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
    </AuthCard>
  )
}
