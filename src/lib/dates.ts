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

export const todayIso = (now = new Date()) => iso(now)

/** Giorni tra oggi e la data indicata (negativo se passata). */
export const dayDiff = (s: string, now = new Date()) =>
  Math.round((fromIso(s).getTime() - fromIso(iso(now)).getTime()) / 864e5)

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const fmtLong = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtShort = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })
const fmtWeekday = new Intl.DateTimeFormat('it-IT', { weekday: 'long' })

export type DueClass = '' | 'overdue' | 'today' | 'tomorrow' | 'week'

export function dueInfo(s: string, now = new Date()): { label: string; cls: DueClass } {
  const n = dayDiff(s, now)
  const d = fromIso(s)
  let label: string
  let cls: DueClass = ''
  if (n === 0) { label = 'Oggi'; cls = 'today' }
  else if (n === 1) { label = 'Domani'; cls = 'tomorrow' }
  else if (n === -1) label = 'Ieri'
  else if (n > 1 && n < 7) { label = cap(fmtWeekday.format(d)); cls = 'week' }
  else label = fmtShort.format(d) + (d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : '')
  if (n < 0) cls = 'overdue'
  return { label, cls }
}
