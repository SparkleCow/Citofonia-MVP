import { createContext, useContext } from 'react'

export const CallContext = createContext(null)

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall debe usarse dentro de <CallProvider>')
  return ctx
}
