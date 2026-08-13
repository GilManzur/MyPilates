import { createPortal } from 'react-dom'
import { useEffect, useRef, type ReactNode } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Renders full-screen overlays (bottom sheets, the document viewer) into
 * document.body via a portal, and gives them shared modal behavior:
 * Escape-to-close, a focus trap, and focus restoration on unmount.
 *
 * Why the portal: `position: fixed` anchors to the nearest ancestor that has a
 * transform / filter / backdrop-filter / perspective / will-change — not the
 * viewport. Several overlays live inside `.panel` (which uses
 * `backdrop-filter: blur()`) or under `.page`, so rendering them in place can
 * push them off-screen. Portaling to <body> keeps them anchored to the
 * viewport regardless of ancestor styles. The document is `dir="rtl"`, so RTL
 * is preserved at the body level.
 *
 * Pass `onClose` to enable Escape-to-close. The dialog `role`/`aria-modal`
 * live on each overlay's own content element (the sheet / viewer).
 */
export function Overlay({
  children,
  onClose,
}: {
  children: ReactNode
  onClose?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Move focus into the overlay so keyboard users start inside it.
    container.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onCloseRef.current) {
          event.preventDefault()
          onCloseRef.current()
        }
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [])

  return createPortal(
    <div ref={ref} style={{ display: 'contents' }}>
      {children}
    </div>,
    document.body,
  )
}
