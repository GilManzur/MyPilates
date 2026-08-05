import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Renders full-screen overlays (bottom sheets, the document viewer) into
 * document.body via a portal.
 *
 * Why: `position: fixed` anchors to the nearest ancestor that has a
 * transform / filter / backdrop-filter / perspective / will-change — not the
 * viewport. Several overlays live inside `.panel` (which uses
 * `backdrop-filter: blur()`) or under `.page`, so rendering them in place can
 * push them off-screen. Portaling to <body> keeps them anchored to the
 * viewport regardless of ancestor styles. The document is `dir="rtl"`, so RTL
 * is preserved at the body level.
 */
export function Overlay({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
