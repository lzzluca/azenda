import { describe, expect, it } from 'vitest'
import type { Project, Task } from '../src/types.ts'
import { openDb } from './db.ts'

const task = (id: string, project: string | null): Task =>
  ({ id, title: id, desc: '', due: null, priority: 4, labels: [], project, done: false, doneAt: null, created: 1, updated: 1, reschedules: 0, radarSince: null })
const project = (id: string, parent: string | null = null): Project =>
  ({ id, name: id, color: '#000', order: 1, parent, target: null, dod: null, start: null, end: null, extensions: [], closedAt: null, builtin: null })

describe('db', () => {
  it('reads projects saved with a sprint as projects with an end date', () => {
    const db = openDb()
    const { start: _s, end: _e, extensions: _x, ...legacy } = project('a')
    db.saveProject({ ...legacy, sprint: { deadline: '2026-11-01' } } as unknown as Project)
    expect(db.all().projects.a).toEqual({ ...project('a'), end: '2026-11-01' })
  })

  it('starts empty', () => {
    expect(openDb().all()).toEqual({ tasks: {}, projects: {} })
  })

  it('upserts and deletes tasks', () => {
    const db = openDb()
    db.saveTask(task('a', null))
    db.saveTask({ ...task('a', null), title: 'renamed' })
    expect(db.all().tasks.a.title).toBe('renamed')
    db.deleteTask('a')
    expect(db.all().tasks).toEqual({})
  })

  it('deleting a container moves its tasks to the Inbox and its children up', () => {
    const db = openDb()
    db.saveProject(project('root'))
    db.saveProject(project('p', 'root'))
    db.saveProject(project('child', 'p'))
    db.saveTask(task('in', 'p'))
    db.saveTask(task('out', null))
    db.deleteProject('p')
    expect(Object.keys(db.all().projects).sort()).toEqual(['child', 'root'])
    expect(db.all().projects.child.parent).toBe('root')
    expect(db.all().tasks.in.project).toBeNull()
    expect(db.all().tasks.out.project).toBeNull()
  })
})
