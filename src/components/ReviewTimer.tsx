import { useEffect, useState } from 'react'

/** Counts down from `minutes`; a visible timebox, nothing more. */
export function ReviewTimer({ minutes }: { minutes: number }) {
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(start)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const left = Math.max(0, minutes * 60 - Math.floor((now - start) / 1000))
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return <div className={'timer' + (left === 0 ? ' over' : '')}>{left === 0 ? 'Time is up. Stop here and come back tomorrow.' : `${mm}:${ss}`}</div>
}
