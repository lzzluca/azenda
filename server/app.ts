import { StreamableHTTPTransport } from '@hono/mcp'
import { Hono } from 'hono'
import type { Project, Task } from '../src/types.ts'
import type { Db } from './db.ts'
import { createMcpServer } from './mcp.ts'

interface Options {
  /** When set, /mcp requires `Authorization: Bearer <token>`. The JSON API stays open: it is for the app on the same machine. */
  token?: string
}

/** JSON API over the store plus the MCP endpoint. Single user, no auth: the client is trusted. */
export function createApp(db: Db, { token }: Options = {}) {
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

  const mcp = createMcpServer(db)
  const transport = new StreamableHTTPTransport()
  app.all('/mcp', async c => {
    if (token && c.req.header('authorization') !== `Bearer ${token}`) return c.json({ error: 'unauthorized' }, 401)
    if (!mcp.isConnected()) await mcp.connect(transport)
    return transport.handleRequest(c)
  })

  return app
}
