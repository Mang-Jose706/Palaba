// One place that opens the right order dialog. Used by Dashboard and Order details.
import { Fragment } from 'react'
import RecordPaymentDialog from './RecordPaymentDialog.jsx'
import ChangeStatusDialog from './ChangeStatusDialog.jsx'
import CancelOrderDialog from './CancelOrderDialog.jsx'
import MarkClaimedDialog from './MarkClaimedDialog.jsx'
import WeighPickupOrderDialog from './WeighPickupOrderDialog.jsx'
import EditCustomerDialog from './EditCustomerDialog.jsx'

const NEXT_STATUS = {
  start_washing: 'in_progress',
  mark_ready: 'ready',
  send_out: 'out_for_delivery',
}

/**
 * Turn an orderRules.nextAction() result into a dialog to open.
 * @returns {{ name: string, order: object, to?: string }}
 */
export function dialogForAction(action, order) {
  return { name: action.dialog ?? 'change-status', order, to: NEXT_STATUS[action.type] }
}

/**
 * @param {{ dialog: { name: string, order?: object, customer?: object, to?: string } | null, onClose: () => void, onDone: (message: string) => void, onSwitch?: (dialog) => void, user?: object }} props
 */
export default function OrderDialogs({ dialog, onClose, onDone, onSwitch, user }) {
  if (!dialog) return null
  const { name, order } = dialog
  // A new key per dialog/order so each opens with fresh state.
  return <Fragment key={`${name}-${order?.id ?? dialog.customer?.id}`}>{renderDialog(dialog, { user, onClose, onDone, onSwitch })}</Fragment>
}

function renderDialog(dialog, { user, onClose, onDone, onSwitch }) {
  const { name, order } = dialog
  const common = { order, user, onClose, onDone }

  switch (name) {
    case 'record-payment':
      return <RecordPaymentDialog {...common} />
    case 'change-status':
      return <ChangeStatusDialog {...common} to={dialog.to} />
    case 'cancel-order':
      return <CancelOrderDialog {...common} />
    case 'mark-claimed':
      return (
        <MarkClaimedDialog {...common} onCollect={onSwitch ? () => onSwitch({ name: 'record-payment', order }) : undefined} />
      )
    case 'weigh-pickup-order':
      return <WeighPickupOrderDialog {...common} />
    case 'edit-customer':
      return <EditCustomerDialog {...common} customer={dialog.customer ?? order?.customer} />
    default:
      return null
  }
}
