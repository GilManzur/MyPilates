export function Logo({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/logo.png"
      alt="MyPilates"
      width={size}
      height={size}
      className={`brand-logo ${className}`.trim()}
      draggable={false}
    />
  )
}
