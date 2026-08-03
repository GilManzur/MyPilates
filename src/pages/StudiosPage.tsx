import { Navigate } from 'react-router-dom'

/** Legacy route — studios live under Settings now. */
export function StudiosPage() {
  return <Navigate to="/settings#studios" replace />
}
