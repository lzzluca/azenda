# aZenda

Task manager in stile Todoist. React 19 + TypeScript + Vite; i dati restano nel `localStorage` del browser.

## Comandi

```sh
npm install      # dipendenze
npm run dev      # sviluppo su http://localhost:5173
npm test         # test del parser (Vitest)
npm run build    # controllo tipi + build in dist/
```

## Funzioni

- Viste: Inbox, Oggi (con i task in ritardo), Prossimi 7 giorni, Completate
- Progetti colorati, etichette, priorità P1–P4
- Inserimento rapido in linguaggio naturale: `oggi`, `domani`, `dopodomani`, giorni della settimana,
  `12/10`, `p1`–`p4`, `#progetto`, `@etichetta`
- Editor del task, annulla dopo il completamento, tasto `Q` per scrivere
- Tema chiaro/scuro automatico, layout mobile

## Struttura

```
src/
  App.tsx              layout, vista corrente, azioni
  types.ts             Task, Project, View
  lib/store.ts         stato + persistenza (qui si collega un backend)
  lib/views.ts         cosa mostra ogni vista (Oggi, Prossimi, …)
  lib/parse.ts         parser dell'inserimento rapido (+ parse.test.ts)
  lib/dates.ts         utilità per le date in italiano
  components/          Sidebar, QuickAdd, TaskItem, TaskEditor, Toast, icone
vanilla/               prima versione in HTML/CSS/JS puro
```
