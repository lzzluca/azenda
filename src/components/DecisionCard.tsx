import { useState } from 'react'
import type { Project } from '../types'
import type { Decision } from '../lib/decisions'

export type DecisionAction =
  | 'keep' | 'next' | 'radar' | 'undate' | 'delete' | 'someday' | 'admin' | 'dropRadar'
  | 'newTarget' | 'close'
  | { extend: { deadline: string; reason: string } }

interface Props {
  decision: Decision
  projects: Record<string, Project>
  onAct: (d: Decision, a: DecisionAction) => void
}

const btn = (label: string, a: DecisionAction, cls = 'ghost ok') => ({ label, a, cls })

export function DecisionCard({ decision: d, projects, onAct }: Props) {
  const [extending, setExtending] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [reason, setReason] = useState('')

  if (d.kind === 'deadline') {
    const p = d.project
    return (
      <div className="card">
        <div className="why">Sprint deadline passed {d.days === 1 ? 'yesterday' : `${d.days} days ago`}</div>
        <div className="what">🎯 {p.target} <span className="muted">· {p.name}</span></div>
        {extending ? (
          <form className="extend" onSubmit={e => { e.preventDefault(); if (deadline && reason.trim()) onAct(d, { extend: { deadline, reason: reason.trim() } }) }}>
            <input type="date" aria-label="New deadline" required min={p.sprint?.deadline} value={deadline} onChange={e => setDeadline(e.target.value)} />
            <input placeholder="Why does it need more time?" aria-label="Reason" required maxLength={200} value={reason} onChange={e => setReason(e.target.value)} />
            <button type="submit" className="btn">Extend</button>
            <button type="button" className="plain" onClick={() => setExtending(false)}>Cancel</button>
          </form>
        ) : (
          <div className="actions">
            <button className="ghost ok" onClick={() => onAct(d, 'newTarget')}>New target</button>
            <button className="ghost ok" onClick={() => onAct(d, 'close')}>Close project</button>
            <button className="ghost" onClick={() => setExtending(true)}>Extend…</button>
          </div>
        )}
      </div>
    )
  }

  const t = d.task
  const where = t.project ? projects[t.project]?.name ?? 'Inbox' : 'Inbox'
  const why = {
    inbox: `In the Inbox for ${d.days} days`,
    stale: `Untouched for ${d.days} days in ${where}`,
    rescheduled: `Rescheduled ${d.days} times`,
    radar: `On Radar for ${d.days} days`,
  }[d.kind]
  const actions = {
    inbox: [btn('Someday maybe', 'someday'), btn('Admin & errands', 'admin'), btn('Keep', 'keep'), btn('Delete', 'delete', 'ghost')],
    stale: [btn('Next', 'next'), btn('Radar', 'radar'), btn('Keep', 'keep'), btn('Delete', 'delete', 'ghost')],
    rescheduled: [btn('Keep the date', 'keep'), btn('Next, no date', 'next'), btn('Radar, no date', 'radar'), btn('Just drop the date', 'undate', 'ghost')],
    radar: [btn('Next', 'next'), btn('Drop Radar', 'dropRadar'), btn('Keep', 'keep'), btn('Delete', 'delete', 'ghost')],
  }[d.kind]

  return (
    <div className="card">
      <div className="why">{why}</div>
      <div className="what">{t.title}{t.due && <span className="muted"> · due {t.due}</span>}</div>
      <div className="actions">
        {actions.map(x => <button key={x.label} className={x.cls} onClick={() => onAct(d, x.a)}>{x.label}</button>)}
      </div>
    </div>
  )
}
