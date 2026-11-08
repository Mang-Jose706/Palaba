import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Notice from '../components/Notice.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Table, { Td, Th } from '../components/Table.jsx'
import { cx, focusRing } from '../components/cx.js'
import useApiData from '../components/useApiData.js'
import { useAuth } from '../components/AuthProvider.jsx'
import EditCustomerDialog from '../dialogs/EditCustomerDialog.jsx'
import { listCustomers } from '../api/index.js'
import { formatPeso } from '../utils/pricing.js'
import { formatMobile, formatShortDate } from '../utils/format.js'

export default function Customers() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // customer object, or {} for a new one
  const [notice, setNotice] = useState('')
  const all = useApiData(() => listCustomers(), [])
  const customers = (all.data ?? []).filter((c) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return c.name.toLowerCase().includes(q) || c.mobile.includes(q.replace(/\D/g, '') || '\u0000')
  })

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-5 md:px-8 md:py-8">
      <PageHeader
        title="Customers"
        subtitle={`${all.data?.length ?? 0} customers · Staff and the owner can edit details`}
      >
        <Button icon={Plus} onClick={() => setEditing({})}>
          Add customer
        </Button>
      </PageHeader>

      <Input
        icon={Search}
        type="search"
        placeholder="Search name or mobile"
        aria-label="Search customers"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-6 md:w-[340px]"
      />

      {notice && (
        <Notice tone="success" role="status" className="mt-4">
          {notice}
        </Notice>
      )}

      <Table caption="Customers" className="mt-5">
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th>Mobile number</Th>
            <Th>Address for pickups</Th>
            <Th>Orders</Th>
            <Th>Last order</Th>
            <Th>Amount due</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {all.loading && (
            <tr>
              <Td colSpan={7} className="py-10 text-center text-muted">
                Loading customers…
              </Td>
            </tr>
          )}
          {!all.loading && customers.length === 0 && (
            <tr>
              <Td colSpan={7} className="py-10 text-center text-muted">
                No customers match “{query}”.
              </Td>
            </tr>
          )}
          {customers.map((c) => (
            <tr key={c.id}>
              <Td>
                <Link
                  to={`/orders?q=${encodeURIComponent(c.mobile)}&period=all`}
                  title={`See ${c.name}'s orders`}
                  className={cx('rounded-sm font-medium whitespace-nowrap text-navy hover:text-accent hover:underline', focusRing)}
                >
                  {c.name}
                </Link>
              </Td>
              <Td className="whitespace-nowrap text-navy">{formatMobile(c.mobile)}</Td>
              <Td className="text-muted">{c.address || '—'}</Td>
              <Td className="text-navy">{c.orderCount}</Td>
              <Td className="whitespace-nowrap text-muted">{c.lastOrderAt ? formatShortDate(c.lastOrderAt) : '—'}</Td>
              <Td>
                {c.unpaidDue > 0 ? (
                  <Badge tone="warning">{formatPeso(c.unpaidDue)}</Badge>
                ) : (
                  <span className="text-muted">{formatPeso(0)}</span>
                )}
              </Td>
              <Td align="right">
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  aria-label={`Edit ${c.name}`}
                  className={cx('min-h-10 rounded-control px-3 text-sm font-medium text-accent hover:bg-tint', focusRing)}
                >
                  Edit
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {editing && (
        <EditCustomerDialog
          key={editing.id ?? 'new'}
          customer={editing}
          user={user}
          onClose={() => setEditing(null)}
          onDone={(text) => {
            setEditing(null)
            setNotice(text)
          }}
        />
      )}
    </main>
  )
}
