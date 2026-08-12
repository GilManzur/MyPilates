import { Button } from './Button'
import { Overlay } from './Overlay'

export type ConfirmRequest = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
}

/**
 * In-app confirmation sheet — a styled, RTL, focus-trapped replacement for
 * `window.confirm` (whose native dialog is LTR browser chrome). Render it with
 * a `request` (or null to hide) and an `onClose` that clears the request.
 */
export function ConfirmSheet({
  request,
  onClose,
}: {
  request: ConfirmRequest | null
  onClose: () => void
}) {
  if (!request) return null
  const {
    title,
    message,
    confirmLabel = 'אישור',
    cancelLabel = 'ביטול',
    danger = true,
    onConfirm,
  } = request

  return (
    <Overlay onClose={onClose}>
      <div className="sheet-backdrop" onClick={onClose}>
        <div
          className="sheet sheet--confirm"
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          <h2>{title}</h2>
          {message && <p className="confirm-message">{message}</p>}
          <div className="row-actions">
            <Button variant="secondary" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              onClick={() => {
                onConfirm()
                onClose()
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}
