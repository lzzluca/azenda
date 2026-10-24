import { describe, expect, it } from 'vitest'
import type { Project } from '../types'
import { childrenOf, isProject, normalizeProject, subtree, withoutProject } from './projects'

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
