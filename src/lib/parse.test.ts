import { describe, expect, it } from 'vitest'
import { parseQuick } from './parse'

// domenica 27 settembre 2026
const now = new Date(2026, 8, 27, 10, 0)

describe('parseQuick', () => {
  it('estrae data, priorità, progetto ed etichette', () => {
    expect(parseQuick('Pagare bolletta venerdì p1 #Casa @urgente', now)).toEqual({
      title: 'Pagare bolletta',
      due: '2026-10-02',
      priority: 1,
      project: 'Casa',
      labels: ['urgente'],
    })
  })

  it('capisce oggi, domani e dopodomani', () => {
    expect(parseQuick('a oggi', now).due).toBe('2026-09-27')
    expect(parseQuick('a domani', now).due).toBe('2026-09-28')
    expect(parseQuick('a dopodomani', now).due).toBe('2026-09-29')
  })

  it('porta alla settimana dopo il giorno uguale a oggi', () => {
    expect(parseQuick('spesa domenica', now).due).toBe('2026-10-04')
  })

  it('legge le date gg/mm e passa all’anno dopo se già trascorse', () => {
    expect(parseQuick('visita 12/10', now).due).toBe('2026-10-12')
    expect(parseQuick('visita 3/2', now).due).toBe('2027-02-03')
    expect(parseQuick('visita 3/2/28', now).due).toBe('2028-02-03')
  })

  it('lascia nel titolo le date impossibili', () => {
    expect(parseQuick('codice 31/2', now)).toMatchObject({ title: 'codice 31/2', due: null })
  })

  it('senza parole chiave restituisce solo il titolo', () => {
    expect(parseQuick('  Leggere un libro  ', now)).toEqual({
      title: 'Leggere un libro', due: null, priority: 4, project: null, labels: [],
    })
  })
})
