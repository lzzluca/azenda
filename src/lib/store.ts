import { useCallback, useEffect, useRef, useState } from 'react'
import type { Data, Project, Task } from '../types'
import { addDays, iso, norm } from './dates'

/** Key of the pre-backend localStorage store; its data is migrated once, then removed. */
const LEGACY_KEY = 'azenda-v1'

export const COLORS = ['#2F6B4F', '#3A6FD8', '#DD8209', '#B0487F', '#7A5BD0', '#1F8A8A', '#C2402F', '#6B7A2F']

const projKey = (s: string) => norm(s).replace(/\s+/g, '')

export const findProject = (projects: Record<string, Project>, name: string) =>
  Object.values(projects).find(p => projKey(p.name) === projKey(name))

export const newProject = (name: string, existing: number): Project => ({
  id: crypto.randomUUID(),
  name,
  color: COLORS[existing % COLORS.length],
  order: Date.now(),
})

function seedWelcome(): Data {
  const pid = 'welcome'
  const now = Date.now()
  const today = iso(new Date())
  const tomorrow = iso(addDays(new Date(), 1))
  const rows: [string, string, Task['priority'], string[]][] = [
    ['Type a task in the bar at the top and press Enter', today, 4, []],
    ['Try natural language: "Call the dentist tomorrow p2 #Personal"', today, 3, []],
    ['Click a task to add notes, a due date and labels', today, 4, ['tutorial']],
    ['Complete a task by clicking the circle on the left', tomorrow, 1, ['tutorial']],
  ]
  const tasks: Record<string, Task> = {}
  rows.forEach(([title, due, priority, labels], i) => {
    const id = `welcome-${i}`
    tasks[id] = { id, title, desc: '', due, priority, labels, project: pid, done: false, doneAt: null, created: now + i }
  })
  return { tasks, projects: { [pid]: { id: pid, name: 'Welcome', color: COLORS[0], order: 0 } } }
}

function loadLegacy(): Data | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<Data>
    return { tasks: d.tasks ?? {}, projects: d.projects ?? {} }
  } catch { return null }
}

const api = (path: string, init?: RequestInit) =>
  fetch(`/api${path}`, { headers: { 'content-type': 'application/json' }, ...init }).then(r => {
    if (!r.ok) throw new Error(`${init?.method ?? 'GET'} ${path}: ${r.status}`)
    return r
  })

const put = (kind: 'tasks' | 'projects', item: Task | Project) =>
  api(`/${kind}/${item.id}`, { method: 'PUT', body: JSON.stringify(item) })

const isEmpty = (d: Data) => !Object.keys(d.tasks).length && !Object.keys(d.projects).length

/** Loads the server data; an empty server is filled from the legacy local store or the welcome examples. */
async function loadInitial(): Promise<Data> {
  const server = (await (await api('/data')).json()) as Data
  if (!isEmpty(server)) return server
  const legacy = loadLegacy()
  const initial = legacy ?? seedWelcome()
  await Promise.all([
    ...Object.values(initial.projects).map(p => put('projects', p)),
    ...Object.values(initial.tasks).map(t => put('tasks', t)),
  ])
  if (legacy) try { localStorage.removeItem(LEGACY_KEY) } catch { /* ignore */ }
  return initial
}

/**
 * App state, persisted through the JSON API in server/. Updates are optimistic:
 * the local state changes at once and the request runs in the background.
 */
export function useStore() {
  const [data, setData] = useState<Data>({ tasks: {}, projects: {} })
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading')
  const latest = useRef(data)
  latest.current = data

  useEffect(() => {
    loadInitial()
      .then(d => { setData(d); setStatus('ready') })
      .catch(e => { console.error(e); setStatus('offline') })
  }, [])

  const sync = (req: Promise<unknown>) => { req.catch(e => { console.error(e); setStatus('offline') }) }

  const saveTask = useCallback((t: Task) => {
    setData(d => ({ ...d, tasks: { ...d.tasks, [t.id]: t } }))
    sync(put('tasks', t))
  }, [])

  const patchTask = useCallback((id: string, patch: Partial<Task>) => {
    const t = latest.current.tasks[id]
    if (t) saveTask({ ...t, ...patch })
  }, [saveTask])

  const deleteTask = useCallback((id: string) => {
    setData(d => {
      const { [id]: _removed, ...tasks } = d.tasks
      return { ...d, tasks }
    })
    sync(api(`/tasks/${id}`, { method: 'DELETE' }))
  }, [])

  const saveProject = useCallback((p: Project) => {
    setData(d => ({ ...d, projects: { ...d.projects, [p.id]: p } }))
    sync(put('projects', p))
  }, [])

  /** Deletes the project and moves its tasks to the Inbox (the server does the same). */
  const deleteProject = useCallback((id: string) => {
    setData(d => {
      const { [id]: _removed, ...projects } = d.projects
      const tasks = Object.fromEntries(Object.entries(d.tasks).map(([k, t]) =>
        [k, t.project === id ? { ...t, project: null } : t]))
      return { tasks, projects }
    })
    sync(api(`/projects/${id}`, { method: 'DELETE' }))
  }, [])

  return { data, status, saveTask, patchTask, deleteTask, saveProject, deleteProject }
}
