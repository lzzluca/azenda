# Handoff

Written 2026-10-24 at the end of the session that built the v1 roadmap. Enough for a fresh
session to continue from this file alone.

## Goal

aZenda is a task manager with the method built in (`README.md`) and an assistant that runs
the reviews over MCP. The design is settled in `ROADMAP.md` → "Next up: guided workflow";
the build order there has steps 1–5 marked done.

## Current state

- `main` is **6 commits ahead of `origin/main`** and not pushed (push was offered, not
  answered). The blog post that links the repo is already live, so push soon:
  `git push origin main`.
- 33 tests green (`npm test`), `npm run build` green (type-checks app + server).
- Run: `npm run dev:server` (API + MCP on :3001, DB in `server/data/azenda.db`) and
  `npm run dev` (app on :5173; 5173 was busy on this machine, any port works).
- Verified in the browser: cards and their actions, sprint start/extend, project close →
  Proud of, offline banner, localStorage migration.

## What was built today

| Commit | What |
| --- | --- |
| `349b721`, `ef733dc`, `81dccfe` | Backend: `node:sqlite` store, Hono JSON API, optimistic store in the app, one-time localStorage migration |
| `e31ea37` | One nestable container kind: target + definition of done = project, else list; one sprint; close → Proud of; built-in Someday maybe and Admin & errands |
| `3615f17` | Decision queue: rules in `src/lib/decisions.ts`, three cards a day in Today, Review view with 15-minute timer, reschedule escalation |
| `ad2e36a` | MCP endpoint `/mcp` (Streamable HTTP, optional `AZENDA_TOKEN`): 10 tools + `review` prompt, `server/mcp.ts` |
| `4742131` | `npm run import:todoist`, one-shot and repeatable (`server/import-todoist.ts`) |

## Decisions taken without the user (check if they matter)

- "Keep" on a card resets the item's clock (`updated`, `reschedules`, `radarSince`).
- Priority derivation in `derivePriority`: real deadline + serious consequences → P1; one of
  the two → P2; mild → P3; none → P4.
- Merge of duplicates: notes and labels joined, the dropped task logged in the kept task's
  notes (there is no activity log).
- Import maps projects named like "someday"/"admin" to the built-ins and turns
  `* 🎯 TARGET:` / `* ✅ DoD:` tasks into container fields. Completed tasks, sections,
  comments and subtask nesting are not imported.
- Built-in containers have fixed ids (`builtin-someday`, `builtin-admin`) because React
  strict mode runs the load effect twice and random ids duplicated them.
- `src/lib/{decisions,projects,tasks}.ts` import with `.ts` extensions so plain Node can
  share them with the server (`allowImportingTsExtensions` in both tsconfigs).
- No `Sprint-<theme>` label: the project in sprint is already identifiable.

## What did not get done / known gaps

- Todoist import never run against a real account; the paginated response shape
  (`results` / `next_cursor`) is from the docs only. First run on a scratch DB:
  `AZENDA_DB=/tmp/test.db TODOIST_TOKEN=... npm run import:todoist`.
- Not built from the roadmap model: hiding built-in containers, description-length cap,
  Today pulling one item from a sub-project after dated tasks, open-task trend, per-container
  privacy toggle for the assistant, recurrence and subtasks (v2, needed for the checkpoint).
- Server does not enforce one-sprint for raw `PUT /api/projects`; the app and the MCP tool do.
- With the server down the app shows a banner and does not save; no offline queue.
- Offline banner overlaps the header; sidebar status says "Saved on the server" even offline.
- `deleteProject` in `server/db.ts` scans all tasks (JSON column, no index); fine at this size.

## Next steps

1. Push `main`.
2. Run the Todoist import on a scratch DB, fix the response shape if needed, then import for
   real and start using aZenda daily with the review done by Claude over MCP
   (`claude mcp add --transport http azenda http://localhost:3001/mcp`).
3. Then, by pain felt: recurrence + subtasks → project checkpoint; privacy toggle; open-task
   trend; the Today ordering.

## Blog

The post lives in `~/projects/nerdstuckathome/src/content/blog/introducing-azenda.md` with
the diagram at `public/images/posts/azenda-decision-queue.svg`; pushed and deploying.
The draft doc is at https://claude.ai/artifact/Y5PkMFVt4xHH7Yahh9opXX. The blog repo now has
a `CLAUDE.md` (humanizer rule) added by another session: read it before editing posts.
