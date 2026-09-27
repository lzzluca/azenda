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
