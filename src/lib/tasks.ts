import type { Task } from '../types'

/** Built-in labels. The list says how committed you are, the label says when you look at it. */
export const NEXT = 'next'
export const RADAR = 'radar'

/** Fills the fields added after the first release, for rows saved before them. */
export const normalizeTask = (t: Partial<Task> & Omit<Task, 'updated' | 'reschedules' | 'radarSince'>): Task => ({
  ...t,
  updated: t.updated ?? t.created,
  reschedules: t.reschedules ?? 0,
  radarSince: t.radarSince ?? null,
})

/** Bookkeeping on every save: touch, count a moved due date, date the Radar label. */
export function prepareSave(prev: Task | undefined, next: Task, now = Date.now()): Task {
  const rescheduled = !!prev?.due && !!next.due && prev.due !== next.due
  const hasRadar = next.labels.includes(RADAR)
  return {
    ...next,
    updated: now,
    reschedules: next.reschedules + (rescheduled ? 1 : 0),
    radarSince: hasRadar ? next.radarSince ?? now : null,
  }
}

const without = (labels: string[], l: string) => labels.filter(x => x !== l)
const withLabel = (labels: string[], l: string) => labels.includes(l) ? labels : [...labels, l]

/** Moves a task to `Next`: undated, labelled, off the Radar. */
export const toNext = (t: Task): Task => ({ ...t, due: null, labels: withLabel(without(t.labels, RADAR), NEXT), reschedules: 0 })
/** Moves a task to `Radar`: undated, labelled, not Next. */
export const toRadar = (t: Task): Task => ({ ...t, due: null, labels: withLabel(without(t.labels, NEXT), RADAR), reschedules: 0 })
export const dropLabel = (t: Task, l: string): Task => ({ ...t, labels: without(t.labels, l) })
