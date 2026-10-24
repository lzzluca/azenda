import { useState, type ReactNode } from 'react'
import type { Data, View } from '../types'
import { iso } from '../lib/dates'
import { decisions } from '../lib/decisions'
import { childrenOf, isProject } from '../lib/projects'
import { NEXT, RADAR } from '../lib/tasks'
import { closedProjects, inInbox, openTasks, sortedProjects } from '../lib/views'
import { DoneIcon, InboxIcon, LabelIcon, PlusIcon, TodayIcon, UpcomingIcon } from './icons'

interface Props {
  data: Data
  view: View
  onView: (v: View) => void
  onAddProject: (name: string) => void
}

export function Sidebar({ data, view, onView, onAddProject }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const open = openTasks(data)
  const td = iso(new Date())
  const projects = sortedProjects(data)
  const labels = [NEXT, RADAR, ...new Set(open.flatMap(t => t.labels).filter(l => l !== NEXT && l !== RADAR)).values()].sort()
  const pending = decisions(data).length

  const item = (key: View, icon: ReactNode, label: string, count = 0, extra?: ReactNode, depth = 0) => (
    <button key={key} className={'nav-item' + (view === key ? ' active' : '')} style={depth ? { paddingLeft: 10 + depth * 16 } : undefined} onClick={() => onView(key)}>
      {icon}
      <span className="name">{label}</span>
      {extra}
      {count > 0 && <span className="count">{count}</span>}
    </button>
  )

  /** Containers as a tree: each one followed by its children, indented. */
  const tree = (parent: string | null, depth: number): ReactNode[] =>
    childrenOf(projects, parent).flatMap(p => [
      item(`p:${p.id}`, <span className="dot" style={{ background: p.color }} />, (isProject(p) ? '🎯 ' : '') + p.name,
        open.filter(t => t.project === p.id).length, p.sprint && <span className="tag">sprint</span>, depth),
      ...tree(p.id, depth + 1),
    ])

  return (
    <aside aria-label="Navigation">
      <div className="logo" aria-label="aZenda"><span className="a">a</span><span className="z">Z</span>enda</div>

      <nav className="nav">
        {item('inbox', <InboxIcon />, 'Inbox', open.filter(inInbox(data)).length)}
        {item('today', <TodayIcon />, 'Today', open.filter(t => t.due && t.due <= td).length)}
        {item('upcoming', <UpcomingIcon />, 'Next 7 days')}
        {item('done', <DoneIcon />, 'Completed')}
        {item('review', <span className="dot q">?</span>, 'Review', pending)}
      </nav>

      <div>
        <div className="side-head">
          Projects & lists
          <button className="icon-btn" aria-label="New list" title="New list" onClick={() => setAdding(a => !a)}><PlusIcon /></button>
        </div>
        {adding && (
          <form className="side-form" onSubmit={e => {
            e.preventDefault()
            if (!name.trim()) return
            onAddProject(name.trim())
            setName('')
            setAdding(false)
          }}>
            <input
              id="proj-name" autoFocus autoComplete="off" maxLength={60}
              placeholder="List name, then Enter"
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setAdding(false) }}
            />
          </form>
        )}
        <nav className="nav">
          {tree(null, 0)}
          {item('proud', <span className="dot heart">❤</span>, 'Proud of', closedProjects(data).length)}
        </nav>
      </div>

      <div>
        <div className="side-head">Labels</div>
        <nav className="nav">
          {labels.map(l => item(`l:${l}`, <LabelIcon />, l, open.filter(t => t.labels.includes(l)).length))}
        </nav>
      </div>

      <div className="status"><i /><span>Saved on the server</span></div>
    </aside>
  )
}
