import { describe, expect, it } from 'vitest'
import type { Data, Project, Task } from '../types'
import { decisions } from './decisions'
import { normalizeProject } from './projects'
import { normalizeTask, prepareSave, toNext } from './tasks'

const DAY = 864e5
const now = new Date(2026, 9, 24, 10).getTime() // Oct 24, 2026

const task = (id: string, extra: Partial<Task> = {}): Task =>
  normalizeTask({ id, title: id, desc: '', due: null, priority: 4, labels: [], project: null, done: false, doneAt: null, created: now, ...extra })
const project = (id: string, extra: Partial<Project> = {}): Project =>
  normalizeProject({ id, name: id, color: '#000', order: 1, ...extra })
const data = (tasks: Task[], projects: Project[] = []): Data =>
  ({ tasks: Object.fromEntries(tasks.map(t => [t.id, t])), projects: Object.fromEntries(projects.map(p => [p.id, p])) })

describe('decisions', () => {
  it('asks about inbox items after 15 days, undated only', () => {
    const d = data([task('old', { updated: now - 16 * DAY }), task('fresh', { updated: now - 3 * DAY }), task('dated', { updated: now - 40 * DAY, due: '2026-12-01' })])
    expect(decisions(d, now).map(x => [x.kind, x.id])).toEqual([['inbox', 'old']])
  })

  it('asks about untouched list items after 60 days, but not project tasks', () => {
    const list = project('list')
    const proj = project('proj', { target: 't', dod: 'd' })
    const d = data([task('a', { project: 'list', updated: now - 61 * DAY }), task('b', { project: 'proj', updated: now - 61 * DAY })], [list, proj])
    expect(decisions(d, now).map(x => x.id)).toEqual(['a'])
  })

  it('asks after two reschedules and after 30 days on Radar', () => {
    const d = data([task('moved', { reschedules: 2, due: '2026-11-01' }), task('radar', { labels: ['radar'], radarSince: now - 31 * DAY })])
    expect(decisions(d, now).map(x => x.kind).sort()).toEqual(['radar', 'rescheduled'])
  })

  it('asks when a sprint deadline has passed, most overdue first', () => {
    const p = project('p', { target: 't', dod: 'd', sprint: { deadline: '2026-10-20' } })
    const d = data([task('old', { updated: now - 100 * DAY })], [p])
    expect(decisions(d, now).map(x => [x.kind, x.days])).toEqual([['inbox', 100], ['deadline', 4]])
  })

  it('ignores done tasks and closed projects', () => {
    const p = project('p', { target: 't', dod: 'd', sprint: { deadline: '2026-10-20' }, closedAt: now })
    const d = data([task('done', { done: true, updated: now - 100 * DAY })], [p])
    expect(decisions(d, now)).toEqual([])
  })
})

describe('prepareSave', () => {
  it('touches, counts moved due dates and dates the Radar label', () => {
    const prev = task('a', { due: '2026-11-01', updated: 1 })
    const moved = prepareSave(prev, { ...prev, due: '2026-11-05' }, now)
    expect(moved.updated).toBe(now)
    expect(moved.reschedules).toBe(1)
    expect(prepareSave(prev, { ...prev, due: null }, now).reschedules).toBe(0)
    expect(prepareSave(undefined, { ...prev, due: '2026-11-05' }, now).reschedules).toBe(0)

    const radar = prepareSave(prev, { ...prev, labels: ['radar'] }, now)
    expect(radar.radarSince).toBe(now)
    expect(prepareSave(radar, radar, now + DAY).radarSince).toBe(now)
    expect(prepareSave(radar, { ...radar, labels: [] }, now).radarSince).toBeNull()
  })

  it('Next drops the date, the Radar label and the reschedule count', () => {
    expect(toNext(task('a', { due: '2026-11-01', labels: ['radar'], reschedules: 2 }))).toMatchObject({ due: null, labels: ['next'], reschedules: 0 })
  })
})
