// Staff, owner and rider accounts + mock sign-in.

import { getData, mutate, newId, respond } from './store.js'
import { isValidMobile, normalizeMobile } from '../utils/format.js'

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
    if (allUsers(data).some((u) => u.username === username.trim())) throw new Error('That username is taken')
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
    if ('active' in patch) u.active = Boolean(patch.active)
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
  const user = pool.find((u) => u.username === username?.trim() && u.password === password)
  if (!user) throw new Error('Wrong username or password')
  if (!user.active) throw new Error('This account is turned off. Ask the owner.')
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, app }))
  } catch {
    // ignore
  }
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
    return respond(publicUser(allUsers(getData()).find((u) => u.id === session.id) ?? null))
  } catch {
    return respond(null)
  }
}
