import type { Project } from '../types.ts'

export const COLORS = ['#2F6B4F', '#3A6FD8', '#DD8209', '#B0487F', '#7A5BD0', '#1F8A8A', '#C2402F', '#6B7A2F']

export const BUILTINS: { builtin: NonNullable<Project['builtin']>; name: string; order: number }[] = [
  { builtin: 'someday', name: 'Someday maybe', order: -2 },
  { builtin: 'admin', name: 'Admin & errands', order: -1 },
]

/** A container is a project once it has both a target and a definition of done. */
export const isProject = (p: Project) => !!p.target && !!p.dod

export const isOpen = (p: Project) => !p.closedAt

/** A project with an end is active, or planned while its start (YYYY-MM-DD) is after `today`; without dates, neither. */
export const phase = (p: Project, today: string): 'active' | 'planned' | null =>
  !p.end ? null : p.start && p.start > today ? 'planned' : 'active'

type LegacySprint = { sprint?: { deadline: string; extensions?: Project['extensions'] } | null }

/** Fills the fields added after the first release, for rows saved before them; a saved sprint becomes an end date. */
export const normalizeProject = ({ sprint, ...p }: Partial<Project> & Pick<Project, 'id' | 'name' | 'color' | 'order'> & LegacySprint): Project => ({
  ...p,
  parent: p.parent ?? null,
  target: p.target ?? null,
  dod: p.dod ?? null,
  start: p.start ?? null,
  end: p.end ?? sprint?.deadline ?? null,
  extensions: p.extensions ?? sprint?.extensions ?? [],
  closedAt: p.closedAt ?? null,
  builtin: p.builtin ?? null,
})

export const newProject = (name: string, existing: number, parent: string | null = null): Project =>
  normalizeProject({ id: crypto.randomUUID(), name, color: COLORS[existing % COLORS.length], order: Date.now(), parent })

/** Direct children of `parent` among `list`; a missing parent counts as top level. */
export function childrenOf(list: Project[], parent: string | null) {
  const ids = new Set(list.map(p => p.id))
  return list.filter(p => parent === null ? !p.parent || !ids.has(p.parent) : p.parent === parent)
}

/** Ids of `id` and everything nested under it. */
export function subtree(list: Project[], id: string): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const p of list) if (p.parent && out.has(p.parent) && !out.has(p.id)) { out.add(p.id); grew = true }
  }
  return out
}

/** Removes `id`; its children move up to its parent. */
export function withoutProject(projects: Record<string, Project>, id: string): Record<string, Project> {
  const parent = projects[id]?.parent ?? null
  const { [id]: _removed, ...rest } = projects
  return Object.fromEntries(Object.entries(rest).map(([k, p]) => [k, p.parent === id ? { ...p, parent } : p]))
}
