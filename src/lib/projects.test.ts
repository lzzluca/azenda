import { describe, expect, it } from 'vitest'
import type { Project } from '../types'
import { childrenOf, isProject, normalizeProject, phase, placed, subtree, withoutProject } from './projects'

const p = (id: string, extra: Partial<Project> = {}): Project =>
  normalizeProject({ id, name: id, color: '#000', order: 1, ...extra })

describe('projects', () => {
  it('is a project only with target and definition of done', () => {
    expect(isProject(p('a'))).toBe(false)
    expect(isProject(p('a', { target: 't' }))).toBe(false)
    expect(isProject(p('a', { target: 't', dod: 'd' }))).toBe(true)
  })

  it('normalizes rows saved before the new fields', () => {
    expect(normalizeProject({ id: 'a', name: 'a', color: '#000', order: 1 })).toEqual(p('a'))
  })

  it('turns a saved sprint into an end date, keeping its extensions', () => {
    const extensions = [{ from: '2026-10-01', to: '2026-11-01', reason: 'r' }]
    const legacy = { id: 'a', name: 'a', color: '#000', order: 1, sprint: { deadline: '2026-11-01', extensions } }
    expect(normalizeProject(legacy)).toEqual(p('a', { end: '2026-11-01', extensions }))
  })

  it('is active until its end, planned before its start, neither without dates', () => {
    const today = '2026-10-24'
    expect(phase(p('a'), today)).toBeNull()
    expect(phase(p('a', { end: '2026-11-01' }), today)).toBe('active')
    expect(phase(p('a', { start: '2026-10-24', end: '2026-11-01' }), today)).toBe('active')
    expect(phase(p('a', { start: '2026-10-25', end: '2026-11-01' }), today)).toBe('planned')
  })

  it('moves a top-level project out of Someday maybe when it gets dates, and back when it loses them', () => {
    const someday = p('builtin-someday', { builtin: 'someday' })
    const proj = p('a', { target: 't', dod: 'd', parent: someday.id })
    const all = { [someday.id]: someday, a: proj }
    const dated = { ...proj, end: '2026-12-01' }
    expect(placed(proj, dated, all).parent).toBeNull()
    expect(placed({ ...dated, parent: null }, { ...dated, parent: null, end: null }, all).parent).toBe(someday.id)
  })

  it('leaves the place alone for sub-projects, lists, unchanged dates and an explicit move', () => {
    const someday = p('builtin-someday', { builtin: 'someday' })
    const all = { [someday.id]: someday }
    const sub = p('a', { target: 't', dod: 'd', parent: 'job' })
    expect(placed(sub, { ...sub, end: '2026-12-01' }, all).parent).toBe('job')
    const list = p('l', { parent: someday.id })
    expect(placed(list, { ...list, end: '2026-12-01' }, all).parent).toBe(someday.id)
    const top = p('t', { target: 't', dod: 'd', end: '2026-12-01' })
    expect(placed(top, { ...top, name: 'renamed' }, all).parent).toBeNull()
    expect(placed(top, { ...top, end: null, parent: 'other' }, all).parent).toBe('other')
  })

  it('lists children, treating a missing parent as top level', () => {
    const list = [p('root'), p('child', { parent: 'root' }), p('orphan', { parent: 'gone' })]
    expect(childrenOf(list, null).map(x => x.id)).toEqual(['root', 'orphan'])
    expect(childrenOf(list, 'root').map(x => x.id)).toEqual(['child'])
  })

  it('collects a subtree', () => {
    const list = [p('a'), p('b', { parent: 'a' }), p('c', { parent: 'b' }), p('d')]
    expect([...subtree(list, 'a')].sort()).toEqual(['a', 'b', 'c'])
  })

  it('moves children up when a container is removed', () => {
    const projects = { a: p('a'), b: p('b', { parent: 'a' }), c: p('c', { parent: 'b' }) }
    const next = withoutProject(projects, 'b')
    expect(next.b).toBeUndefined()
    expect(next.c.parent).toBe('a')
  })
})
