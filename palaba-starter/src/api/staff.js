// Staff, owner and rider accounts + mock sign-in.

import { getData, mutate, newId, respond } from './store.js'
import { isValidMobile, normalizeMobile } from '../utils/format.js'
import { needsRider } from '../utils/orderRules.js'

const SESSION_KEY = 'palaba:session'

function publicUser(u) {
  if (!u) return null
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = u
  return rest
}

function allUsers(data) {
  return [...data.staff, ...data.riders]
}

export async function listStaff() {
  return respond(getData().staff.map(publicUser))
}

export async function listRiders({ activeOnly = false } = {}) {
  return respond(getData().riders.filter((r) => !activeOnly || r.active).map(publicUser))
}

/**
 * Add a staff member or rider (Add staff or rider dialog).
 * @param {{ role: 'staff'|'rider', name, mobile, username, password, active? }} input
 */
export async function addUser({ role, name, mobile, username, password, active = true }) {
  if (!['staff', 'rider'].includes(role)) throw new Error('Choose staff or rider')
  if (!name?.trim() || !mobile?.trim() || !username?.trim() || !password) {
    throw new Error('Fill in all fields')
  }
  if (!isValidMobile(mobile)) throw new Error('Enter an 11-digit mobile number starting with 09')
  if (password.length < 6) throw new Error('The temporary password needs at least 6 characters')
  const user = mutate((data) => {
    if (allUsers(data).some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) throw new Error('That username is taken')
    const u = { id: newId(role === 'rider' ? 'r' : 'u'), role, name: name.trim(), mobile: normalizeMobile(mobile), username: username.trim(), password, active, mustChangePassword: true }
    data[role === 'rider' ? 'riders' : 'staff'].push(u)
    return u
  })
  return respond(publicUser(user))
}

/**
 * Edit a staff member or rider. Username can't change; a new password is optional.
 * @param {{ name?, mobile?, active?, password? }} patch
 */
export async function updateUser(id, patch) {
  const user = mutate((data) => {
    const u = allUsers(data).find((x) => x.id === id)
    if (!u) throw new Error('User not found')
    if ('name' in patch && !patch.name?.trim()) throw new Error('Enter the full name')
    if ('mobile' in patch && !isValidMobile(patch.mobile)) throw new Error('Enter an 11-digit mobile number starting with 09')
    if (u.role === 'owner' && patch.active === false) throw new Error("The owner account can't be turned off")
    if ('name' in patch) u.name = patch.name.trim()
    if ('mobile' in patch) u.mobile = normalizeMobile(patch.mobile)
    if ('active' in patch) {
      u.active = Boolean(patch.active)
      if (u.active) u.pending = false // turning on = approving a sign-up
    }
    if (patch.password) {
      u.password = patch.password
      u.mustChangePassword = true
    }
    return u
  })
  return respond(publicUser(user))
}

export async function setUserActive(id, active) {
  const user = mutate((data) => {
    const u = allUsers(data).find((x) => x.id === id)
    if (!u) throw new Error('User not found')
    if (u.role === 'owner' && !active) throw new Error("The owner account can't be turned off")
    u.active = active
    return u
  })
  return respond(publicUser(user))
}

/** Mock sign-in. `app` is 'staff' (owner + staff) or 'rider'. */
export async function signIn(username, password, { app = 'staff' } = {}) {
  const data = getData()
  const pool = app === 'rider' ? data.riders : data.staff
  const name = username?.trim().toLowerCase()
  const user = pool.find((u) => u.username.toLowerCase() === name && u.password === password)
  if (!user) {
    // Right account, wrong log in page: say where to go instead.
    const other = (app === 'rider' ? data.staff : data.riders).find((u) => u.username.toLowerCase() === name && u.password === password)
    if (other) {
      throw new Error(app === 'rider' ? 'This is a staff account. Use the staff log in at /login.' : 'This is a rider account. Use the rider log in at /rider/login.')
    }
    throw new Error('Wrong username or password')
  }
  if (user.pending) throw new Error('Your account is waiting for the owner’s approval.')
  if (!user.active) throw new Error('This account is turned off. Ask the owner.')
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, app }))
  } catch {
    // ignore
  }
  return respond(publicUser(user))
}

/**
 * Sign up (public). The account can't sign in until the owner approves it
 * (Settings → Staff and riders), so strangers can't give themselves access.
 * Exception: when the shop has no owner yet, the first sign-up becomes the
 * owner and is active right away.
 * @param {{ role: 'staff'|'rider', name, mobile, username, password }} input
 * @returns {{ user, pending: boolean }}
 */
export async function signUp({ role = 'staff', name, mobile, username, password }) {
  if (!['staff', 'rider'].includes(role)) throw new Error('Choose staff or rider')
  if (!name?.trim()) throw new Error('Enter your full name')
  if (!isValidMobile(mobile)) throw new Error('Enter an 11-digit mobile number starting with 09')
  if (!/^[a-z0-9._-]{3,}$/i.test(username?.trim() ?? '')) throw new Error('Username: at least 3 letters or numbers, no spaces')
  if (!password || password.length < 6) throw new Error('Password: at least 6 characters')
  const result = mutate((data) => {
    const uname = username.trim().toLowerCase()
    if (allUsers(data).some((u) => u.username.toLowerCase() === uname)) throw new Error('That username is taken')
    if (allUsers(data).some((u) => normalizeMobile(u.mobile) === normalizeMobile(mobile))) {
      throw new Error('An account with this mobile number already exists')
    }
    const firstOwner = !data.staff.some((u) => u.role === 'owner' && u.active)
    const finalRole = firstOwner ? 'owner' : role
    const u = {
      id: newId(finalRole === 'rider' ? 'r' : 'u'),
      role: finalRole,
      name: name.trim(),
      mobile: normalizeMobile(mobile),
      username: username.trim(),
      password,
      active: firstOwner,
      pending: !firstOwner,
      createdAt: new Date().toISOString(),
    }
    data[finalRole === 'rider' ? 'riders' : 'staff'].push(u)
    return { user: u, pending: !firstOwner }
  })
  return respond({ user: publicUser(result.user), pending: result.pending })
}

/** Public: does this shop have an owner yet? (A new shop shows "Create the owner account".) */
export async function getSetupState() {
  const data = getData()
  return respond({ hasOwner: data.staff.some((u) => u.role === 'owner' && u.active) })
}

/**
 * Owner deletes a staff or rider account. The owner account can't be deleted,
 * and a rider who still has trips ahead must have them reassigned first.
 * Past orders keep their history; anyone signed in with the account is
 * signed out on their next screen.
 */
export async function deleteUser(id) {
  mutate((data) => {
    const u = allUsers(data).find((x) => x.id === id)
    if (!u) throw new Error('User not found')
    if (u.role === 'owner') throw new Error('The owner account can’t be deleted.')
    if (u.role === 'rider') {
      const trips = data.orders.filter((o) => o.riderId === id && needsRider(o)).map((o) => o.id)
      if (trips.length) {
        throw new Error(`${u.name} still has ${trips.length === 1 ? 'a trip' : `${trips.length} trips`} (${trips.join(', ')}). Reassign ${trips.length === 1 ? 'it' : 'them'} to another rider first.`)
      }
    }
    data.staff = data.staff.filter((x) => x.id !== id)
    data.riders = data.riders.filter((x) => x.id !== id)
  })
  return respond(true)
}

/** Owner rejects a sign-up request: the waiting account is deleted. */
export async function rejectSignUp(id) {
  mutate((data) => {
    const u = allUsers(data).find((x) => x.id === id)
    if (!u) throw new Error('User not found')
    if (!u.pending) throw new Error('Only accounts waiting for approval can be rejected. Turn this account off instead.')
    data.staff = data.staff.filter((x) => x.id !== id)
    data.riders = data.riders.filter((x) => x.id !== id)
  })
  return respond(true)
}

/** Owner approves a signed-up account so it can sign in. */
export async function approveUser(id) {
  return updateUser(id, { active: true })
}

/**
 * Set a new password (first sign-in with a temporary password, or any time).
 * Clears the "must change password" flag.
 */
export async function changePassword(id, { current, next }) {
  if (!next || next.length < 6) throw new Error('Use at least 6 characters.')
  const user = mutate((data) => {
    const u = allUsers(data).find((x) => x.id === id)
    if (!u) throw new Error('User not found')
    if (u.password !== current) throw new Error('Your current password is wrong.')
    if (next === current) throw new Error('Choose a password different from the temporary one.')
    u.password = next
    u.mustChangePassword = false
    return u
  })
  return respond(publicUser(user))
}

export async function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
  return respond(null)
}

export async function getCurrentUser() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
    if (!session) return respond(null)
    const user = allUsers(getData()).find((u) => u.id === session.id)
    // A turned-off (or deleted) account is signed out.
    if (!user || !user.active) {
      localStorage.removeItem(SESSION_KEY)
      return respond(null)
    }
    return respond(publicUser(user))
  } catch {
    return respond(null)
  }
}
