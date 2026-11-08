import { cx } from './cx.js'

/**
 * Bordered data table matching the Figma lists (gray header row, row dividers).
 * Scrolls sideways inside its card on narrow screens instead of breaking the page.
 *
 *   <Table caption="Orders">
 *     <thead><tr><Th>Order</Th>…</tr></thead>
 *     <tbody><tr><Td>…</Td></tr></tbody>
 *   </Table>
 */
export default function Table({ caption, className, children }) {
  return (
    <div className={cx('overflow-x-auto rounded-card border border-line bg-surface', className)}>
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  )
}

export function Th({ className, children, align = 'left', ...rest }) {
  return (
    <th
      scope="col"
      className={cx(
        'border-b border-line bg-[#EEF2F4] px-3 py-3 text-[13px] first:pl-4 last:pr-4 font-normal whitespace-nowrap text-muted',
        align === 'right' && 'text-right',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

export function Td({ className, children, align = 'left', ...rest }) {
  return (
    <td
      className={cx('border-b border-line px-3 py-3.5 align-middle first:pl-4 last:pr-4 [tr:last-child>&]:border-b-0', align === 'right' && 'text-right', className)}
      {...rest}
    >
      {children}
    </td>
  )
}
