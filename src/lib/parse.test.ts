import { describe, expect, it } from 'vitest'
import { parseQuick } from './parse'

// Sunday, September 27, 2026
const now = new Date(2026, 8, 27, 10, 0)

describe('parseQuick', () => {
  it('extracts date, priority, project and labels', () => {
    expect(parseQuick('Pay bills friday p1 #Home @urgent', now)).toEqual({
      title: 'Pay bills',
      due: '2026-10-02',
      priority: 1,
      project: 'Home',
      labels: ['urgent'],
    })
  })

  it('understands today and tomorrow, with short forms', () => {
    expect(parseQuick('a today', now).due).toBe('2026-09-27')
    expect(parseQuick('a tod', now).due).toBe('2026-09-27')
    expect(parseQuick('a tomorrow', now).due).toBe('2026-09-28')
    expect(parseQuick('a tmr', now).due).toBe('2026-09-28')
  })

  it('accepts 3-letter weekdays but not other prefixes', () => {
    expect(parseQuick('gym wed', now).due).toBe('2026-09-30')
    expect(parseQuick('gym wedn', now)).toMatchObject({ title: 'gym wedn', due: null })
  })

  it('moves the same weekday as today to next week', () => {
    expect(parseQuick('groceries sunday', now).due).toBe('2026-10-04')
  })

  it('reads m/d dates and rolls past ones into next year', () => {
    expect(parseQuick('checkup 10/12', now).due).toBe('2026-10-12')
    expect(parseQuick('checkup 2/3', now).due).toBe('2027-02-03')
    expect(parseQuick('checkup 2/3/28', now).due).toBe('2028-02-03')
  })

  it('leaves impossible dates in the title', () => {
    expect(parseQuick('code 2/31', now)).toMatchObject({ title: 'code 2/31', due: null })
  })

  it('returns just the title when there are no keywords', () => {
    expect(parseQuick('  Read a book  ', now)).toEqual({
      title: 'Read a book', due: null, priority: 4, project: null, labels: [],
    })
  })
})
