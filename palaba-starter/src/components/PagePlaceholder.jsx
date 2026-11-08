import { Link } from 'react-router-dom'

// Temporary stand-in used by every page until it is built from the designs.
export default function PagePlaceholder({ title, note }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-card border border-line bg-surface p-6">
        <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
        <p className="mt-2 text-muted">{note ?? 'Placeholder page — not built yet.'}</p>
        <Link
          to="/"
          className="mt-4 inline-block font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
