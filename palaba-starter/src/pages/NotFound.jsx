import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Logo from '../components/Logo.jsx'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <Card className="flex w-full max-w-[420px] flex-col items-center gap-4 px-6 py-9 text-center">
        <Logo />
        <h1 className="text-2xl font-bold text-navy">Page not found</h1>
        <p className="text-sm text-muted">This page doesn’t exist. Customers: please use the link on your claim slip.</p>
        <Button to="/" variant="secondary">
          Go to the dashboard
        </Button>
      </Card>
    </main>
  )
}
