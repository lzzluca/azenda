import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'
import type { Project, Task } from '../src/types.ts'
import { openDb } from './db.ts'
import { createMcpServer } from './mcp.ts'

const DAY = 864e5
const task = (id: string, extra: Partial<Task> = {}): Task =>
  ({ id, title: id, desc: '', due: null, priority: 4, labels: [], project: null, done: false, doneAt: null, created: 1, updated: Date.now(), reschedules: 0, radarSince: null, ...extra })
const project = (id: string, extra: Partial<Project> = {}): Project =>
  ({ id, name: id, color: '#000', order: 1, parent: null, target: null, dod: null, start: null, end: null, extensions: [], closedAt: null, builtin: null, ...extra })

async function connect() {
  const db = openDb()
  const server = createMcpServer(db)
  const [ct, st] = InMemoryTransport.createLinkedPair()
  await server.connect(st)
  const client = new Client({ name: 'test', version: '0' })
  await client.connect(ct)
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = await client.callTool({ name, arguments: args }) as { content: { text: string }[]; isError?: boolean }
    return { text: r.content[0].text, error: !!r.isError, json: () => JSON.parse(r.content[0].text) }
  }
  return { db, call }
}

describe('mcp', () => {
  it('exposes the decision queue and applies a decision', async () => {
    const { db, call } = await connect()
    db.saveTask(task('old', { updated: Date.now() - 20 * DAY }))
    const queue = (await call('get_decisions')).json()
    expect(queue).toMatchObject([{ id: 'old', kind: 'inbox' }])
    expect((await call('decide', { id: 'old', action: 'next' })).json()).toMatchObject({ ok: true })
    expect(db.all().tasks.old).toMatchObject({ labels: ['next'], due: null })
    expect((await call('get_decisions')).json()).toEqual([])
  })

  it('derives priority from the two questions', async () => {
    const { db, call } = await connect()
    db.saveTask(task('a'))
    expect((await call('set_priority', { id: 'a', deadlineReal: true, consequence: 'serious' })).json()).toEqual({ id: 'a', priority: 1 })
    expect((await call('set_priority', { id: 'a', deadlineReal: false, consequence: 'none' })).json()).toEqual({ id: 'a', priority: 4 })
  })

  it('merges duplicates', async () => {
    const { db, call } = await connect()
    db.saveTask(task('keep', { labels: ['next'] }))
    db.saveTask(task('drop', { desc: 'some notes', labels: ['radar'], due: '2026-12-01' }))
    const r = (await call('merge_tasks', { keepId: 'keep', dropId: 'drop' })).json()
    expect(r).toMatchObject({ id: 'keep', labels: ['next', 'radar'], due: '2026-12-01' })
    expect(db.all().tasks.keep.desc).toContain('Merged "drop": some notes')
    expect(db.all().tasks.drop).toBeUndefined()
  })

  it('refuses a sprint on a list and allows several sprints at once', async () => {
    const { db, call } = await connect()
    db.saveProject(project('list'))
    db.saveProject(project('a', { target: 't', dod: 'd', end: '2026-11-01' }))
    db.saveProject(project('b', { target: 't', dod: 'd' }))
    expect((await call('update_project', { id: 'list', sprintDeadline: '2026-11-01' })).error).toBe(true)
    await call('update_project', { id: 'b', sprintDeadline: '2026-12-01' })
    expect(db.all().projects.a.end).toBe('2026-11-01')
    expect(db.all().projects.b.end).toBe('2026-12-01')
  })

  it('offers the review prompt', async () => {
    const { call } = await connect()
    expect((await call('get_overview')).json()).toMatchObject({ openTasks: 0, pendingDecisions: 0 })
  })
})
