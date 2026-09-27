const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const

export const InboxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base}>
    <path d="M2.5 10.5 4.3 3.8A1 1 0 0 1 5.3 3h7.4a1 1 0 0 1 1 .8l1.8 6.7v3.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" />
    <path d="M2.5 10.5h4l1 1.5h3l1-1.5h4" />
  </svg>
)

export const TodayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base}>
    <rect x="2.5" y="3.5" width="13" height="12" rx="2" />
    <path d="M2.5 7h13M6 2v3M12 2v3" />
    <circle cx="9" cy="11.3" r="1.8" fill="currentColor" stroke="none" />
  </svg>
)

export const UpcomingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base}>
    <rect x="2.5" y="3.5" width="13" height="12" rx="2" />
    <path d="M2.5 7h13M6 2v3M12 2v3M5.5 10h2M10.5 10h2M5.5 12.8h2" />
  </svg>
)

export const DoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base}>
    <circle cx="9" cy="9" r="6.5" />
    <path d="m6 9.2 2 2 4-4.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const LabelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...base}>
    <path d="M2.5 3.5v4l6 6 5-5-6-6h-4a1 1 0 0 0-1 1z" />
    <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
  </svg>
)

export const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="3" width="12" height="11" rx="2" />
    <path d="M2 6.5h12" />
  </svg>
)

export const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m2.5 6.2 2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20">
    <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
