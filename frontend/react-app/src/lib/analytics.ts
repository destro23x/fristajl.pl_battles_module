declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

function gtag(...args: unknown[]): void {
  if (typeof window.gtag !== 'function') return
  window.gtag(...(args as [string, ...unknown[]]))
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  gtag('event', eventName, params ?? {})
}

/** SPA route change - gtag only auto-sends a page_view on the initial script load */
export function trackPageview(path: string): void {
  gtag('event', 'page_view', { page_path: path })
}

/** Kliknięcie „Losuj” w jednej z kart randomizera */
export const trackRandomize = (type: 'topic' | 'ai_topic' | 'image' | 'beat' | 'sound' | 'tiktok') =>
  trackEvent('randomize', { content_type: type })

/** Wysłanie propozycji treści (temat, obrazek, bit, dźwięk, tiktok) */
export const trackProposalSent = (type: 'topic' | 'image' | 'beat' | 'sound' | 'tiktok') =>
  trackEvent('proposal_sent', { content_type: type })

/** Zalogowanie do panelu administracyjnego */
export const trackAdminLogin = () => trackEvent('admin_login')
