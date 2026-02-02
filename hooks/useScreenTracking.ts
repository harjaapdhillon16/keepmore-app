import { useEffect, useRef } from 'react'
import { usePathname } from 'expo-router'
import { logScreenView } from '../lib/telemetry'

export const useScreenTracking = () => {
  const pathname = usePathname()
  const lastPathname = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || lastPathname.current === pathname) return

    lastPathname.current = pathname
    void logScreenView(pathname)
  }, [pathname])
}
