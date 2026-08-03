import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: IconName
  variant?: 'ghost' | 'danger' | 'primary' | 'secondary'
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  className = '',
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`icon-btn icon-btn--${variant} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  )
}
