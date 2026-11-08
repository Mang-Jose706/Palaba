import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Checkbox from '../components/Checkbox.jsx'
import Input from '../components/Input.jsx'
import SegmentedControl from '../components/SegmentedControl.jsx'
import { addUser, updateUser } from '../api/index.js'
import { formatMobile, isValidMobile } from '../utils/format.js'
import { ErrorNotice, useSubmit } from './shared.jsx'

const ROLE_HELP = {
  staff: 'Staff can take orders, record payments, and edit customers.',
  rider: 'Riders only see their own trips. Staff can take orders, record payments, and edit customers.',
}

function suggestPassword() {
  return `palaba-${Math.floor(1000 + Math.random() * 9000)}`
}

/**
 * Add a staff member or rider (design/reference-html/add-staff-or-rider.html).
 * Pass `account` to edit an existing one instead (role and username stay fixed).
 */
export default function AddStaffOrRiderDialog({ account, defaultRole = 'staff', onClose, onDone }) {
  const editing = Boolean(account)
  const [role, setRole] = useState(account?.role ?? defaultRole)
  const [form, setForm] = useState({
    name: account?.name ?? '',
    mobile: account ? formatMobile(account.mobile) : '',
    username: account?.username ?? '',
    password: editing ? '' : suggestPassword(),
    active: account?.active ?? true,
  })
  const [errors, setErrors] = useState({})
  const { busy, error, run } = useSubmit()
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const isOwner = account?.role === 'owner'
  const roleWord = role === 'rider' ? 'rider' : 'staff'

  function submit(e) {
    e?.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Enter the full name.'
    if (!isValidMobile(form.mobile)) errs.mobile = 'Enter an 11-digit mobile number starting with 09.'
    if (!editing && !/^[a-z0-9._-]{3,}$/i.test(form.username.trim())) errs.username = 'Use at least 3 letters or numbers, no spaces.'
    if ((!editing || form.password) && form.password.length < 6) errs.password = 'Use at least 6 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    run(async () => {
      if (editing) {
        await updateUser(account.id, { name: form.name, mobile: form.mobile, active: form.active, password: form.password || undefined })
        onDone(`Saved changes to ${form.name.trim()}.`)
      } else {
        await addUser({ role, ...form })
        onDone(`Added ${form.name.trim()} as ${role === 'rider' ? 'a rider' : 'staff'}.`)
      }
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit ${account.name}` : 'Add staff or rider'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {editing ? 'Save changes' : `Add ${roleWord}`}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {!editing && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Role</span>
            <SegmentedControl
              label="Role"
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
        )}

        <Input label="Full name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="off" data-autofocus />
        <Input label="Mobile number" type="tel" inputMode="tel" value={form.mobile} onChange={set('mobile')} error={errors.mobile} />
        <Input
          label="Username"
          value={form.username}
          onChange={set('username')}
          error={errors.username}
          readOnly={editing}
          disabled={editing}
          autoCapitalize="none"
          autoComplete="off"
        />
        <Input
          label={editing ? 'New password (optional)' : 'Temporary password'}
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          autoComplete="new-password"
          hint="They'll set a new password the first time they sign in."
        />
        <Checkbox checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} disabled={isOwner}>
          Active (can sign in)
        </Checkbox>
        <button type="submit" hidden />
      </form>
      <ErrorNotice error={error} />
    </Modal>
  )
}
