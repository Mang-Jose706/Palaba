import { useState } from 'react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { createCustomer, updateCustomer } from '../api/index.js'
import { formatMobile, isValidMobile } from '../utils/format.js'
import { Caption, ErrorNotice, useSubmit } from './shared.jsx'

/** Edit a customer, or add a new one when `customer` has no id. */
export default function EditCustomerDialog({ customer = {}, user, onClose, onDone }) {
  const isNew = !customer.id
  const [form, setForm] = useState({
    name: customer.name ?? '',
    mobile: formatMobile(customer.mobile ?? ''),
    address: customer.address ?? '',
    landmark: customer.landmark ?? '',
    notes: customer.notes ?? '',
  })
  const [errors, setErrors] = useState({})
  const { busy, error, run } = useSubmit()
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function submit(e) {
    e?.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Enter the customer name.'
    if (!isValidMobile(form.mobile)) errs.mobile = 'Enter an 11-digit mobile number starting with 09.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    run(async () => {
      if (isNew) {
        await createCustomer(form)
        onDone(`Added ${form.name.trim()}.`)
      } else {
        await updateCustomer(customer.id, form, { by: user?.id })
        onDone(`Saved changes to ${form.name.trim()}.`)
      }
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Add customer' : 'Edit customer'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {isNew ? 'Add customer' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input label="Customer name" value={form.name} onChange={set('name')} error={errors.name} data-autofocus />
        <Input
          label="Mobile number"
          type="tel"
          inputMode="tel"
          value={form.mobile}
          onChange={set('mobile')}
          error={errors.mobile}
          hint="Order texts go to this number."
        />
        <Input label="Address for pickups (optional)" placeholder="House no., street, barangay" value={form.address} onChange={set('address')} />
        <Input label="Landmark (optional)" placeholder="Near a store, gate color" value={form.landmark} onChange={set('landmark')} />
        <Input label="Notes (optional)" value={form.notes} onChange={set('notes')} />
        {/* lets Enter submit the form */}
        <button type="submit" hidden />
      </form>
      <ErrorNotice error={error} />
      {!isNew && <Caption>Changes are saved with your name and the time.</Caption>}
    </Modal>
  )
}
