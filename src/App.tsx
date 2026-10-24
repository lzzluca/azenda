import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task, View } from './types'
import { dayDiff, dueInfo, iso } from './lib/dates'
import type { Parsed } from './lib/parse'
import { decisions, resolve, type Decision, type DecisionAction } from './lib/decisions'
import { isProject } from './lib/projects'
import { findProject, newProject, useStore } from './lib/store'
import { normalizeTask } from './lib/tasks'
import { buildView, sortedProjects } from './lib/views'
import { Sidebar } from './components/Sidebar'
import { QuickAdd } from './components/QuickAdd'
import { TaskItem } from './components/TaskItem'
import { TaskEditor } from './components/TaskEditor'
import { ProjectEditor } from './components/ProjectEditor'
import { DecisionCard } from './components/DecisionCard'
import { ReviewTimer } from './components/ReviewTimer'

/** Decisions shown in Today per day; past REVIEW_AT pending, a review session is offered. */
const DAILY = 3
const REVIEW_AT = 10
import { Toast, type ToastData } from './components/Toast'
import { MenuIcon } from './components/icons'

const VIEW_KEY = 'azenda-view'

function DatesTag({ start, end }: { start: string | null; end: string }) {
  if (start && dayDiff(start) > 0) return <span className="tag">planned · starts {start}</span>
  const n = dayDiff(end)
  const text = n < 0 ? `active · ${-n}d late` : n === 0 ? 'active · due today' : `active · ${n}d left`
  return <span className={'tag' + (n < 0 ? ' late' : '')}>{text}</span>
}

function initialView(): View {
  try { return (localStorage.getItem(VIEW_KEY) as View | null) ?? 'today' } catch { return 'today' }
}

export function App() {
  const { data, status, saveTask, patchTask, deleteTask, saveProject, deleteProject } = useStore()
  const [view, setViewState] = useState<View>(initialView)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [armedDelete, setArmedDelete] = useState(false)
  const [armedClose, setArmedClose] = useState(false)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [, setToday] = useState(() => iso(new Date()))
  const toastTimer = useRef<number | undefined>(undefined)
  const quickRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  const vm = buildView(view, data)
  const editing = editingId ? data.tasks[editingId] : undefined
  const projectEditing = editingProject ? data.projects[editingProject] : undefined
  const pending = decisions(data)

  const showToast = useCallback((t: ToastData) => {
    setToast(t)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 5000)
  }, [])

  const setView = (v: View) => {
    setViewState(v)
    setNavOpen(false)
    setArmedDelete(false)
    setArmedClose(false)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* ignora */ }
    mainRef.current?.scrollTo(0, 0)
  }

  // Slide-in sidebar on mobile
  useEffect(() => { document.body.classList.toggle('nav-open', navOpen) }, [navOpen])

  // Refresh date-based views when the day changes
  useEffect(() => {
    const id = setInterval(() => setToday(iso(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])

  // Q key: focus the quick-add field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName?.toLowerCase()
      if (e.key.toLowerCase() !== 'q' || e.metaKey || e.ctrlKey || editingId) return
      if (['input', 'textarea', 'select'].includes(tag)) return
      e.preventDefault()
      quickRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [editingId])

  const addProject = (name: string) => {
    const p = findProject(data.projects, name) ?? newProject(name, Object.keys(data.projects).length)
    if (!data.projects[p.id]) saveProject(p)
    setView(`p:${p.id}`)
  }

  const handleAdd = (r: Parsed) => {
    let projects = data.projects
    let project = view.startsWith('p:') ? view.slice(2) : null
    if (r.project) {
      let p = findProject(projects, r.project)
      if (!p) {
        p = newProject(r.project, Object.keys(projects).length)
        saveProject(p)
        projects = { ...projects, [p.id]: p }
      }
      project = p.id
    }
    const labels = [...r.labels]
    if (view.startsWith('l:') && !labels.includes(view.slice(2))) labels.push(view.slice(2))
    const due = r.due ?? (view === 'today' ? iso(new Date()) : null)
    const t: Task = normalizeTask({
      id: crypto.randomUUID(), title: r.title, desc: '', due, priority: r.priority,
      labels, project, done: false, doneAt: null, created: Date.now(),
    })
    saveTask(t)

    const next = buildView(view, { projects, tasks: { ...data.tasks, [t.id]: t } })
    const visible = next.groups.some(g => g.items.some(x => x.id === t.id))
    if (!visible) {
      const where = project ? projects[project]?.name : 'Inbox'
      showToast({ msg: `Added to ${where}${due ? ' · ' + dueInfo(due).label : ''}`, actLabel: 'Open', act: () => setEditingId(t.id) })
    }
  }

  const toggle = (t: Task) => {
    if (t.done) return patchTask(t.id, { done: false, doneAt: null })
    patchTask(t.id, { done: true, doneAt: Date.now() })
    showToast({ msg: 'Task completed', actLabel: 'Undo', act: () => patchTask(t.id, { done: false, doneAt: null }) })
  }

  const removeProject = () => {
    if (!vm.project) return
    if (!armedDelete) return setArmedDelete(true)
    const { id, name } = vm.project
    setView('inbox')
    deleteProject(id)
    showToast({ msg: `"${name}" deleted` })
  }

  /** Closing confirms the definition of done, then the project moves to Proud of. */
  const closeProject = () => {
    if (!vm.project) return
    if (!armedClose) return setArmedClose(true)
    saveProject({ ...vm.project, closedAt: Date.now() })
    setView('proud')
    showToast({ msg: `"${vm.project.name}" is done. Proud of it.` })
  }

  /** Applies the choice made on a decision card. */
  const act = (d: Decision, a: DecisionAction) => {
    const r = resolve(d, a, data)
    r.saveTasks.forEach(saveTask)
    r.saveProjects.forEach(saveProject)
    r.deleteTasks.forEach(deleteTask)
    if (r.editProject) setEditingProject(r.editProject)
    if (a === 'close') showToast({ msg: `"${d.kind === 'deadline' ? d.project.name : ''}" is done. Proud of it.` })
    if (a === 'delete') showToast({ msg: 'Task deleted' })
  }

  const card = (d: Decision) => <DecisionCard key={d.kind + d.id} decision={d} projects={data.projects} onAct={act} />
  const containerName = (d: Decision) =>
    'project' in d ? 'Projects' : d.task.project ? data.projects[d.task.project]?.name ?? 'Inbox' : 'Inbox'

  const closeEditor = useCallback(() => setEditingId(null), [])
  const closeProjectEditor = useCallback(() => setEditingProject(null), [])
  const total = vm.groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <>
      <div className="app">
        <Sidebar data={data} view={view} onView={setView} onAddProject={addProject} />
        {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

        <main ref={mainRef}>
          <div className="wrap">
            <div className="top">
              <button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setNavOpen(true)}><MenuIcon /></button>
              <div>
                <h1>{vm.title}</h1>
                {vm.sub && <div className="sub">{vm.sub}</div>}
              </div>
              <div className="spacer" />
            </div>

            {vm.project && (
              <div className="phead">
                {vm.project.closedAt ? (
                  <p className="muted">Closed on {new Date(vm.project.closedAt).toLocaleDateString()}. Its definition of done came true.</p>
                ) : vm.project.target ? (
                  <p><b>🎯 Target</b> {vm.project.target}
                    {vm.project.end && <DatesTag start={vm.project.start} end={vm.project.end} />}
                  </p>
                ) : (
                  <p className="muted">A list. Give it a target and a definition of done to make it a project.</p>
                )}
                {vm.project.dod && <p><b>✅ Done when</b> {vm.project.dod}</p>}
                {!vm.project.closedAt && (
                  <div className="actions">
                    <button className="ghost ok" onClick={() => setEditingProject(vm.project!.id)}>Edit</button>
                    {isProject(vm.project) && (
                      <button className={'ghost ok' + (armedClose ? ' armed' : '')} onClick={closeProject}>
                        {armedClose ? 'Confirm: the definition of done is true' : 'Close project'}
                      </button>
                    )}
                    {!vm.project.builtin && (
                      <button className={'ghost' + (armedDelete ? ' armed' : '')} onClick={removeProject}>
                        {armedDelete ? 'Confirm: tasks move to Inbox' : 'Delete'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {view === 'today' && pending.length > 0 && (
              <section className="decisions">
                <h3>Decisions <small>{Math.min(DAILY, pending.length)} of {pending.length}</small>
                  {pending.length > REVIEW_AT && <button className="plain" onClick={() => setView('review')}>Review all →</button>}
                </h3>
                {pending.slice(0, DAILY).map(card)}
              </section>
            )}

            {view === 'review' && (
              pending.length === 0
                ? <div className="empty"><b>Nothing to decide</b>Every item has a home and a moment. Come back when the queue fills up.</div>
                : (
                  <div className="decisions">
                    <ReviewTimer minutes={15} />
                    {[...new Set(pending.map(containerName))].map(name => (
                      <section key={name}>
                        <h3>{name} <small>{pending.filter(d => containerName(d) === name).length}</small></h3>
                        {pending.filter(d => containerName(d) === name).map(card)}
                      </section>
                    ))}
                  </div>
                )
            )}

            {vm.closed && (
              <div className="proud">
                {vm.closed.length === 0 && <div className="empty"><b>Nothing yet</b>Closed projects will show up here, by year.</div>}
                {[...new Set(vm.closed.map(p => new Date(p.closedAt!).getFullYear()))].map(year => (
                  <section key={year}>
                    <h3>{year}</h3>
                    {vm.closed!.filter(p => new Date(p.closedAt!).getFullYear() === year).map(p => (
                      <article key={p.id}>
                        <b>{p.name}</b>
                        <span>🎯 {p.target}</span>
                        <span>✅ {p.dod}</span>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            )}

            {!vm.noAdd && (
              <>
                <QuickAdd ref={quickRef} projects={data.projects} onAdd={handleAdd} />
                <div className="hint">
                  Shortcuts: <code>today</code> <code>tomorrow</code> <code>friday</code> <code>10/12</code> · priority <code>p1</code>–<code>p4</code> · <code>#project</code> · <code>@label</code> · press <code>Q</code> to type
                </div>
              </>
            )}

            {vm.closed || view === 'review' ? null : !total && !vm.keepEmpty && vm.empty && status !== 'loading' ? (
              <div className="empty"><b>{vm.empty[0]}</b>{vm.empty[1]}</div>
            ) : (
              <div className="groups">
                {vm.groups.map((g, i) => (
                  <section className="group" key={g.label ?? i}>
                    {g.label && (
                      <h3 className={g.cls}>{g.label}{g.items.length > 0 && <small>{g.items.length}</small>}</h3>
                    )}
                    {g.items.length
                      ? g.items.map(t => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          project={t.project ? data.projects[t.project] : undefined}
                          showProject={!vm.project}
                          onToggle={() => toggle(t)}
                          onOpen={() => setEditingId(t.id)}
                        />
                      ))
                      : g.none && <div className="none">{g.none}</div>}
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {editing && (
        <TaskEditor
          key={editing.id}
          task={editing}
          projects={sortedProjects(data)}
          onSave={t => { saveTask(t); closeEditor() }}
          onDelete={() => { deleteTask(editing.id); closeEditor(); showToast({ msg: 'Task deleted' }) }}
          onClose={closeEditor}
        />
      )}

      {projectEditing && (
        <ProjectEditor
          key={projectEditing.id}
          project={projectEditing}
          projects={sortedProjects(data)}
          onSave={p => { saveProject(p); closeProjectEditor() }}
          onClose={closeProjectEditor}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {status === 'offline' && <div className="banner">Can't reach the server. Changes are not being saved — run <code>npm run dev:server</code> and reload.</div>}
    </>
  )
}
