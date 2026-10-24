import { useCallback, useEffect, useRef, useState } from 'react'
import type { Data, Project, Task } from '../types'
import { addDays, iso, norm } from './dates'
import { BUILTINS, COLORS, normalizeProject, withProject, withoutProject } from './projects'

export { COLORS, newProject } from './projects'

/** Key of the pre-backend localStorage store; its data is migrated once, then removed. */
const LEGACY_KEY = 'azenda-v1'

const projKey = (s: string) => norm(s).replace(/\s+/g, '')

export const findProject = (projects: Record<string, Project>, name: string) =>
  Object.values(projects).find(p => projKey(p.name) === projKey(name))

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
  return { tasks, projects: { [pid]: normalizeProject({ id: pid, name: 'Welcome', color: COLORS[0], order: 0 }) } }
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

const normalize = (d: Data): Data =>
  ({ tasks: d.tasks, projects: Object.fromEntries(Object.entries(d.projects).map(([k, p]) => [k, normalizeProject(p)])) })

/**
 * Creates the built-in containers that are missing and returns the data with them.
 * Fixed ids keep this idempotent when two loads race (React strict mode runs effects twice).
 */
async function withBuiltins(d: Data): Promise<Data> {
  const missing = BUILTINS.filter(b => !Object.values(d.projects).some(p => p.builtin === b.builtin))
  const projects = { ...d.projects }
  await Promise.all(missing.map(b => {
    const p = normalizeProject({ id: `builtin-${b.builtin}`, name: b.name, color: COLORS[0], order: b.order, builtin: b.builtin })
    projects[p.id] = p
    return put('projects', p)
  }))
  return { ...d, projects }
}

/** Loads the server data; an empty server is filled from the legacy local store or the welcome examples. */
async function loadInitial(): Promise<Data> {
  const server = normalize((await (await api('/data')).json()) as Data)
  if (!isEmpty(server)) return withBuiltins(server)
  const legacy = loadLegacy()
  const initial = normalize(legacy ?? seedWelcome())
  await Promise.all([
    ...Object.values(initial.projects).map(p => put('projects', p)),
    ...Object.values(initial.tasks).map(t => put('tasks', t)),
  ])
  if (legacy) try { localStorage.removeItem(LEGACY_KEY) } catch { /* ignore */ }
  return withBuiltins(initial)
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

  /** Saves the container; if it is in sprint, any other sprint ends (one at a time). */
  const saveProject = useCallback((p: Project) => {
    const projects = withProject(latest.current.projects, p)
    const changed = Object.values(projects).filter(x => x !== latest.current.projects[x.id])
    setData(d => ({ ...d, projects }))
    for (const x of changed) sync(put('projects', x))
  }, [])

  /** Deletes the container: tasks move to the Inbox, children to its parent (the server does the same). */
  const deleteProject = useCallback((id: string) => {
    setData(d => ({
      tasks: Object.fromEntries(Object.entries(d.tasks).map(([k, t]) => [k, t.project === id ? { ...t, project: null } : t])),
      projects: withoutProject(d.projects, id),
    }))
    sync(api(`/projects/${id}`, { method: 'DELETE' }))
  }, [])

  return { data, status, saveTask, patchTask, deleteTask, saveProject, deleteProject }
}
