import { useEffect, useState } from 'react'
import type { Priority, Project, Task } from '../types'

interface Props {
  task: Task
  projects: Project[]
  onSave: (t: Task) => void
  onDelete: () => void
  onClose: () => void
}

export function TaskEditor({ task, projects, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task.title)
  const [desc, setDesc] = useState(task.desc)
  const [due, setDue] = useState(task.due ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [project, setProject] = useState(task.project && projects.some(p => p.id === task.project) ? task.project : '')
  const [labels, setLabels] = useState(task.labels.join(', '))
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <form className="sheet" role="dialog" aria-modal="true" aria-label="Edit task" onSubmit={e => {
        e.preventDefault()
        if (!title.trim()) return
        onSave({
          ...task,
          title: title.trim(),
          desc: desc.trim(),
          due: due || null,
          priority,
          project: project || null,
          labels: [...new Set(labels.split(',').map(s => s.trim().replace(/^@/, '').toLowerCase()).filter(Boolean))],
        })
      }}>
        <input id="ed-title" aria-label="Title" maxLength={300} required autoFocus value={title} onChange={e => setTitle(e.target.value)} />
        <textarea id="ed-desc" placeholder="Notes" aria-label="Notes" value={desc} onChange={e => setDesc(e.target.value)} />
        <div className="fields">
          <label>Due date<input type="date" id="ed-due" value={due} onChange={e => setDue(e.target.value)} /></label>
          <label>Priority
            <select id="ed-prio" value={priority} onChange={e => setPriority(Number(e.target.value) as Priority)}>
              <option value="1">P1 · Urgent</option>
              <option value="2">P2 · High</option>
              <option value="3">P3 · Medium</option>
              <option value="4">P4 · None</option>
            </select>
          </label>
          <label>Project
            <select id="ed-proj" value={project} onChange={e => setProject(e.target.value)}>
              <option value="">Inbox</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Labels<input id="ed-labels" placeholder="home, urgent" value={labels} onChange={e => setLabels(e.target.value)} /></label>
        </div>
        <div className="sheet-actions">
          <button type="button" className={'ghost' + (armed ? ' armed' : '')} onClick={() => armed ? onDelete() : setArmed(true)}>
            {armed ? 'Confirm delete' : 'Delete'}
          </button>
          <div className="spacer" />
          <button type="button" className="plain" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </>
  )
}
