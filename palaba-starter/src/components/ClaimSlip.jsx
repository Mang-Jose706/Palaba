import { QRCodeSVG } from 'qrcode.react'
import PriceLines from './PriceLines.jsx'
import { cx } from './cx.js'
import { isPaid, paymentLabel, paymentOptionLabel, PAYMENT_METHODS } from '../utils/orderRules.js'
import { orderPrice } from '../utils/pricing.js'
import { formatDateTime, formatLongDay, fromDateKey, formatMobile } from '../utils/format.js'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-navy">{children}</dd>
    </div>
  )
}

/**
 * Printable claim slip. The QR code opens the customer tracking page /t/:code.
 * Has the `print-slip` class so only the slip prints (see index.css).
 */
export default function ClaimSlip({ order, settings, trackingUrl, className }) {
  const price = orderPrice(order)
  const paid = isPaid(order)
  const methodLabel = PAYMENT_METHODS.find((m) => m.id === order.payment?.method)?.label
  const isPickup = order.type === 'home_pickup'

  return (
    <article aria-label={`Claim slip ${order.id}`} className={cx('print-slip rounded-card border border-line bg-surface p-6', className)}>
      <header className="text-center">
        <p className="text-lg font-semibold text-navy">{settings?.shopName}</p>
        <p className="text-[13px] text-muted">{settings?.shopPhone}</p>
      </header>

      <div className="mx-auto mt-4 grid size-40 place-items-center rounded-control border border-line bg-white p-2.5">
        <QRCodeSVG value={trackingUrl} size={136} level="M" title={`Tracking link for ${order.id}`} fgColor="#232F5C" />
      </div>

      <p className="mt-3 text-center text-[32px] leading-10 font-bold tracking-tight text-navy">{order.id}</p>
      <p className="text-center text-[13px] text-muted">Scan to check your order</p>

      <dl className="mt-5 flex flex-col gap-2.5 text-sm">
        <Row label="Customer">{order.customer?.name}</Row>
        <Row label="Mobile">{formatMobile(order.customer?.mobile)}</Row>
        {isPickup ? (
          <>
            <Row label="Pickup">
              {order.pickup?.date && formatLongDay(fromDateKey(order.pickup.date))}, {order.pickup?.window}
            </Row>
            <Row label="After washing">{order.returnMethod === 'home_delivery' ? 'Delivered home' : 'Pickup at the shop'}</Row>
          </>
        ) : (
          <>
            <Row label="Received">{formatDateTime(order.createdAt)}</Row>
            {order.promisedAt && <Row label="Pickup at the shop">{formatDateTime(order.promisedAt)}</Row>}
          </>
        )}
      </dl>

      <div className="my-4 border-t border-dashed border-line" />

      <PriceLines price={price} service={order.service} sessionPrice={order.rates?.sessionPrice ?? 0} />

      <dl className="mt-3 text-sm font-semibold">
        <div className="flex justify-between gap-4">
          <dt>Payment</dt>
          <dd className="text-right">
            {paid
              ? `Paid · ${methodLabel ?? ''}`
              : price.total == null
                ? `Unpaid · ${paymentOptionLabel(order.paymentOption)}`
                : `${paymentLabel(order)} · ${paymentOptionLabel(order.paymentOption)}`}
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-center text-[13px] text-muted">
        {order.returnMethod === 'home_delivery' ? 'Keep this slip to track your order.' : 'Bring this slip to claim your laundry.'}
      </p>
    </article>
  )
}
