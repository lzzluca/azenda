import { Hono } from 'hono'
import type { Project, Task } from '../src/types.ts'
import type { Db } from './db.ts'

/** JSON API over the store. Single user, no auth: the client is trusted. */
export function createApp(db: Db) {
  const app = new Hono()

  app.get('/api/data', c => c.json(db.all()))

  app.put('/api/tasks/:id', async c => {
    const t = await c.req.json<Task>()
    if (t?.id !== c.req.param('id')) return c.json({ error: 'id mismatch' }, 400)
    db.saveTask(t)
    return c.body(null, 204)
  })
  app.delete('/api/tasks/:id', c => {
    db.deleteTask(c.req.param('id'))
    return c.body(null, 204)
  })

  app.put('/api/projects/:id', async c => {
    const p = await c.req.json<Project>()
    if (p?.id !== c.req.param('id')) return c.json({ error: 'id mismatch' }, 400)
    db.saveProject(p)
    return c.body(null, 204)
  })
  app.delete('/api/projects/:id', c => {
    db.deleteProject(c.req.param('id'))
    return c.body(null, 204)
  })

  return app
}
