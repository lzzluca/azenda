import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod'
import { decisions, resolve, RULES, type Decision } from '../src/lib/decisions.ts'
import { isOpen, isProject } from '../src/lib/projects.ts'
import { derivePriority, merge, normalizeTask, prepareSave } from '../src/lib/tasks.ts'
import type { Data, Project, Task } from '../src/types.ts'
import type { Db } from './db.ts'

const DAY = 864e5

const METHOD = `aZenda is a task manager with a method built in. You run its reviews.

Containers nest. One with a target and a definition of done is a project; without them it is a
list. One project at a time is in sprint: the only place a target has a deadline. Tasks can be
dated anywhere. Labels: "next" = do it in the next free slot, "radar" = soon but not clear when.

The decision queue (get_decisions) lists items that matured a rule: Inbox for ${RULES.inbox} days,
untouched in a list for ${RULES.stale} days, rescheduled ${RULES.reschedules} times, on Radar for
${RULES.radar} days, sprint deadline passed. For each one propose ONE action and ask before
applying it with decide. Deleting is a first-class option. Rescheduling escalates instead of
repeating: date -> next -> radar -> no date.

A target must be measurable and specific ("2 interviews scheduled", not "find a job" or "ssss").
Refuse to set a vague one; suggest a measurable version instead.

Priority is derived from two questions: is there a real deadline, and what happens if it is
never done (serious, mild, none). Use set_priority with the answers, never guess a P1-P4.

Duplicates: when two open tasks mean the same thing, propose merging them and let the user pick
which one to keep.`

const json = (v: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(v, null, 2) }] })
const fail = (msg: string) => ({ content: [{ type: 'text' as const, text: msg }], isError: true })

const taskRow = (t: Task, d: Data, now: number) => ({
  id: t.id, title: t.title, desc: t.desc || undefined, due: t.due, priority: t.priority, labels: t.labels,
  container: t.project ? d.projects[t.project]?.name ?? 'Inbox' : 'Inbox', containerId: t.project,
  ageDays: Math.floor((now - t.created) / DAY), untouchedDays: Math.floor((now - t.updated) / DAY),
  reschedules: t.reschedules,
})

const decisionRow = (x: Decision) => x.kind === 'deadline'
  ? { id: x.id, kind: x.kind, days: x.days, project: { id: x.project.id, name: x.project.name, target: x.project.target, deadline: x.project.sprint?.deadline } }
  : { id: x.id, kind: x.kind, days: x.days, task: { id: x.task.id, title: x.task.title, due: x.task.due, labels: x.task.labels } }

/** The assistant's side of aZenda: tools over the store, plus the method as a prompt. */
export function createMcpServer(db: Db) {
  const server = new McpServer({ name: 'azenda', version: '0.1.0' })

  const saveTask = (prev: Task | undefined, next: Task) => { const t = prepareSave(prev, next); db.saveTask(t); return t }
  const saveProject = (p: Project) => db.saveProject(p)

  server.registerPrompt('review', { description: 'How to run an aZenda review by the method' }, () => ({
    messages: [{ role: 'user', content: { type: 'text', text: `${METHOD}\n\nStart by calling get_overview and get_decisions, then walk me through the queue one decision at a time.` } }],
  }))

  server.registerTool('get_overview', {
    description: 'Containers (projects and lists) with open task counts, which project is in sprint, and the rule thresholds.',
  }, () => {
    const d = db.all()
    const open = Object.values(d.tasks).filter(t => !t.done)
    const containers = Object.values(d.projects).filter(isOpen).map(p => ({
      id: p.id, name: p.name, kind: isProject(p) ? 'project' : 'list', parent: p.parent, builtin: p.builtin,
      target: p.target, dod: p.dod, sprint: p.sprint, openTasks: open.filter(t => t.project === p.id).length,
    }))
    return json({ containers, inboxTasks: open.filter(t => !t.project || !d.projects[t.project]).length, openTasks: open.length, pendingDecisions: decisions(d).length, rules: RULES })
  })

  server.registerTool('list_tasks', {
    description: 'Open tasks, with age and reschedule counts. Filter by container id ("inbox" for the Inbox), label, or undated only.',
    inputSchema: { container: z.string().optional(), label: z.string().optional(), undated: z.boolean().optional(), limit: z.number().int().min(1).max(500).default(100) },
  }, ({ container, label, undated, limit }) => {
    const d = db.all()
    const now = Date.now()
    let tasks = Object.values(d.tasks).filter(t => !t.done)
    if (container === 'inbox') tasks = tasks.filter(t => !t.project || !d.projects[t.project])
    else if (container) tasks = tasks.filter(t => t.project === container)
    if (label) tasks = tasks.filter(t => t.labels.includes(label.toLowerCase()))
    if (undated) tasks = tasks.filter(t => !t.due)
    return json(tasks.sort((a, b) => a.updated - b.updated).slice(0, limit).map(t => taskRow(t, d, now)))
  })

  server.registerTool('get_decisions', {
    description: 'The decision queue: items that matured a rule, most overdue first. Each needs one action via decide.',
  }, () => json(decisions(db.all()).map(decisionRow)))

  server.registerTool('decide', {
    description: 'Apply an action to a pending decision. Task actions: keep, next, radar, undate, delete, someday, admin, dropRadar. Project (deadline) actions: close, or extend with a new deadline and a reason.',
    inputSchema: {
      id: z.string(),
      action: z.enum(['keep', 'next', 'radar', 'undate', 'delete', 'someday', 'admin', 'dropRadar', 'close', 'extend']),
      deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      reason: z.string().optional(),
    },
  }, ({ id, action, deadline, reason }) => {
    const d = db.all()
    const dec = decisions(d).find(x => x.id === id)
    if (!dec) return fail(`No pending decision for ${id}`)
    const a = action === 'extend'
      ? (deadline && reason ? { extend: { deadline, reason } } : null)
      : action
    if (!a) return fail('extend needs a deadline and a reason')
    const r = resolve(dec, a, d)
    r.saveTasks.forEach(t => saveTask(d.tasks[t.id], t))
    r.saveProjects.forEach(saveProject)
    r.deleteTasks.forEach(db.deleteTask)
    return json({ ok: true, saved: r.saveTasks.length + r.saveProjects.length, deleted: r.deleteTasks.length })
  })

  server.registerTool('create_task', {
    description: 'Add a task. container is a container id or omitted for the Inbox.',
    inputSchema: { title: z.string().min(1), container: z.string().optional(), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), labels: z.array(z.string()).optional(), desc: z.string().optional() },
  }, ({ title, container, due, labels, desc }) => {
    const t = normalizeTask({ id: crypto.randomUUID(), title, desc: desc ?? '', due: due ?? null, priority: 4, labels: (labels ?? []).map(l => l.toLowerCase()), project: container ?? null, done: false, doneAt: null, created: Date.now() })
    return json(taskRow(saveTask(undefined, t), db.all(), Date.now()))
  })

  server.registerTool('update_task', {
    description: 'Change a task. Only the given fields change; due: null removes the date, container: null moves it to the Inbox. Moving the due date counts as a reschedule.',
    inputSchema: {
      id: z.string(), title: z.string().optional(), desc: z.string().optional(), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      labels: z.array(z.string()).optional(), priority: z.number().int().min(1).max(4).optional(), container: z.string().nullable().optional(), done: z.boolean().optional(),
    },
  }, ({ id, title, desc, due, labels, priority, container, done }) => {
    const prev = db.all().tasks[id]
    if (!prev) return fail(`No task ${id}`)
    const next: Task = {
      ...prev,
      ...(title !== undefined && { title }), ...(desc !== undefined && { desc }), ...(due !== undefined && { due }),
      ...(labels !== undefined && { labels: labels.map(l => l.toLowerCase()) }), ...(priority !== undefined && { priority: priority as Task['priority'] }),
      ...(container !== undefined && { project: container }), ...(done !== undefined && { done, doneAt: done ? Date.now() : null }),
    }
    return json(taskRow(saveTask(prev, next), db.all(), Date.now()))
  })

  server.registerTool('set_priority', {
    description: 'Derive and set a task priority from the two questions: is there a real deadline, and what happens if it is never done.',
    inputSchema: { id: z.string(), deadlineReal: z.boolean(), consequence: z.enum(['serious', 'mild', 'none']) },
  }, ({ id, deadlineReal, consequence }) => {
    const prev = db.all().tasks[id]
    if (!prev) return fail(`No task ${id}`)
    const priority = derivePriority(deadlineReal, consequence)
    saveTask(prev, { ...prev, priority })
    return json({ id, priority })
  })

  server.registerTool('merge_tasks', {
    description: 'Fold a duplicate into the task to keep: notes and labels are merged, the duplicate is deleted and logged in the notes.',
    inputSchema: { keepId: z.string(), dropId: z.string() },
  }, ({ keepId, dropId }) => {
    const d = db.all()
    const keep = d.tasks[keepId], drop = d.tasks[dropId]
    if (!keep || !drop || keepId === dropId) return fail('Need two different existing tasks')
    const merged = saveTask(keep, merge(keep, drop))
    db.deleteTask(dropId)
    return json(taskRow(merged, d, Date.now()))
  })

  server.registerTool('update_project', {
    description: 'Change a container. Setting target and dod makes it a project; sprintDeadline starts its sprint (ending any other); sprintDeadline: null ends it. Targets must be measurable.',
    inputSchema: {
      id: z.string(), name: z.string().optional(), target: z.string().nullable().optional(), dod: z.string().nullable().optional(),
      parent: z.string().nullable().optional(), sprintDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    },
  }, ({ id, name, target, dod, parent, sprintDeadline }) => {
    const p = db.all().projects[id]
    if (!p) return fail(`No container ${id}`)
    const next: Project = {
      ...p, ...(name !== undefined && { name }), ...(target !== undefined && { target }), ...(dod !== undefined && { dod }), ...(parent !== undefined && { parent }),
    }
    if (sprintDeadline === null) next.sprint = null
    else if (sprintDeadline) {
      if (!isProject(next)) return fail('A list cannot enter a sprint: set a target and a definition of done first')
      next.sprint = { ...(next.sprint ?? {}), deadline: sprintDeadline }
    }
    saveProject(next)
    return json(next)
  })

  server.registerTool('close_project', {
    description: 'Close a project whose definition of done came true; it moves to Proud of.',
    inputSchema: { id: z.string() },
  }, ({ id }) => {
    const p = db.all().projects[id]
    if (!p) return fail(`No container ${id}`)
    if (!isProject(p)) return fail('Only a project (target + definition of done) can be closed; delete a list instead')
    saveProject({ ...p, sprint: null, closedAt: Date.now() })
    return json({ ok: true })
  })

  return server
}
