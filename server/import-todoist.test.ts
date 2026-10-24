import { describe, expect, it } from 'vitest'
import { mapImport, type TodoistProject, type TodoistTask } from './import-todoist.ts'

const projects: TodoistProject[] = [
  { id: '1', name: 'Inbox', parent_id: null, child_order: 0, is_inbox_project: true },
  { id: '2', name: '🎯 Land a job', parent_id: null, child_order: 1 },
  { id: '3', name: '🔧 cantiere job search', parent_id: '2', child_order: 1 },
  { id: '4', name: '📥 someday maybe', parent_id: null, child_order: 9 },
  { id: '5', name: '📥 admin', parent_id: null, child_order: 8 },
  { id: '6', name: 'Old stuff', parent_id: null, child_order: 7, is_archived: true },
]
const task = (id: string, content: string, project_id: string, extra: Partial<TodoistTask> = {}): TodoistTask =>
  ({ id, content, description: '', project_id, priority: 1, labels: [], due: null, added_at: '2026-09-01T10:00:00Z', ...extra })

describe('mapImport', () => {
  it('maps projects, nesting, built-ins and skips archived ones', () => {
    const d = mapImport(projects, [])
    expect(Object.keys(d.projects).sort()).toEqual(['builtin-admin', 'builtin-someday', 'td-2', 'td-3'])
    expect(d.projects['td-3'].parent).toBe('td-2')
    expect(d.projects['builtin-someday']).toMatchObject({ name: '📥 someday maybe', builtin: 'someday' })
  })

  it('maps tasks: inbox, dates, priority, labels, timestamps', () => {
    const d = mapImport(projects, [
      task('a', 'Call mum', '1', { priority: 4, labels: ['Next'], due: { date: '2026-11-02T18:00:00' }, updated_at: '2026-10-01T00:00:00Z' }),
      task('b', 'Done thing', '2', { checked: true }),
      task('c', 'Someday thing', '4'),
    ])
    expect(d.tasks['td-a']).toMatchObject({ title: 'Call mum', project: null, priority: 1, labels: ['next'], due: '2026-11-02', created: Date.parse('2026-09-01T10:00:00Z'), updated: Date.parse('2026-10-01T00:00:00Z') })
    expect(d.tasks['td-b']).toBeUndefined()
    expect(d.tasks['td-c'].project).toBe('builtin-someday')
  })

  it('turns "* 🎯 TARGET" and "* ✅ DoD" tasks into the project target and definition of done', () => {
    const d = mapImport(projects, [
      task('t', '* 🎯 TARGET: almeno 2 colloqui schedulati', '2'),
      task('d', '* ✅ DoD: offerta accettata e contratto firmato', '2'),
      task('x', '* 📅 Settimana 1: fondamenta', '2'),
    ])
    expect(d.projects['td-2']).toMatchObject({ target: 'almeno 2 colloqui schedulati', dod: 'offerta accettata e contratto firmato' })
    expect(Object.keys(d.tasks)).toEqual(['td-x'])
  })
})
