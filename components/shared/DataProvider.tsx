'use client'
import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

// Singleton flag — persists across Next.js client-side navigations
// so we only load once per browser session, not on every page render
let _loaded = false

export default function DataProvider({ children }: { children: React.ReactNode }) {
  const { loadAll, loaded } = useStore()
  const loading = useRef(false)

  useEffect(() => {
    if (_loaded || loading.current) return
    loading.current = true
    loadAll().then(() => {
      _loaded = true
      loading.current = false
    })
  }, [loadAll])

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex gap-1">
          <span className="pulse-dot" />
          <span className="pulse-dot" />
          <span className="pulse-dot" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
