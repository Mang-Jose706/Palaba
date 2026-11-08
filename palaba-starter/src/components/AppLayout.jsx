import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import MobileHeader, { MobileNav } from './MobileHeader.jsx'
import { useAuth } from './AuthProvider.jsx'

/** Staff/owner shell: left sidebar on desktop, top bar + bottom nav under 768px. */
export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg md:flex">
      <div className="sticky top-0 hidden h-screen md:block">
        <Sidebar user={user} onSignOut={handleSignOut} />
      </div>
      <MobileHeader user={user} onSignOut={handleSignOut} className="md:hidden" />
      <div className="min-w-0 flex-1 pb-24 md:pb-0">
        <Outlet />
      </div>
      <MobileNav className="md:hidden" />
    </div>
  )
}
