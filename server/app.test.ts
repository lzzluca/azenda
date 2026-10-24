import { describe, expect, it } from 'vitest'
import type { Data, Task } from '../src/types.ts'
import { createApp } from './app.ts'
import { openDb } from './db.ts'

const task: Task = { id: 't1', title: 'Hello', desc: '', due: null, priority: 4, labels: [], project: null, done: false, doneAt: null, created: 1, updated: 1, reschedules: 0, radarSince: null }
const json = (body: unknown) => ({ method: 'PUT', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

describe('api', () => {
  it('round-trips a task', async () => {
    const app = createApp(openDb())
    expect((await app.request('/api/tasks/t1', json(task))).status).toBe(204)
    const load = async () => (await (await app.request('/api/data')).json()) as Data
    expect((await load()).tasks.t1).toEqual(task)
    expect((await app.request('/api/tasks/t1', { method: 'DELETE' })).status).toBe(204)
    expect((await load()).tasks).toEqual({})
  })

  it('rejects a body whose id does not match the URL', async () => {
    const app = createApp(openDb())
    expect((await app.request('/api/tasks/other', json(task))).status).toBe(400)
  })
})
