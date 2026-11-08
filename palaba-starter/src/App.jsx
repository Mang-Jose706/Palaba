import { Routes, Route } from 'react-router-dom'

import AppLayout from './components/AppLayout.jsx'
import { RequireAuth } from './components/AuthProvider.jsx'

import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewOrder from './pages/NewOrder.jsx'
import OrderCreated from './pages/OrderCreated.jsx'
import OrderDetails from './pages/OrderDetails.jsx'
import Orders from './pages/Orders.jsx'
import Customers from './pages/Customers.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import NotFound from './pages/NotFound.jsx'

import RiderLogin from './pages/rider/RiderLogin.jsx'
import TodaysTrips from './pages/rider/TodaysTrips.jsx'
import Pickup from './pages/rider/Pickup.jsx'
import Delivery from './pages/rider/Delivery.jsx'
import PickupNotDone from './pages/rider/PickupNotDone.jsx'

import Tracking from './pages/track/Tracking.jsx'

// TEMPORARY: shared components preview (remove in step 10)
import ComponentsPreview from './pages/ComponentsPreview.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Staff and owner: signed in, inside the sidebar layout */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/new" element={<NewOrder />} />
        <Route path="/orders/:id" element={<OrderDetails />} />
        <Route path="/orders/:id/created" element={<OrderCreated />} />
        <Route path="/customers" element={<Customers />} />

        {/* Owner only */}
        <Route path="/reports" element={<RequireAuth ownerOnly><Reports /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth ownerOnly><Settings /></RequireAuth>} />
      </Route>

      {/* Rider (phone) */}
      <Route path="/rider/login" element={<RiderLogin />} />
      <Route path="/rider" element={<TodaysTrips />} />
      <Route path="/rider/pickup/:id" element={<Pickup />} />
      <Route path="/rider/pickup/:id/not-done" element={<PickupNotDone />} />
      <Route path="/rider/delivery/:id" element={<Delivery />} />

      {/* Customer tracking (no login) */}
      <Route path="/t/:code" element={<Tracking />} />

      {/* TEMPORARY: remove in step 10 */}
      <Route path="/components" element={<ComponentsPreview />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
