/**
 * One-shot Todoist import. Repeatable: rows get ids derived from the Todoist ids,
 * so running it again updates instead of duplicating.
 *
 *   TODOIST_TOKEN=... node server/import-todoist.ts
 */
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { COLORS, normalizeProject } from '../src/lib/projects.ts'
import { normalizeTask } from '../src/lib/tasks.ts'
import type { Data, Project, Task } from '../src/types.ts'
import { openDb } from './db.ts'

export interface TodoistProject { id: string; name: string; parent_id: string | null; child_order: number; is_archived?: boolean; is_inbox_project?: boolean }
export interface TodoistTask {
  id: string; content: string; description: string; project_id: string; parent_id?: string | null
  priority: number; labels: string[]; due: { date: string } | null; checked?: boolean; is_deleted?: boolean
  added_at?: string; created_at?: string; updated_at?: string
}

const API = 'https://api.todoist.com/api/v1'
const ts = (s?: string) => (s ? Date.parse(s) : NaN) || Date.now()

/** Maps the Todoist export to aZenda data. Pure, so it can be tested on a fixture. */
export function mapImport(projects: TodoistProject[], tasks: TodoistTask[]): Data {
  const out: Data = { tasks: {}, projects: {} }
  const inbox = projects.find(p => p.is_inbox_project)
  const containerId = (todoistId: string | null | undefined): string | null => {
    if (!todoistId || todoistId === inbox?.id) return null
    const p = projects.find(x => x.id === todoistId)
    if (!p) return null
    if (/someday/i.test(p.name)) return 'builtin-someday'
    if (/admin/i.test(p.name)) return 'builtin-admin'
    return `td-${p.id}`
  }

  projects.filter(p => !p.is_archived && !p.is_inbox_project).forEach((p, i) => {
    const id = containerId(p.id)!
    const builtin = id === 'builtin-someday' ? 'someday' : id === 'builtin-admin' ? 'admin' : null
    out.projects[id] = normalizeProject({
      id, name: p.name.trim(), color: COLORS[i % COLORS.length], order: builtin ? (builtin === 'someday' ? -2 : -1) : p.child_order,
      parent: builtin ? null : containerId(p.parent_id), builtin,
    })
  })

  for (const t of tasks) {
    if (t.checked || t.is_deleted) continue
    const project = containerId(t.project_id)
    const container = project ? out.projects[project] : undefined
    // Convention: "* 🎯 TARGET: …" and "* ✅ DoD: …" tasks describe the project itself.
    const meta = container && /^\*/.test(t.content) ? t.content.replace(/^\*\s*/, '') : null
    if (container && meta && /target/i.test(meta)) { container.target = meta.replace(/^.*?target:?\s*/i, '').trim(); continue }
    if (container && meta && /\bdod\b|definition of done/i.test(meta)) { container.dod = meta.replace(/^.*?(dod|definition of done):?\s*/i, '').trim(); continue }

    const id = `td-${t.id}`
    out.tasks[id] = normalizeTask({
      id, title: t.content.trim(), desc: t.description ?? '', due: t.due?.date?.slice(0, 10) ?? null,
      priority: (5 - Math.min(Math.max(t.priority, 1), 4)) as Task['priority'],
      labels: t.labels.map(l => l.toLowerCase()), project, done: false, doneAt: null,
      created: ts(t.added_at ?? t.created_at), updated: ts(t.updated_at ?? t.added_at ?? t.created_at),
    })
  }
  return out
}

async function fetchAll<T>(path: string, token: string): Promise<T[]> {
  const all: T[] = []
  let cursor: string | null = null
  do {
    const url = `${API}${path}?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
    const body = await res.json() as { results: T[]; next_cursor: string | null }
    all.push(...body.results)
    cursor = body.next_cursor
  } while (cursor)
  return all
}

export async function importTodoist(token: string, file: string) {
  const [projects, tasks] = await Promise.all([fetchAll<TodoistProject>('/projects', token), fetchAll<TodoistTask>('/tasks', token)])
  const data = mapImport(projects, tasks)
  mkdirSync(dirname(file), { recursive: true })
  const db = openDb(file)
  Object.values(data.projects).forEach((p: Project) => db.saveProject(p))
  Object.values(data.tasks).forEach((t: Task) => db.saveTask(t))
  db.close()
  return { projects: Object.keys(data.projects).length, tasks: Object.keys(data.tasks).length }
}

if (process.argv[1]?.endsWith('import-todoist.ts')) {
  const token = process.env.TODOIST_TOKEN
  if (!token) { console.error('Set TODOIST_TOKEN (Todoist → Settings → Integrations → Developer).'); process.exit(1) }
  const file = process.env.AZENDA_DB ?? 'server/data/azenda.db'
  importTodoist(token, file).then(n => console.log(`Imported ${n.projects} containers and ${n.tasks} open tasks into ${file}`))
}
