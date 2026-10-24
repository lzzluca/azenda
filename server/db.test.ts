import { describe, expect, it } from 'vitest'
import type { Project, Task } from '../src/types.ts'
import { openDb } from './db.ts'

const task = (id: string, project: string | null): Task =>
  ({ id, title: id, desc: '', due: null, priority: 4, labels: [], project, done: false, doneAt: null, created: 1 })
const project = (id: string): Project => ({ id, name: id, color: '#000', order: 1 })

describe('db', () => {
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

  it('deleting a project moves its tasks to the Inbox', () => {
    const db = openDb()
    db.saveProject(project('p'))
    db.saveTask(task('in', 'p'))
    db.saveTask(task('out', null))
    db.deleteProject('p')
    expect(db.all().projects).toEqual({})
    expect(db.all().tasks.in.project).toBeNull()
    expect(db.all().tasks.out.project).toBeNull()
  })
})
