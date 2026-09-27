import type { Priority } from '../types'
import { addDays, iso } from './dates'

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function weekdayIndex(word: string) {
  if (word.length < 3) return -1
  return WEEKDAYS.findIndex(d => d.startsWith(word) && (word.length === 3 || word === d))
}

export interface Parsed {
  title: string
  due: string | null
  priority: Priority
  /** Project name written after #, as typed. */
  project: string | null
  labels: string[]
}

/**
 * Parses quick-add text such as "Pay bills friday p1 #Home @urgent".
 * Understands today/tomorrow (tod, tmr), weekdays (full or 3-letter),
 * m/d[/yyyy], p1–p4, #project and @label; everything else is the title.
 */
export function parseQuick(text: string, now = new Date()): Parsed {
  const r: Parsed = { title: '', due: null, priority: 4, project: null, labels: [] }
  const keep: string[] = []
  for (const w of text.trim().split(/\s+/)) {
    if (!w) continue
    const n = w.toLowerCase()
    let m: RegExpMatchArray | null
    let wd: number
    if (/^p[1-4]$/.test(n)) r.priority = Number(n[1]) as Priority
    else if (w.length > 1 && w[0] === '#') r.project = w.slice(1)
    else if (w.length > 1 && w[0] === '@') {
      if (!r.labels.includes(n.slice(1))) r.labels.push(n.slice(1))
    }
    else if (n === 'today' || n === 'tod') r.due = iso(now)
    else if (n === 'tomorrow' || n === 'tmr') r.due = iso(addDays(now, 1))
    else if ((wd = weekdayIndex(n)) >= 0) {
      const d = (wd - now.getDay() + 7) % 7 || 7
      r.due = iso(addDays(now, d))
    }
    else if ((m = n.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/))) {
      const mon = Number(m[1])
      const day = Number(m[2])
      let y = m[3] ? Number(m[3]) : now.getFullYear()
      if (y < 100) y += 2000
      let d = new Date(y, mon - 1, day)
      if (d.getMonth() !== mon - 1 || d.getDate() !== day) { keep.push(w); continue }
      if (!m[3] && iso(d) < iso(now)) d = new Date(y + 1, mon - 1, day)
      r.due = iso(d)
    }
    else keep.push(w)
  }
  r.title = keep.join(' ')
  return r
}
