# Roadmap

- [Next up](#next-up-opinionated-enforced-workflow): what gets built next.
- [Ideas](#ideas): features to come back to later. Not commitments.

## Next up: opinionated, enforced workflow

**Direction:** aZenda stops being a generic Todoist clone and becomes a task manager with
one built-in workflow that the app enforces instead of merely suggesting. Every project
needs a measurable target and a deadline, backlogs have hard caps, focus labels are
limited, and a guided monthly review keeps the system lean.

Two principles drive every rule below:

- **If you can't write a target, it's not a project.** It's material for a list.
- **The list says how committed you are, the label says when you look at it.**

"Enforced" means the app blocks the action and explains what to do instead. It never
silently drops or rewrites data.

### Glossary

| Term | Meaning |
| --- | --- |
| **Project** | The one thing being pushed right now. Has a target, a deadline and a sprint. |
| **Sprint** | The scheduled stretch of work towards the project's current target. |
| **Workbench** | Sub-container of the project (Italian: *cantiere*). Holds supporting side projects that move forward in parallel, outside the sprint and without dates. |
| **List** | A container without a target, worked through kanban-style. Either a *commitment* list or a *material* list. |
| **Commitment list** | Things already decided, not yet scheduled (admin, errands). |
| **Material list** | Things that might happen: someday/maybe, ideas, references. |
| **`Radar`** | Label for material-list items that are candidates to move up at the next monthly review. |
| **`Next`** | Label for undated commitments to tackle before the next review. |

### 1. Container kinds

Today every `Project` is the same. The workflow needs three kinds:

| Kind | Has a target | Purpose |
| --- | --- | --- |
| **Project** | yes | Work towards a measurable result. Follows the template in step 2. |
| **Workbench** | no | Child of the project: supporting side projects, unscheduled, in parallel to the sprint. |
| **List** | no | Either *commitments* without a date (admin, errands) or *material* (someday/maybe, ideas, references). |

- [ ] Add `kind: 'project' | 'workbench' | 'list'` to `Project`.
- [ ] Workbench: required `parent` (a project id). It cannot exist without one.
- [ ] List: `listType: 'commitment' | 'material'` and an optional `cap` (step 3).
- [ ] Sidebar groups containers by kind.
- [ ] Migration: existing projects become lists of type `commitment`, so nothing is
      blocked on upgrade. The user promotes them to projects by writing a target.

### 2. Project template

A project cannot be created, or promoted from a list, without these four things:

1. **Target**: a measurable result plus a deadline, pinned on top of the project
   (e.g. "2 interviews scheduled by Oct 15").
2. **Scheduled plan**: dated tasks leading to the target. A few concrete moves, not an
   exhaustive list.
3. **Checkpoint**: a recurring review of the project.
4. **Definition of done**: what must be true to close it.

- [ ] `Project` gains `target: { text: string; deadline: string }`, `definitionOfDone:
      string` and `checkpoint` (a recurrence rule).
- [ ] "New project" becomes a short guided form. Target, deadline and definition of done
      are required. If the user can't fill them in, the form offers to save the idea in a
      material list instead.
- [ ] Project view shows target and deadline in the header, with days remaining.
- [ ] A project with no dated open task shows a "no plan" warning.
- [ ] Weekly quotas ("10 applications"): due at the end of the week, shown on every day of
      that week until done.

**Prerequisite:** recurring tasks do not exist yet. Checkpoints and reviews need them, so
recurrence (`every friday`, `every month`) is built first, including in the quick-add
parser.

### 3. Hard caps on backlogs

- [ ] Each material list has a `cap`, 20 by default. Commitment lists are uncapped:
      they are kept short by the monthly review, not by a limit.
- [ ] Adding to a full list is blocked: the user must complete, move or delete an item
      first. The dialog shows the list's oldest items to make that easy.
- [ ] The list header shows usage, e.g. `17 / 20`.
- [ ] Moving a task into a full list is blocked the same way, including via `#list` in
      quick add.

### 4. Limited focus labels

Labels stop being free-form tags for focus. Three built-in ones have rules:

| Label | Lives in | Meaning | Rule |
| --- | --- | --- | --- |
| `Radar` | Material lists | Candidate to move up: to a commitment list, or to a project | Must be resolved at the monthly review (step 7). |
| `Next` | Commitment lists | What gets tackled before the next review | Only on tasks without a date. At most 5 across the whole app. |
| `Sprint-<theme>` | The project | Tasks of the current sprint | The name is the theme; dates live in the target. |

The path of a task: material list → `Radar` → monthly review → commitment list → `Next`
or a date → done. Small things can skip steps.

- [ ] Adding a sixth `Next` is blocked, with the current five shown so one can be swapped.
- [ ] Giving a `Next` task a date removes the label: a dated task does not need it.

### 5. One active project

- [ ] Only one project, with its sprint, is active at a time.
- [ ] Anything else the user wants to work on is not a second project: it is a list,
      consumed kanban-style, or an item in the project's workbench if it supports the
      project.
- [ ] Creating a second project is blocked, and the dialog offers those two alternatives.
      A new project can start once the active one is closed (step 9).

### 6. Workbench rules

Workbench items are small side projects rather than single tasks (e.g. "rebuild the blog
as a portfolio" in support of a job search).

- [ ] Every workbench item needs a clear first step (at least one subtask). Requires
      subtasks, which do not exist yet.
- [ ] Workbench items appear in Today only after the day's dated tasks are done, one at a
      time.
- [ ] What gets pulled is decided at the parent's checkpoint: at most one item promoted
      per review.
- [ ] Closing the parent project forces a decision on the workbench: close it, or move
      its items to a list.

### 7. Guided monthly review

A wizard, not a checklist. Timeboxed to 15 minutes, and it cannot be finished while a
step is unresolved.

1. **Radar**: each `Radar` item in a material list must be moved to a commitment list,
   kept without the label, or deleted. Deleting is a first-class option.
2. **Commitment lists**: for each item, delete it if no longer needed, or mark it `Next`
   if it must happen before the following review (subject to the cap in step 4).
3. **Promotion**: if no project is active, one item may become the project, only through
   the form in step 2.
4. **Metric**: open task count compared with last month.

- [ ] Review wizard with the four steps above.
- [ ] Lists can be flagged "review on demand" and skipped by default (e.g. errands for a
      place you are not travelling to).
- [ ] Commitment-or-maybe prompt when filing an undated task: "If this were still open in
      a year, would it matter?" Yes → commitment list. No → someday/maybe.

### 8. Project checkpoint

- [ ] The recurring checkpoint opens a short review: progress against the target, tick or
      reschedule this period's tasks, pull at most one item from the workbench.
- [ ] Reaching the target can close a *sprint* without closing the project: the review
      then asks for a new target and deadline.

### 9. Closing a project

- [ ] Closing asks to confirm the definition of done.
- [ ] Closed projects move to a built-in "Proud of" archive, grouped by year.

### 10. Today view and daily plan

- [ ] Order: overdue and today's dated tasks first, then `Next`, then one workbench item.
- [ ] Quiet weekends: on Saturday and Sunday, Today hides project, admin and review
      tasks and shows only personal ones. Setting, on by default.

### 11. Health metric

- [ ] Single metric: number of open tasks. If it goes down every month, the system works.
- [ ] Store a monthly snapshot in `Data` and show the trend in the review and the sidebar.

### What the workflow makes unnecessary

- **Fake dates.** People put made-up dates on tasks so they don't get lost. Here an
  undated task always has a home (a commitment list) and a moment when it is looked at
  (the monthly review, `Next`), so there is no reason to invent a date. Not a rule to
  enforce: a sign that the flow works.

### Suggested build order

1. Recurring tasks and subtasks (prerequisites).
2. Container kinds and migration (step 1).
3. Project template (step 2), then closing and archive (step 9).
4. Caps and focus labels (steps 3–5).
5. Workbench rules and Today ordering (steps 6 and 10).
6. Reviews and metric (steps 7, 8 and 11).

### Open questions

- **Case study: a second project in another area of life.** Training for a race next to
  a job search: both have a real target and deadline, and they don't compete for the
  same hours or energy, so running them in parallel feels right. But it shows how easily
  "one active project" grows exceptions. Candidate rule that keeps it enforceable: one
  active project *per area* (e.g. work, health), with a small fixed set of areas.
  Undecided.
- Are caps and limits user-configurable, or fixed to keep the app opinionated?
- Should blocked actions allow an explicit, logged override?
- `localStorage` only, or is this the moment to add a backend so reviews and snapshots
  survive across devices?

## Ideas

### Location-based reminders

**Idea:** attach a place to a task (e.g. "buy spray" → the pharmacy) and get reminded
only when you're near that place, instead of at a fixed time.

**Feasibility notes (Sep 2026):**

- Not possible in the browser in the background. The Geolocation API only works while the
  page is open and in the foreground; the W3C Geofencing spec was abandoned.
- Possible on native iOS/Android via OS geofencing (CoreLocation region monitoring,
  Android Geofencing API). The OS wakes the app on region entry using cell/Wi-Fi and
  low-power sensors, so the GPS does *not* need to be always on. Same mechanism as
  Apple Reminders and Todoist.
- Limits: 20 regions per app on iOS, 100 on Android. Realistic radius 100–200 m, trigger
  may lag by tens of seconds. Requires the "Always" location permission, which many users
  decline.

**Possible path:**

1. Browser-only first step: on app open, read the current position and surface nearby
   tasks at the top of the list. No background behaviour, no special permission.
2. Wrap the existing React app with Capacitor and add a geofencing plugin
   (community plugin, or the commercial Transistorsoft one). Alternative: Expo with
   `expo-location`, but that means rewriting the UI in React Native.
3. Place picker to pick "the pharmacy": Nominatim (OpenStreetMap, free), or Google
   Places / Mapbox for better results beyond the free tier.

**Data model:** `Task` would gain an optional `location?: { name: string; lat: number;
lng: number; radiusM: number }`.
