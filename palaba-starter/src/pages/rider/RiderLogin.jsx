import { LoginCard } from '../Login.jsx'

// Rider log in: same card as staff,
// signs in against rider accounts and lands on Today's trips.
export default function RiderLogin() {
  return <LoginCard app="rider" />
}
