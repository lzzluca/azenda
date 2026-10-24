import { serve } from '@hono/node-server'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createApp } from './app.ts'
import { openDb } from './db.ts'

const port = Number(process.env.PORT ?? 3001)
const file = process.env.AZENDA_DB ?? 'server/data/azenda.db'

mkdirSync(dirname(file), { recursive: true })
const app = createApp(openDb(file))

serve({ fetch: app.fetch, port }, () => console.log(`aZenda API on http://localhost:${port} (${file})`))
