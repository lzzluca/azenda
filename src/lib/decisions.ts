import type { Data, Project, Task } from '../types'
import { dayDiff, iso } from './dates'
import { isOpen, isProject } from './projects'
import { RADAR } from './tasks'

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
