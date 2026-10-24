// Imports carry the .ts extension so the server (plain Node) can share this module.
import type { Data, Project, Task } from '../types.ts'
import { dayDiff, iso } from './dates.ts'
import { isOpen, isProject } from './projects.ts'
import { dropLabel, RADAR, toNext, toRadar } from './tasks.ts'

/** Days (or count) after which an item asks for a decision. Fixed for now, tuned by use. */
export const RULES = { inbox: 15, stale: 60, reschedules: 2, radar: 30 }

export type Decision =
  | { kind: 'inbox' | 'stale' | 'rescheduled' | 'radar'; id: string; task: Task; days: number }
  | { kind: 'deadline'; id: string; project: Project; days: number }

const DAY = 864e5
const daysSince = (ts: number, now: number) => Math.floor((now - ts) / DAY)

/**
 * The decision queue: items that matured a rule, most overdue first.
 * One decision per item, by the most specific rule.
 */
export function decisions(d: Data, now = Date.now()): Decision[] {
  const out: Decision[] = []
  const td = iso(new Date(now))

  for (const p of Object.values(d.projects)) {
    if (isOpen(p) && p.sprint && p.sprint.deadline < td) {
      out.push({ kind: 'deadline', id: p.id, project: p, days: -dayDiff(p.sprint.deadline, new Date(now)) })
    }
  }

  for (const t of Object.values(d.tasks)) {
    if (t.done) continue
    const container = t.project ? d.projects[t.project] : undefined
    const inList = !!container && isOpen(container) && !isProject(container)
    if (t.reschedules >= RULES.reschedules) {
      out.push({ kind: 'rescheduled', id: t.id, task: t, days: t.reschedules })
    } else if (t.labels.includes(RADAR) && t.radarSince && daysSince(t.radarSince, now) >= RULES.radar) {
      out.push({ kind: 'radar', id: t.id, task: t, days: daysSince(t.radarSince, now) })
    } else if (!t.due && !container && daysSince(t.updated, now) >= RULES.inbox) {
      out.push({ kind: 'inbox', id: t.id, task: t, days: daysSince(t.updated, now) })
    } else if (!t.due && inList && daysSince(t.updated, now) >= RULES.stale) {
      out.push({ kind: 'stale', id: t.id, task: t, days: daysSince(t.updated, now) })
    }
  }

  return out.sort((a, b) => b.days - a.days)
}

export type DecisionAction =
  | 'keep' | 'next' | 'radar' | 'undate' | 'delete' | 'someday' | 'admin' | 'dropRadar'
  | 'newTarget' | 'close'
  | { extend: { deadline: string; reason: string } }

export interface Resolution {
  saveTasks: Task[]
  saveProjects: Project[]
  deleteTasks: string[]
  /** The caller should open the project editor on this project. */
  editProject?: string
}

/** What a decision's action changes. Pure: the caller persists it. */
export function resolve(d: Decision, a: DecisionAction, data: Data, now = Date.now()): Resolution {
  const r: Resolution = { saveTasks: [], saveProjects: [], deleteTasks: [] }
  if (d.kind === 'deadline') {
    const p = data.projects[d.id] ?? d.project
    if (a === 'newTarget') r.editProject = p.id
    else if (a === 'close') r.saveProjects.push({ ...p, sprint: null, closedAt: now })
    else if (typeof a === 'object' && p.sprint) {
      const extensions = [...(p.sprint.extensions ?? []), { from: p.sprint.deadline, to: a.extend.deadline, reason: a.extend.reason }]
      r.saveProjects.push({ ...p, sprint: { deadline: a.extend.deadline, extensions } })
    }
    return r
  }
  const t = data.tasks[d.id] ?? d.task
  const builtin = (b: 'someday' | 'admin') => Object.values(data.projects).find(p => p.builtin === b)?.id ?? null
  if (a === 'keep') r.saveTasks.push({ ...t, reschedules: 0, radarSince: t.labels.includes(RADAR) ? now : null })
  else if (a === 'next') r.saveTasks.push(toNext(t))
  else if (a === 'radar') r.saveTasks.push(toRadar(t))
  else if (a === 'undate') r.saveTasks.push({ ...t, due: null, reschedules: 0 })
  else if (a === 'dropRadar') r.saveTasks.push(dropLabel(t, RADAR))
  else if (a === 'someday') r.saveTasks.push({ ...t, project: builtin('someday') })
  else if (a === 'admin') r.saveTasks.push({ ...t, project: builtin('admin') })
  else if (a === 'delete') r.deleteTasks.push(t.id)
  return r
}
