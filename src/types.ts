export type Priority = 1 | 2 | 3 | 4

export interface Task {
  id: string
  title: string
  desc: string
  /** Due date as YYYY-MM-DD, or null. */
  due: string | null
  priority: Priority
  labels: string[]
  /** Project id; null means Inbox. */
  project: string | null
  done: boolean
  doneAt: number | null
  created: number
  /** Last change, for the "untouched since" rules. */
  updated: number
  /** Times the due date was moved; past a threshold it becomes a decision. */
  reschedules: number
  /** When the Radar label was added, or null. */
  radarSince: number | null
}

/**
 * A container of tasks, nestable. With a target and a definition of done it is a
 * project; without them it is a list, a scoped group of tasks.
 */
export interface Project {
  id: string
  name: string
  color: string
  order: number
  /** Parent container id; null at the top level. */
  parent: string | null
  /** The measurable result (e.g. "2 interviews scheduled"). */
  target: string | null
  /** What must be true to close the project. */
  dod: string | null
  /** Set while the project is in sprint: the only place a target has a deadline (YYYY-MM-DD). */
  sprint: { deadline: string; extensions?: { from: string; to: string; reason: string }[] } | null
  /** When the project was closed and moved to Proud of. */
  closedAt: number | null
  /** Built-in containers cannot be deleted. */
  builtin: 'someday' | 'admin' | null
}

export interface Data {
  tasks: Record<string, Task>
  projects: Record<string, Project>
}

export type View = 'inbox' | 'today' | 'upcoming' | 'done' | 'proud' | 'review' | `p:${string}` | `l:${string}`
