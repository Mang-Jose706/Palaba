import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import Card from './Card.jsx'
import useApiData from './useApiData.js'
import { cx, focusRing } from './cx.js'
import { getSettings, listOrders, listRiders, listStaff } from '../api/index.js'

/**
 * "Finish setting up your shop" for the owner of a new shop. Hides itself
 * once every step is done.
 */
export default function SetupChecklist() {
  const settings = useApiData(() => getSettings(), [])
  const staff = useApiData(() => listStaff(), [])
  const riders = useApiData(() => listRiders(), [])
  const orders = useApiData(() => listOrders(), [])
  if (!settings.data || !staff.data || !riders.data || !orders.data) return null

  const s = settings.data
  const steps = [
    {
      done: Boolean(s.shopName && s.shopPhone && s.shopAddress),
      label: 'Add your shop name, mobile number and address',
      hint: 'They appear on claim slips, texts and the tracking page.',
      to: '/settings',
    },
    {
      done: staff.data.length > 1 || riders.data.length > 0,
      label: 'Add your staff and riders',
      hint: 'Settings → Staff and riders. They can also sign up and you approve them.',
      to: '/settings',
    },
    {
      done: orders.data.length > 0,
      label: 'Create your first order',
      hint: 'Prices and fees use the defaults until you change them in Settings.',
      to: '/orders/new',
    },
  ]
  if (steps.every((st) => st.done)) return null
  const doneCount = steps.filter((st) => st.done).length

  return (
    <Card as="section" aria-label="Finish setting up your shop" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-navy">Finish setting up your shop</h2>
        <span className="text-sm text-muted">
          {doneCount} of {steps.length} done
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {steps.map((st) => (
          <li key={st.label}>
            <Link
              to={st.to}
              className={cx('flex min-h-control items-start gap-3 rounded-control p-2 hover:bg-bg', focusRing)}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2',
                  st.done ? 'border-accent bg-accent text-white' : 'border-[#C9D1D6]',
                )}
              >
                {st.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span>
                <span className={cx('block text-sm font-medium', st.done ? 'text-muted line-through' : 'text-navy')}>
                  {st.label}
                  <span className="sr-only">{st.done ? ' (done)' : ' (to do)'}</span>
                </span>
                {!st.done && <span className="block text-[13px] text-muted">{st.hint}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}
