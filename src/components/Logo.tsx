export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="56" fill="#3D5A4C" />
      <circle cx="60" cy="60" r="48" fill="#E8EEE9" />
      <path
        d="M34 72c8-18 16-30 26-34 10-4 18 2 22 10 4 8 6 20 4 28"
        stroke="#3D5A4C"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M42 54c10-2 20 2 28 10"
        stroke="#6A8A9B"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="60" cy="36" r="5" fill="#5B7C6A" />
      <path
        d="M28 84h64"
        stroke="#5B7C6A"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  )
}
