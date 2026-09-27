import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task, View } from './types'
import { dueInfo, iso } from './lib/dates'
import type { Parsed } from './lib/parse'
import { findProject, newProject, useStore } from './lib/store'
import { buildView, sortedProjects } from './lib/views'
import { Sidebar } from './components/Sidebar'
import { QuickAdd } from './components/QuickAdd'
import { TaskItem } from './components/TaskItem'
import { TaskEditor } from './components/TaskEditor'
import { Toast, type ToastData } from './components/Toast'
import { MenuIcon } from './components/icons'

const VIEW_KEY = 'azenda-view'

function initialView(): View {
  try { return (localStorage.getItem(VIEW_KEY) as View | null) ?? 'today' } catch { return 'today' }
}

export function App() {
  const { data, saveTask, patchTask, deleteTask, saveProject, deleteProject } = useStore()
  const [view, setViewState] = useState<View>(initialView)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [armedDelete, setArmedDelete] = useState(false)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [, setToday] = useState(() => iso(new Date()))
  const toastTimer = useRef<number | undefined>(undefined)
  const quickRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  const vm = buildView(view, data)
  const editing = editingId ? data.tasks[editingId] : undefined

  const showToast = useCallback((t: ToastData) => {
    setToast(t)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 5000)
  }, [])

  const setView = (v: View) => {
    setViewState(v)
    setNavOpen(false)
    setArmedDelete(false)
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
    const t: Task = {
      id: crypto.randomUUID(), title: r.title, desc: '', due, priority: r.priority,
      labels, project, done: false, doneAt: null, created: Date.now(),
    }
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
    showToast({ msg: `Project "${name}" deleted` })
  }

  const closeEditor = useCallback(() => setEditingId(null), [])
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
              {vm.project && (
                <button className={'ghost' + (armedDelete ? ' armed' : '')} onClick={removeProject}>
                  {armedDelete ? 'Confirm: tasks move to Inbox' : 'Delete project'}
                </button>
              )}
            </div>

            {!vm.noAdd && (
              <>
                <QuickAdd ref={quickRef} projects={data.projects} onAdd={handleAdd} />
                <div className="hint">
                  Shortcuts: <code>today</code> <code>tomorrow</code> <code>friday</code> <code>10/12</code> · priority <code>p1</code>–<code>p4</code> · <code>#project</code> · <code>@label</code> · press <code>Q</code> to type
                </div>
              </>
            )}

            {!total && !vm.keepEmpty && vm.empty ? (
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

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </>
  )
}
