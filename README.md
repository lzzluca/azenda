# aZenda

A task manager with a method built in and an assistant that runs your reviews. Most task
apps are neutral containers that let backlogs grow into a mess; aZenda turns stale items,
repeated reschedules and missed deadlines into small daily decisions, keeps one sprint
active at a time, and exposes its data to your own AI assistant through MCP so the
review gets done.

**Status:** the base task manager works today (see [Features](#features)). The guided
workflow is what gets built next, step by step, as described in [ROADMAP.md](ROADMAP.md).

React 19 + TypeScript + Vite in front; a small Node API (Hono + `node:sqlite`) behind.
Single user, no auth. Requires Node 24.

## Commands

```sh
npm install           # dependencies
npm run dev:server    # API at http://localhost:3001, data in server/data/azenda.db
npm run dev           # app at http://localhost:5173 (proxies /api to the server)
npm test              # parser, store and API tests (Vitest)
npm run build         # type-check app + server, production build in dist/
```

Environment: `PORT` (default 3001), `AZENDA_DB` (default `server/data/azenda.db`) and
`AZENDA_TOKEN` (when set, the MCP endpoint requires `Authorization: Bearer <token>`).
Data from the previous `localStorage` version is migrated to the server on first load.

## Import from Todoist

```sh
TODOIST_TOKEN=... npm run import:todoist
```

One-shot and repeatable (rows keep ids derived from the Todoist ids, so a second run updates
instead of duplicating). Open tasks and non-archived projects come over with nesting, dates,
priorities and labels; a project named like "someday" or "admin" maps to the built-in container
of that name; a project's `* 🎯 TARGET: …` and `* ✅ DoD: …` tasks become its target and
definition of done. Completed tasks, sections, comments and subtask nesting are not imported.
Old items land in the decision queue, which doubles as the first review.

## Assistant (MCP)

The server exposes an MCP endpoint at `http://localhost:3001/mcp` (Streamable HTTP), so your own
assistant can run the review. Claude Code, for example:

```sh
claude mcp add --transport http azenda http://localhost:3001/mcp
```

Tools: `get_overview`, `list_tasks`, `get_decisions`, `decide`, `create_task`, `update_task`,
`set_priority`, `merge_tasks`, `update_project`, `close_project`. The `review` prompt explains
the method to the assistant and starts a review.

## Features

- Views: Inbox, Today (with overdue tasks), Next 7 days, Completed, Review, Proud of
- Containers that nest: a container with a target and a definition of done is a project,
  otherwise a list. One sprint at a time, the only place a target has a deadline.
  Closing a project confirms its definition of done and moves it to Proud of.
- Decision queue: Inbox items after 15 days, untouched list items after 60, tasks rescheduled
  twice, Radar older than 30 days, sprint deadlines passed. Three cards a day in Today, all of
  them in Review with a 15-minute timer.
- Built-in labels `next` (next free slot) and `radar` (soon, not clear when)
- Colored containers, labels, priorities P1–P4
- Natural-language quick add: `today`/`tod`, `tomorrow`/`tmr`, weekdays (`friday` or `fri`),
  `m/d` or `m/d/yyyy` dates, `p1`–`p4`, `#project`, `@label`
  — e.g. `Pay bills friday p1 #Home @urgent`
- Task editor, undo after completing, press `Q` to start typing
- Automatic light/dark theme, mobile layout

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the breakdown of the guided workflow and for ideas to
come back to.

## Structure

```
src/
  App.tsx              layout, current view, actions
  types.ts             Task, Project, View
  lib/store.ts         state, optimistic updates through the API
  lib/projects.ts      container rules: project vs list, nesting, one sprint
  lib/tasks.ts         task bookkeeping, Next/Radar, derived priority, merge
  lib/decisions.ts     the rules and the decision queue (shared with the server)
server/
  index.ts             entry point: opens the DB, serves the API and MCP
  app.ts               Hono routes (+ app.test.ts)
  db.ts                SQLite store (+ db.test.ts)
  mcp.ts               MCP server: tools and the review prompt (+ mcp.test.ts)
  lib/views.ts         what each view shows (Today, Next 7 days, …)
  lib/parse.ts         quick-add parser (+ parse.test.ts)
  lib/dates.ts         date helpers and formatting
  components/          Sidebar, QuickAdd, TaskItem, TaskEditor, Toast, icons
```
