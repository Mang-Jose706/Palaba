import { useEffect, useId, useRef, useState } from 'react'
import { UserRound } from 'lucide-react'
import Input from './Input.jsx'
import { cx } from './cx.js'
import { listCustomers } from '../api/index.js'
import { formatMobile } from '../utils/format.js'

const MAX_RESULTS = 6

/**
 * Customer name box with saved-customer suggestions (accessible combobox).
 * Typing part of a name or number lists matching customers; picking one
 * calls onSelect(customer). Free typing still works for new customers.
 *
 * @param {{ value: string, onChange: (text: string) => void, onSelect: (customer: object) => void, error?: string, hint?: string, selectedId?: string }} props
 */
export default function CustomerSearchInput({ value, onChange, onSelect, error, hint, selectedId, label = 'Customer name' }) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [active, setActive] = useState(0)
  const blurTimer = useRef(null)

  // Search saved customers as the staff types.
  useEffect(() => {
    const q = value.trim()
    if (!open || q.length < 1) {
      setResults([])
      return
    }
    let alive = true
    listCustomers({ search: q }).then((list) => {
      if (!alive) return
      setResults(list.slice(0, MAX_RESULTS))
      setActive(0)
    })
    return () => {
      alive = false
    }
  }, [value, open])

  function pick(c) {
    onSelect(c)
    setOpen(false)
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (!results.length) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
    }
  }

  const showList = open && value.trim().length > 0
  const optionId = (i) => `${listId}-opt-${i}`

  return (
    <div className="relative">
      <Input
        label={label}
        autoComplete="off"
        placeholder="Type a name or pick a saved customer"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120)
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results.length ? optionId(active) : undefined}
        error={error}
        hint={hint}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Saved customers"
          className="absolute right-0 left-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-control border border-line bg-surface py-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault() /* keep focus in the input */}
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted" role="presentation">
              No saved customer matches. A new customer will be added with this order.
            </li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c)}
                className={cx(
                  'flex min-h-control cursor-pointer items-center gap-3 px-3 py-2 max-md:min-h-control-mobile',
                  i === active ? 'bg-tint' : 'hover:bg-bg',
                )}
              >
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-tint text-accent">
                  <UserRound className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy">
                    {c.name}
                    {c.id === selectedId && <span className="font-normal text-muted"> · selected</span>}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {formatMobile(c.mobile)} · {c.orderCount} {c.orderCount === 1 ? 'order' : 'orders'}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
