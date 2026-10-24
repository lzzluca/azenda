import { useEffect, useState } from 'react'
import type { Project } from '../types'
import { subtree } from '../lib/projects'

interface Props {
  project: Project
  /** Open containers, for the parent picker. */
  projects: Project[]
  onSave: (p: Project) => void
  onClose: () => void
}

export function ProjectEditor({ project, projects, onSave, onClose }: Props) {
  const [name, setName] = useState(project.name)
  const [parent, setParent] = useState(project.parent ?? '')
  const [target, setTarget] = useState(project.target ?? '')
  const [dod, setDod] = useState(project.dod ?? '')
  const [start, setStart] = useState(project.start ?? '')
  const [deadline, setDeadline] = useState(project.end ?? '')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const inside = subtree(projects, project.id)
  const parents = projects.filter(p => !inside.has(p.id))
  const complete = !!target.trim() && !!dod.trim()

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <form className="sheet" role="dialog" aria-modal="true" aria-label="Edit project" onSubmit={e => {
        e.preventDefault()
        if (!name.trim()) return
        onSave({
          ...project,
          name: name.trim(),
          parent: parent || null,
          target: target.trim() || null,
          dod: dod.trim() || null,
          start: complete && deadline && start ? start : null,
          end: complete && deadline ? deadline : null,
        })
      }}>
        <input id="ed-title" aria-label="Name" maxLength={60} required autoFocus value={name} onChange={e => setName(e.target.value)} />
        <div className="fields">
          <label>Parent
            <select id="pr-parent" value={parent} onChange={e => setParent(e.target.value)}>
              <option value="">None (top level)</option>
              {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        <label className="field">🎯 Target · a measurable result
          <input id="pr-target" placeholder='e.g. "2 interviews scheduled"' maxLength={200} value={target} onChange={e => setTarget(e.target.value)} />
        </label>
        <label className="field">✅ Definition of done · what must be true to close it
          <input id="pr-dod" placeholder='e.g. "offer accepted and contract signed"' maxLength={200} value={dod} onChange={e => setDod(e.target.value)} />
        </label>
        <p className="hint">{complete ? 'This is a project.' : 'Without both, this is a list: a scoped group of tasks.'}</p>
        <div className="fields">
          <label>Start
            <input type="date" id="pr-start" value={start} max={deadline || undefined} disabled={!complete || !deadline} onChange={e => setStart(e.target.value)} />
          </label>
          <label>End
            <input type="date" id="pr-deadline" value={deadline} min={start || undefined} disabled={!complete} onChange={e => setDeadline(e.target.value)} />
          </label>
        </div>
        <p className="hint">
          {complete ? 'The end is the target\'s deadline. Without a start, the project is active right away.' : 'A list has no dates.'}
        </p>
        <div className="sheet-actions">
          <div className="spacer" />
          <button type="button" className="plain" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </>
  )
}
