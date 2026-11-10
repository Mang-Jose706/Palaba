import { useLocation } from 'react-router-dom'

/** Link state that remembers the current page, so the next page's "Back" returns here. */
export function useFromHere() {
  const { pathname, search } = useLocation()
  return { from: pathname + search }
}

/** Where "Back" should go: the page the user came from, or `fallback` when opened directly. */
export function useBackTo(fallback = '/') {
  return useLocation().state?.from ?? fallback
}
