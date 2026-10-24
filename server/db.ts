import { DatabaseSync } from 'node:sqlite'
import type { Data, Project, Task } from '../src/types.ts'

type Table = 'tasks' | 'projects'

/** Opens (and migrates) the SQLite database. Rows are stored as JSON for now. */
export function openDb(file = ':memory:') {
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at INTEGER NOT NULL);
  `)

  const upsertStmt = (table: Table) => db.prepare(
    `INSERT INTO ${table} (id, json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`)
  const stmts = {
    tasks: { upsert: upsertStmt('tasks'), remove: db.prepare('DELETE FROM tasks WHERE id = ?'), all: db.prepare('SELECT json FROM tasks') },
    projects: { upsert: upsertStmt('projects'), remove: db.prepare('DELETE FROM projects WHERE id = ?'), all: db.prepare('SELECT json FROM projects') },
  }

  const rows = <T extends { id: string }>(table: Table): Record<string, T> =>
    Object.fromEntries((stmts[table].all.all() as { json: string }[]).map(r => {
      const v = JSON.parse(r.json) as T
      return [v.id, v]
    }))

  const transaction = (fn: () => void) => {
    db.exec('BEGIN')
    try { fn(); db.exec('COMMIT') } catch (e) { db.exec('ROLLBACK'); throw e }
  }

  const saveTask = (t: Task) => { stmts.tasks.upsert.run(t.id, JSON.stringify(t), Date.now()) }
  const deleteTask = (id: string) => { stmts.tasks.remove.run(id) }
  const saveProject = (p: Project) => { stmts.projects.upsert.run(p.id, JSON.stringify(p), Date.now()) }

  /** Deletes the container: its tasks move to the Inbox, its children to its parent. */
  const deleteProject = (id: string) => transaction(() => {
    const projects = rows<Project>('projects')
    const parent = projects[id]?.parent ?? null
    stmts.projects.remove.run(id)
    for (const p of Object.values(projects)) {
      if (p.parent === id) saveProject({ ...p, parent })
    }
    for (const t of Object.values(rows<Task>('tasks'))) {
      if (t.project === id) saveTask({ ...t, project: null })
    }
  })

  const all = (): Data => ({ tasks: rows<Task>('tasks'), projects: rows<Project>('projects') })

  return { all, saveTask, deleteTask, saveProject, deleteProject, close: () => db.close() }
}

export type Db = ReturnType<typeof openDb>
