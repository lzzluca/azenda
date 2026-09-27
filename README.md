# aZenda

A Todoist-style task manager. React 19 + TypeScript + Vite; data lives in the browser's `localStorage`.

## Commands

```sh
npm install      # dependencies
npm run dev      # dev server at http://localhost:5173
npm test         # quick-add parser tests (Vitest)
npm run build    # type-check + production build in dist/
```

## Features

- Views: Inbox, Today (with overdue tasks), Next 7 days, Completed
- Colored projects, labels, priorities P1–P4
- Natural-language quick add: `today`/`tod`, `tomorrow`/`tmr`, weekdays (`friday` or `fri`),
  `m/d` or `m/d/yyyy` dates, `p1`–`p4`, `#project`, `@label`
  — e.g. `Pay bills friday p1 #Home @urgent`
- Task editor, undo after completing, press `Q` to start typing
- Automatic light/dark theme, mobile layout

## Structure

```
src/
  App.tsx              layout, current view, actions
  types.ts             Task, Project, View
  lib/store.ts         state + persistence (plug a backend in here)
  lib/views.ts         what each view shows (Today, Next 7 days, …)
  lib/parse.ts         quick-add parser (+ parse.test.ts)
  lib/dates.ts         date helpers and formatting
  components/          Sidebar, QuickAdd, TaskItem, TaskEditor, Toast, icons
```
