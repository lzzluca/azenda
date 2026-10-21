# Roadmap

- [Next up](#next-up-opinionated-enforced-workflow): what gets built next.
- [Ideas](#ideas): features to come back to later. Not commitments.

## Next up: opinionated, enforced workflow

**Direction:** aZenda stops being a generic Todoist clone and becomes a task manager with
one built-in workflow that the app enforces instead of merely suggesting. Nothing becomes
a project without a measurable target and a definition of done, deadlines exist only
inside the one active sprint, and every item in a work queue has a first step.

Two principles drive every rule below:

- **If you can't write a target, it's not a project.** It's material for a list.
- **The list says how committed you are, the label says when you look at it.**

"Enforced" means the app blocks the action and explains what to do instead. It never
silently drops or rewrites data.

### Glossary

| Term | Meaning |
| --- | --- |
| **Project** | Has a target and a definition of done. No deadline until it enters a sprint. Leisure projects (a race, a hobby build) are projects like any other. |
| **Support project** | A project that is the child of another project. Has its own target and definition of done. Pulled one item at a time after the day's scheduled tasks; the parent's checkpoint decides what to pull. |
| **Sprint** | The scheduled stretch of work towards a project's current target. The only place with deadlines. One at a time: "active project" means "the project in sprint". |
| **Workbench** | A queue of items without a target (Italian: *cantiere*). Every item has a clear first step. A queue with a target is a project, not a workbench. Usually belongs to a project; a standalone one behaves like a list: consumed through labels and covered by the monthly review. |
| **List** | A container without a target. Either a *commitment* list or a *material* list. |
| **Commitment list** | Things already decided, not yet scheduled: admin, errands. |
| **Material list** | Things that might happen: someday/maybe, ideas, references. |
| **`Next`** | Label: do it in the next free slot. Lives in commitment lists and someday/maybe. |
| **`Radar`** | Label: interesting, expected soon, but not in the next slot. |
| **`Sprint-<theme>`** | Label: tasks of the current sprint. The name is the theme, not the duration. |

### 1. Container kinds

Today every `Project` is the same. The workflow needs three kinds:

| Kind | Has a target | Purpose |
| --- | --- | --- |
| **Project** | yes | Work towards a measurable result. Follows the template in step 2. May have a parent project (support project). |
| **Workbench** | no | Queue of items, each with a first step. |
| **List** | no | Either *commitments* without a date (admin, errands) or *material* (someday/maybe, ideas, references). |

- [ ] Add `kind: 'project' | 'workbench' | 'list'` and optional `parent` to `Project`.
- [ ] List: `listType: 'commitment' | 'material'`.
- [ ] Sidebar groups containers by kind, support projects under their parent.
- [ ] Migration: existing projects become lists of type `commitment`, so nothing is
      blocked on upgrade. The user promotes them to projects by writing a target.

### 2. Project template

A project cannot be created, or promoted from a list, without:

1. **Target**: a measurable result, pinned on top of the project (e.g. "2 interviews
   scheduled"). The deadline is added only when the project enters a sprint.
2. **Definition of done**: what must be true to close it.

It also gets, once it is running:

3. **Plan**: in sprint, a few dated tasks leading to the target; weekly quotas
   ("10 applications") are due at the end of the week but shown on every day of it.
   Out of sprint, undated tasks pulled in free slots.
4. **Checkpoint**: a recurring review of the project (step 8).

- [ ] `Project` gains `target: string`, `definitionOfDone: string`, optional `deadline`
      and `checkpoint` (a recurrence rule).
- [ ] "New project" becomes a short guided form. Target and definition of done are
      required. If the user can't fill them in, the form offers to save the idea in a
      material list instead.
- [ ] Project view shows the target in the header; in sprint, also the deadline with
      days remaining.
- [ ] Weekly quotas: due at the end of the week, shown on every day of that week until
      done.

**Prerequisite:** recurring tasks and subtasks do not exist yet. Checkpoints need
recurrence (`every friday`, `every month`, also in the quick-add parser); workbench items
need subtasks.

### 3. One sprint at a time

- [ ] Starting a sprint asks for the deadline of the project's target. That is the only
      way a project gets a deadline.
- [ ] Starting a sprint while another is active is blocked until the first one is closed.
- [ ] Reaching the target can close the sprint without closing the project: the app then
      asks for a new target, or lets the project go back to "ready, no deadline".

### 4. Workbench and support projects

- [ ] Every workbench item needs a first step: at least one subtask. Adding an item
      without one is blocked.
- [ ] Workbench items and support-project tasks appear in Today only after the day's
      dated tasks are done, one at a time.
- [ ] What gets pulled is decided at the parent's checkpoint, one item at a time.
- [ ] Closing a parent project forces a decision on its support projects and workbench:
      close them, or move them out.
- [ ] A workbench without a parent is treated as a list: its items take `Next` and
      `Radar` and show up in the monthly review. Anything that would escape the review
      does not belong in the app at all, but in an external notes vault.

### 4b. A task is an action

A task's title is an action. Descriptions, reference material and AI output live in an
external notes vault (e.g. Obsidian), and the task carries a link to the note. The one
exception is the instructions needed to execute the task, which die with it.

- [ ] Short, fixed cap on the description field. When it is hit, the app suggests moving
      the text to a note and keeping a link.

### 5. Labels

`Next`, `Radar` and `Sprint-<theme>` are built in, with the meanings in the glossary.

- [ ] Built-in labels cannot be deleted or renamed.
- [ ] Giving a `Next` task a date removes the label: a dated task does not need it.
- [ ] `Sprint-<theme>` is applied automatically to tasks of the project in sprint.

### 6. Today view and daily plan

- [ ] Order: overdue and today's dated tasks first, then `Next`, then one item from a
      support project or workbench.
- [ ] Quiet weekends: on Saturday and Sunday, Today hides project, admin and review
      tasks and shows only personal ones. Setting, on by default.

### 7. Closing a project

- [ ] Closing asks to confirm the definition of done.
- [ ] Closed projects move to a built-in "Proud of" archive, grouped by year.

### 8. Project checkpoint

- [ ] The recurring checkpoint opens a short review: progress against the target, tick or
      reschedule this period's tasks, pull at most one item from a support project or the
      workbench.

### 9. Monthly review

What is settled: once a month, at most one material-list item is promoted to project,
and only through the form in step 2. The rest is open (see questions below).

- [ ] Promotion entry point from material lists, with the one-per-month rule.

### 10. Health metric

- [ ] Single metric: number of open tasks. If it goes down every month, the system works.
- [ ] Store a monthly snapshot in `Data` and show the trend in the sidebar.

### 11. Planned, recurrent, yearly goals

- [ ] Built-in containers for dated and recurring tasks outside projects.
- [ ] "Goals of the year": a draft list until 31/12, then turned into quarterly goals.

### Suggested build order

1. Recurring tasks and subtasks (prerequisites).
2. Container kinds and migration (step 1).
3. Project template (step 2), then closing and archive (step 7).
4. Sprint (step 3) and labels (step 5).
5. Workbench, support projects and Today ordering (steps 4 and 6).
6. Checkpoint, review and metric (steps 8–10), then step 11.

### Open questions

- **Monthly review:** to be redesigned against the current rules (standalone workbenches
  are now part of it, labels have no limits). Is a guided wizard worth enforcing, or is
  the one-promotion rule enough? To be stress-tested before building anything beyond
  step 9.
- Should blocked actions allow an explicit, logged override?
- `localStorage` only, or is this the moment to add a backend so snapshots survive
  across devices?

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
