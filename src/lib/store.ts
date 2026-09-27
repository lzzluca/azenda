import { useCallback, useEffect, useState } from 'react'
import type { Data, Project, Task } from '../types'
import { addDays, iso, norm } from './dates'

const KEY = 'azenda-v1'

export const COLORS = ['#2F6B4F', '#3A6FD8', '#DD8209', '#B0487F', '#7A5BD0', '#1F8A8A', '#C2402F', '#6B7A2F']

const projKey = (s: string) => norm(s).replace(/\s+/g, '')

export const findProject = (projects: Record<string, Project>, name: string) =>
  Object.values(projects).find(p => projKey(p.name) === projKey(name))

export const newProject = (name: string, existing: number): Project => ({
  id: crypto.randomUUID(),
  name,
  color: COLORS[existing % COLORS.length],
  order: Date.now(),
})

function seedWelcome(): Data {
  const pid = 'benvenuto'
  const now = Date.now()
  const today = iso(new Date())
  const tomorrow = iso(addDays(new Date(), 1))
  const rows: [string, string, Task['priority'], string[]][] = [
    ['Scrivi un task nella barra in alto e premi Invio', today, 4, []],
    ['Prova il linguaggio naturale: «Chiamare il dentista domani p2 #Personale»', today, 3, []],
    ['Clicca su un task per aggiungere note, scadenza ed etichette', today, 4, ['prova']],
    ['Completa un task toccando il cerchio a sinistra', tomorrow, 1, ['prova']],
  ]
  const tasks: Record<string, Task> = {}
  rows.forEach(([title, due, priority, labels], i) => {
    const id = `benvenuto-${i}`
    tasks[id] = { id, title, desc: '', due, priority, labels, project: pid, done: false, doneAt: null, created: now + i }
  })
  return { tasks, projects: { [pid]: { id: pid, name: 'Benvenuto', color: COLORS[0], order: 0 } } }
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as Partial<Data>
      return { tasks: d.tasks ?? {}, projects: d.projects ?? {} }
    }
  } catch { /* storage non disponibile: si riparte dagli esempi */ }
  return seedWelcome()
}

/** Stato dell'app salvato in localStorage. Per un backend, sostituire qui le scritture. */
export function useStore() {
  const [data, setData] = useState<Data>(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* ignora */ }
  }, [data])

  const saveTask = useCallback((t: Task) =>
    setData(d => ({ ...d, tasks: { ...d.tasks, [t.id]: t } })), [])

  const patchTask = useCallback((id: string, patch: Partial<Task>) =>
    setData(d => d.tasks[id] ? { ...d, tasks: { ...d.tasks, [id]: { ...d.tasks[id], ...patch } } } : d), [])

  const deleteTask = useCallback((id: string) =>
    setData(d => {
      const { [id]: _removed, ...tasks } = d.tasks
      return { ...d, tasks }
    }), [])

  const saveProject = useCallback((p: Project) =>
    setData(d => ({ ...d, projects: { ...d.projects, [p.id]: p } })), [])

  /** Elimina il progetto e sposta i suoi task in Inbox. */
  const deleteProject = useCallback((id: string) =>
    setData(d => {
      const { [id]: _removed, ...projects } = d.projects
      const tasks = Object.fromEntries(Object.entries(d.tasks).map(([k, t]) =>
        [k, t.project === id ? { ...t, project: null } : t]))
      return { tasks, projects }
    }), [])

  return { data, saveTask, patchTask, deleteTask, saveProject, deleteProject }
}
