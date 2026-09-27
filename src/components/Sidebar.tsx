import { useState, type ReactNode } from 'react'
import type { Data, View } from '../types'
import { iso } from '../lib/dates'
import { inInbox, openTasks, sortedProjects } from '../lib/views'
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
  const labels = [...new Set(open.flatMap(t => t.labels))].sort()

  const item = (key: View, icon: ReactNode, label: string, count = 0) => (
    <button key={key} className={'nav-item' + (view === key ? ' active' : '')} onClick={() => onView(key)}>
      {icon}
      <span className="name">{label}</span>
      {count > 0 && <span className="count">{count}</span>}
    </button>
  )

  return (
    <aside aria-label="Navigazione">
      <div className="logo" aria-label="aZenda"><span className="a">a</span><span className="z">Z</span>enda</div>

      <nav className="nav">
        {item('inbox', <InboxIcon />, 'Inbox', open.filter(inInbox(data)).length)}
        {item('today', <TodayIcon />, 'Oggi', open.filter(t => t.due && t.due <= td).length)}
        {item('upcoming', <UpcomingIcon />, 'Prossimi 7 giorni')}
        {item('done', <DoneIcon />, 'Completate')}
      </nav>

      <div>
        <div className="side-head">
          Progetti
          <button className="icon-btn" aria-label="Nuovo progetto" title="Nuovo progetto" onClick={() => setAdding(a => !a)}><PlusIcon /></button>
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
              placeholder="Nome progetto, poi Invio"
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setAdding(false) }}
            />
          </form>
        )}
        <nav className="nav">
          {projects.length
            ? projects.map(p => item(`p:${p.id}`, <span className="dot" style={{ background: p.color }} />, p.name, open.filter(t => t.project === p.id).length))
            : <div className="side-empty">Nessun progetto</div>}
        </nav>
      </div>

      <div>
        <div className="side-head">Etichette</div>
        <nav className="nav">
          {labels.length
            ? labels.map(l => item(`l:${l}`, <LabelIcon />, l, open.filter(t => t.labels.includes(l)).length))
            : <div className="side-empty">Usa @etichetta nel testo</div>}
        </nav>
      </div>

      <div className="status"><i /><span>Salvato su questo browser</span></div>
    </aside>
  )
}
