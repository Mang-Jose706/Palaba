import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, User } from 'lucide-react'
import AuthCard, { AuthError, PasswordInput } from '../components/AuthCard.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { requestPasswordReset, resetPasswordWithCode } from '../api/index.js'

/** Owner only: reset the password with a 6-digit code sent by text. */
export default function ForgotPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState(location.state?.username ?? '')
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendCode(e) {
    e?.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const { sentTo: to } = await requestPasswordReset(username)
      setSentTo(to)
      setCode('')
      if (e === undefined) setNotice(`New code sent to ${to}.`)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function reset(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (next !== again) return setError('The new passwords don’t match.')
    setBusy(true)
    try {
      await resetPasswordWithCode(username, { code, next })
      navigate('/login', { replace: true, state: { username: username.trim(), message: 'Password changed. Log in with your new password.' } })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthCard
      bubbles
      title="Reset password"
      subtitle={sentTo ? `We texted a 6-digit code to ${sentTo}. It expires in 10 minutes.` : 'For the owner account. We’ll text a 6-digit code to the owner’s mobile number.'}
      footer={
        <Button variant="ghost" fullWidth to="/login" state={{ username }}>
          Back to log in
        </Button>
      }
    >
      {!sentTo ? (
        <form onSubmit={sendCode} noValidate className="flex flex-col gap-4">
          <Input
            label="Owner username"
            name="username"
            icon={User}
            placeholder="Enter your username"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
          <AuthError>{error}</AuthError>
          <Button type="submit" fullWidth disabled={busy || !username.trim()} className="mt-2 min-h-12">
            {busy ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={reset} noValidate className="flex flex-col gap-4">
          <Input
            label="6-digit code"
            name="code"
            icon={KeyRound}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
          {notice && (
            <p role="status" className="rounded-control bg-success-bg px-3 py-2 text-sm text-success-fg">
              {notice}
            </p>
          )}
          <AuthError>{error}</AuthError>
          <Button type="submit" fullWidth disabled={busy || code.length !== 6 || !next || !again} className="mt-2 min-h-12">
            {busy ? 'Saving…' : 'Save new password'}
          </Button>
          <Button variant="ghost" fullWidth disabled={busy} onClick={() => sendCode()}>
            Send a new code
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
