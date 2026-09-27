const pad = (n: number) => String(n).padStart(2, '0')

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Days from today to the given date (negative when it is in the past). */
export const dayDiff = (s: string, now = new Date()) =>
  Math.round((fromIso(s).getTime() - fromIso(iso(now)).getTime()) / 864e5)

/** Lowercase and strip accents, for loose name matching. */
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const fmtLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const fmtShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const fmtWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' })

export type DueClass = '' | 'overdue' | 'today' | 'tomorrow' | 'week'

export function dueInfo(s: string, now = new Date()): { label: string; cls: DueClass } {
  const n = dayDiff(s, now)
  const d = fromIso(s)
  let label: string
  let cls: DueClass = ''
  if (n === 0) { label = 'Today'; cls = 'today' }
  else if (n === 1) { label = 'Tomorrow'; cls = 'tomorrow' }
  else if (n === -1) label = 'Yesterday'
  else if (n > 1 && n < 7) { label = fmtWeekday.format(d); cls = 'week' }
  else label = fmtShort.format(d) + (d.getFullYear() !== now.getFullYear() ? ', ' + d.getFullYear() : '')
  if (n < 0) cls = 'overdue'
  return { label, cls }
}
