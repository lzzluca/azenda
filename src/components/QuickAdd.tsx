import { forwardRef, useState } from 'react'
import type { Project } from '../types'
import { dueInfo } from '../lib/dates'
import { parseQuick, type Parsed } from '../lib/parse'
import { findProject } from '../lib/store'
import { CalIcon } from './icons'

interface Props {
  projects: Record<string, Project>
  onAdd: (p: Parsed) => void
}

export const QuickAdd = forwardRef<HTMLInputElement, Props>(function QuickAdd({ projects, onAdd }, ref) {
  const [value, setValue] = useState('')
  const r = parseQuick(value)

  const chips: React.ReactNode[] = []
  if (r.due) chips.push(<><CalIcon /> {dueInfo(r.due).label}</>)
  if (r.priority < 4) chips.push(`P${r.priority}`)
  if (r.project) chips.push('#' + (findProject(projects, r.project)?.name ?? `${r.project} (nuovo)`))
  r.labels.forEach(l => chips.push('@' + l))

  return (
    <form className="quick" autoComplete="off" onSubmit={e => {
      e.preventDefault()
      if (!r.title) return
      onAdd(r)
      setValue('')
    }}>
      <div className="quick-row">
        <input
          ref={ref} id="quick" aria-label="Nuovo task"
          placeholder="Aggiungi un task… es. «Pagare bolletta venerdì p1 #Casa»"
          value={value} onChange={e => setValue(e.target.value)}
        />
        <button className="btn" type="submit" disabled={!r.title}>Aggiungi</button>
      </div>
      {chips.length > 0 && (
        <div className="chips">{chips.map((c, i) => <span key={i} className="chip">{c}</span>)}</div>
      )}
    </form>
  )
})
