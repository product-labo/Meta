export function MetaGaugeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 20C8 20 4 16 4 12C4 8 8 4 12 4C16 4 16 8 16 8C16 8 16 4 20 4C24 4 28 8 28 12C28 16 24 20 24 20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <circle cx="16" cy="6" r="2.5" fill="currentColor" />
      <circle cx="24" cy="8" r="3" fill="currentColor" />
    </svg>
  )
}
