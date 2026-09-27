import type { Priority } from '../types'
import { addDays, iso, norm } from './dates'

const WEEKDAYS = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato']

export interface Parsed {
  title: string
  due: string | null
  priority: Priority
  /** Nome del progetto scritto dopo #, così come è stato digitato. */
  project: string | null
  labels: string[]
}

/**
 * Legge l'inserimento rapido: «Pagare bolletta venerdì p1 #Casa @urgente».
 * Riconosce oggi/domani/dopodomani, i giorni della settimana, gg/mm[/aaaa],
 * p1–p4, #progetto e @etichetta; il resto diventa il titolo.
 */
export function parseQuick(text: string, now = new Date()): Parsed {
  const r: Parsed = { title: '', due: null, priority: 4, project: null, labels: [] }
  const keep: string[] = []
  for (const w of text.trim().split(/\s+/)) {
    if (!w) continue
    const n = norm(w)
    let m: RegExpMatchArray | null
    if (/^p[1-4]$/.test(n)) r.priority = Number(n[1]) as Priority
    else if (w.length > 1 && w[0] === '#') r.project = w.slice(1)
    else if (w.length > 1 && w[0] === '@') {
      const l = w.slice(1).toLowerCase()
      if (!r.labels.includes(l)) r.labels.push(l)
    }
    else if (n === 'oggi') r.due = iso(now)
    else if (n === 'domani') r.due = iso(addDays(now, 1))
    else if (n === 'dopodomani') r.due = iso(addDays(now, 2))
    else if (WEEKDAYS.includes(n)) {
      const d = (WEEKDAYS.indexOf(n) - now.getDay() + 7) % 7 || 7
      r.due = iso(addDays(now, d))
    }
    else if ((m = n.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/))) {
      const day = Number(m[1])
      const mon = Number(m[2])
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
