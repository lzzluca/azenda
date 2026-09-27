import type { Data, Project, Task, View } from '../types'
import { addDays, cap, fmtLong, iso } from './dates'

export interface Group {
  label?: string
  cls?: string
  items: Task[]
  /** Testo mostrato quando il gruppo è vuoto; senza, il gruppo vuoto non mostra nulla. */
  none?: string
}

export interface ViewModel {
  title: string
  sub?: string
  groups: Group[]
  empty?: [string, string]
  project?: Project
  noAdd?: boolean
  keepEmpty?: boolean
}

const cmp = (a: Task, b: Task) =>
  (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.priority - b.priority || a.created - b.created

export const openTasks = (d: Data) => Object.values(d.tasks).filter(t => !t.done)
export const inInbox = (d: Data) => (t: Task) => !t.project || !d.projects[t.project]
export const sortedProjects = (d: Data) =>
  Object.values(d.projects).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

export function buildView(view: View, d: Data, now = new Date()): ViewModel {
  const open = openTasks(d)
  const td = iso(now)
  const overdue = open.filter(t => t.due && t.due < td).sort(cmp)

  if (view === 'inbox') {
    return { title: 'Inbox', groups: [{ items: open.filter(inInbox(d)).sort(cmp) }], empty: ['Inbox vuota', 'Scrivi qui sopra per aggiungere il primo task.'] }
  }
  if (view === 'today') {
    const today = open.filter(t => t.due === td).sort(cmp)
    const groups: Group[] = overdue.length
      ? [{ label: 'In ritardo', cls: 'overdue', items: overdue }, { label: 'Oggi', items: today, none: 'Niente in programma per oggi.' }]
      : [{ items: today }]
    return { title: 'Oggi', sub: cap(fmtLong.format(now)), groups, empty: ['Giornata libera', 'Nessun task per oggi. Goditi la calma.'] }
  }
  if (view === 'upcoming') {
    const groups: Group[] = overdue.length ? [{ label: 'In ritardo', cls: 'overdue', items: overdue }] : []
    for (let i = 0; i < 7; i++) {
      const day = addDays(now, i)
      const s = iso(day)
      const pre = i === 0 ? 'Oggi · ' : i === 1 ? 'Domani · ' : ''
      groups.push({ label: pre + cap(fmtLong.format(day)), items: open.filter(t => t.due === s).sort(cmp), none: '—' })
    }
    const last = iso(addDays(now, 6))
    const later = open.filter(t => t.due && t.due > last).sort(cmp)
    if (later.length) groups.push({ label: 'Più avanti', items: later })
    return { title: 'Prossimi 7 giorni', groups, keepEmpty: true }
  }
  if (view === 'done') {
    const done = Object.values(d.tasks).filter(t => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)).slice(0, 200)
    return { title: 'Completate', groups: [{ items: done }], noAdd: true, empty: ['Ancora niente', 'I task completati compariranno qui.'] }
  }
  if (view.startsWith('p:')) {
    const p = d.projects[view.slice(2)]
    if (!p) return buildView('inbox', d, now)
    return { title: p.name, project: p, groups: [{ items: open.filter(t => t.project === p.id).sort(cmp) }], empty: ['Progetto vuoto', 'Aggiungi il primo task qui sopra.'] }
  }
  const l = view.slice(2)
  return { title: '@' + l, groups: [{ items: open.filter(t => t.labels.includes(l)).sort(cmp) }], empty: ['Nessun task', 'Nessun task aperto con questa etichetta.'] }
}
