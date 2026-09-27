import { useState } from 'react'
import type { Project, Task } from '../types'
import { dueInfo } from '../lib/dates'
import { CalIcon, CheckIcon } from './icons'

interface Props {
  task: Task
  project?: Project
  showProject: boolean
  onToggle: () => void
  onOpen: () => void
}

export function TaskItem({ task: t, project, showProject, onToggle, onOpen }: Props) {
  const [leaving, setLeaving] = useState(false)
  const due = t.due ? dueInfo(t.due) : null

  const toggle = () => {
    if (t.done) return onToggle()
    setLeaving(true)
    setTimeout(onToggle, 260)
  }

  return (
    <div className={'task' + (t.done ? ' done' : '') + (leaving ? ' leaving' : '')}>
      <button
        className={`check p${t.priority}`}
        aria-label={`${t.done ? 'Mark as not done' : 'Complete'}: ${t.title}`}
        onClick={toggle}
      >
        <CheckIcon />
      </button>
      <button className="tbody" onClick={onOpen}>
        <span className="ttitle">{t.title}</span>
        {t.desc && <span className="tdesc">{t.desc.split('\n')[0]}</span>}
        {(due || t.labels.length > 0 || showProject) && (
          <span className="meta">
            {due && <span className={'due ' + (t.done ? '' : due.cls)}><CalIcon />{due.label}</span>}
            {t.labels.map(l => <span key={l} className="lab">@{l}</span>)}
            {showProject && (
              <span className="proj">
                {project ? <><i style={{ background: project.color }} />{project.name}</> : 'Inbox'}
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  )
}
