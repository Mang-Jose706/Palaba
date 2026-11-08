import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribe } from '../api/index.js'

/**
 * Load data from the API and reload it whenever the mock data changes.
 *   const { data, loading, error, reload } = useApiData(() => listOrders(), [])
 */
export default function useApiData(load, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const loadRef = useRef(load)
  loadRef.current = load

  const reload = useCallback(() => {
    let alive = true
    loadRef
      .current()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState((s) => ({ ...s, loading: false, error })))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const cancel = reload()
    const unsubscribe = subscribe(reload)
    return () => {
      cancel()
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload }
}
