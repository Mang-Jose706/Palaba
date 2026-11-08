import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser, signIn as apiSignIn, signOut as apiSignOut } from '../api/index.js'

const AuthContext = createContext(null)

/** Holds the signed-in staff/owner user for the whole app. */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (username, password, options) => {
    const u = await apiSignIn(username, password, options)
    setUser(u)
    return u
  }, [])

  /** Reload the signed-in user (e.g. after changing the password). */
  const refresh = useCallback(async () => {
    const u = await getCurrentUser()
    setUser(u)
    return u
  }, [])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, signIn, signOut, refresh }), [user, loading, signIn, signOut, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Rider pages: only a signed-in rider; everyone else goes to /rider/login. */
export function RequireRider({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user || user.role !== 'rider') return <Navigate to="/rider/login" replace state={{ from: location }} />
  // First sign-in with a temporary password: set a new one first.
  if (user.mustChangePassword) return <Navigate to="/rider/change-password" replace />
  return children
}

/**
 * Sends signed-out visitors to /login. With `ownerOnly`, staff are sent to the dashboard.
 */
export function RequireAuth({ ownerOnly = false, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user || user.role === 'rider') return <Navigate to="/login" replace state={{ from: location }} />
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />
  if (ownerOnly && user.role !== 'owner') return <Navigate to="/" replace />
  return children
}
