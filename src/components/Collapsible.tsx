import type { ReactNode } from 'react'
import { Icon } from './Icon'

type Props = {
  title: string
  id?: string
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * A disclosure section built on native <details> — keeps the long Settings page
 * scannable by collapsing each block behind its title. No JS state needed.
 */
export function Collapsible({ title, id, defaultOpen = false, children }: Props) {
  // Open on load when a deep link (e.g. /settings#business) targets this section.
  const openByHash = Boolean(id) && window.location.hash === `#${id}`
  return (
    <details id={id} className="panel collapsible" open={defaultOpen || openByHash}>
      <summary className="collapsible__summary">
        <h2>{title}</h2>
        <span className="collapsible__chevron" aria-hidden="true">
          <Icon name="chevron" size={20} />
        </span>
      </summary>
      <div className="collapsible__body stack-sm">{children}</div>
    </details>
  )
}
