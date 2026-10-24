# Roadmap

- [Next up](#next-up-guided-workflow): what gets built next.
- [Ideas](#ideas): features to come back to later. Not commitments.

## Next up: guided workflow

**Direction:** a complete task manager (everything Todoist does) with a method built in
and an assistant that runs the reviews and keeps the system lean. *Guided*, not enforced:
the app makes mess visible and adds friction where it matters, but it never blocks the
user and it has no numeric limits. Built for one user first, designed for others.

The problems it exists to solve, in order: reviews don't happen, backlogs grow unseen,
the same tasks get rescheduled over and over.

### Model

**One kind of container, nestable.** A container with a *target* and a *definition of
done* is a project; without them it is a list, a scoped group of tasks. Adding the two
fields turns a list into a project; removing them turns it back. Children of a project
are its supporting sub-projects and sub-lists: no limit, no special name.

**Built-in containers**, fixed, hideable, not deletable: Inbox, Someday, Admin/Errands,
Proud of. Everything else is created by the user.

**Closing a project** asks to confirm the definition of done and moves it to Proud of,
grouped by year. A closed project is not reopened: its target was met, a new goal is a
new project ("duplicate as new project" is a convenience).

**Sprint.** One project is active at a time: it is in sprint, and the sprint is the only
place where a *target* has a deadline. Tasks can carry dates anywhere, in or out of the
sprint. When the deadline arrives, a decision card asks: new target, close, or extend with
a reason.

**Labels**, built in, no caps: `Next` (do it in the next free slot), `Radar` (soon, but
not clear when), `Sprint-<theme>` (applied automatically to the active project's tasks).

**Priority** is optional and derived, not assigned: two questions, "is there a real
deadline?" and "what happens if it never gets done?", mapped to P1–P4. The assistant asks
them during review or when a task enters the sprint.

**A task is an action.** Descriptions and reference material live in an external notes
vault (e.g. Obsidian) behind a link; only execution instructions belong in the
description. A short cap on the description field suggests moving long text to a note.

### Review: a decision queue, not an event

Rule-based conditions put items in a queue of decisions:

| Condition | Default |
| --- | --- |
| Item in Inbox | 15 days |
| Item in a list, untouched | 60 days |
| Task rescheduled | 2 times |
| `Radar` on an item | 30 days |
| Target deadline passed | immediately |

Each decision is a card with a few actions: keep, `Next`, `Radar`, remove the date,
delete, promote to project, merge. Today shows 2–3 cards a day. Past 10 pending, the app
offers a review session: cards grouped by list, visible timer, resumable. Rescheduling
escalates instead of repeating: date → `Next` → `Radar` → no date.

Defaults are fixed in v1 and tuned by use.

### Assistant

**v1: an MCP server.** aZenda exposes tools, and the user's own assistant (Claude,
ChatGPT) runs the review with them, as Luca already does against Todoist today. Tools:

1. list stale and repeatedly rescheduled items (rule-based, no LLM);
2. propose an action for each pending decision;
3. validate a target ("ssss" does not pass, "2 interviews scheduled by Oct 15" does);
4. help answer the two priority questions;
5. find duplicates; the merge itself is an app action, offered as a card, never automatic
   (keep one, append the other's description, labels and subtasks, delete it with an
   activity trace).

**v2: in-app.** Suggestions inside the cards and a prompt box, with the user's own API
key (Anthropic, OpenAI, OpenAI-compatible endpoints). Project summary at the checkpoint.

A per-container privacy toggle keeps hidden containers out of every prompt; they still
count in the rule-based signals. The app works fully without an LLM; the assistant is the
reason to use it.

### Build order

1. Backend: Node/TS, single user, no auth; sync of the current data model.
2. Containers with optional target, definition of done and parent; sprint; built-in
   labels and containers; closing to Proud of.
3. Rules engine, decision queue, cards in Today, review session.
4. MCP server with tools 1–5.
5. One-shot Todoist import (repeatable until Todoist is switched off). Imported old items
   feed the decision queue in chunks, which doubles as the initial review.
6. Recurrence and subtasks when needed (project checkpoint, v2).

Deferred past v1: yearly goals, planned/recurrent containers, multi-user, project
checkpoint, two-way Todoist sync (deliberately never).

### Open questions

- Should blocked actions ever exist, or is "draft until target" the only hard rule left
  (a list cannot enter a sprint)?
- Where does the MCP server run for a web app: alongside the backend, with a token?

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
