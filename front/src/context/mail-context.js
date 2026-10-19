import { createContext, useContext } from 'react'

export const MailContext = createContext(null)

export function useMail() {
  const ctx = useContext(MailContext)
  if (!ctx) throw new Error('useMail debe usarse dentro de <MailProvider>')
  return ctx
}
