'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function DataProvider({ children }: { children: React.ReactNode }) {
  const { loadAll, loaded } = useStore()

  useEffect(() => {
    if (!loaded) loadAll()
  }, [loaded, loadAll])

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
