import { useNavigate } from 'react-router-dom'
import { KeyRound, LogOut } from 'lucide-react'
import RiderShell from '../../components/RiderShell.jsx'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import { Avatar } from '../../components/Sidebar.jsx'
import { useAuth } from '../../components/AuthProvider.jsx'
import { formatMobile } from '../../utils/format.js'

export default function RiderAccount() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <RiderShell>
      <h1 className="text-2xl font-bold text-navy">Account</h1>
      <Card className="flex items-center gap-3 p-4">
        <Avatar name={user.name} className="size-12" />
        <div>
          <p className="font-semibold text-navy">{user.name}</p>
          <p className="text-sm text-muted">
            Rider · {formatMobile(user.mobile)} · @{user.username}
          </p>
        </div>
      </Card>
      <Button variant="secondary" icon={KeyRound} fullWidth to="/rider/change-password">
        Change password
      </Button>
      <Button
        variant="secondary"
        icon={LogOut}
        fullWidth
        onClick={async () => {
          await signOut()
          navigate('/rider/login', { replace: true })
        }}
      >
        Log out
      </Button>
    </RiderShell>
  )
}
