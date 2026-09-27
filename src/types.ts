export type Priority = 1 | 2 | 3 | 4

export interface Task {
  id: string
  title: string
  desc: string
  /** Data di scadenza in formato YYYY-MM-DD, o null. */
  due: string | null
  priority: Priority
  labels: string[]
  /** Id del progetto; null significa Inbox. */
  project: string | null
  done: boolean
  doneAt: number | null
  created: number
}

export interface Project {
  id: string
  name: string
  color: string
  order: number
}

export interface Data {
  tasks: Record<string, Task>
  projects: Record<string, Project>
}

export type View = 'inbox' | 'today' | 'upcoming' | 'done' | `p:${string}` | `l:${string}`
