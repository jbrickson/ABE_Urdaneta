import { useEffect, useState } from "react"

const EVENT_STARTS_AT = new Date(2026, 9, 16, 15, 0, 0).getTime()

function getCountdownParts(now: number) {
  const seconds = Math.max(0, Math.floor((EVENT_STARTS_AT - now) / 1000))

  return {
    hours: String(Math.floor(seconds / 3600)).padStart(2, "0"),
    minutes: String(Math.floor((seconds % 3600) / 60)).padStart(2, "0"),
    seconds: String(seconds % 60).padStart(2, "0"),
  }
}

export default function App() {
  const [countdownNow, setCountdownNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setCountdownNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const countdown = getCountdownParts(countdownNow)

  return (
    <main className="app-shell">
      <header className="topbar guest-topbar">
        <div className="brand-mark brand-pill" aria-hidden="true">
          <span>✦</span>
        </div>
        <div className="topbar-copy">
          <span className="eyebrow subtle">ABE Urdaneta</span>
          <strong>Acquaintance Party</strong>
        </div>
      </header>

      <section className="guest-screen">
        <div className="hero-panel">
          <div className="hero-badge">An evening worth showing up for</div>
          <img
            className="stationery-art"
            src={`${import.meta.env.BASE_URL}stationery-florals.svg`}
            alt=""
            aria-hidden="true"
          />
          <h1>Acquaintance Party</h1>
          <p>
            Join us for an evening of celebration, connection, and unforgettable
            memories. We look forward to celebrating with you.
          </p>
          <div className="event-meta">
            <span>Friday, October 16, 2026</span>
            <span>3:00 PM Onwards</span>
            <span>3rd Floor Balikbayan Hall, Urdaneta City Cultural and Sports Complex</span>
          </div>
        </div>

        <aside className="verification-card elevate-card">
          <div
            className="event-countdown"
            role="timer"
            aria-live="off"
            aria-label={`${countdown.hours} hours, ${countdown.minutes} minutes, ${countdown.seconds} seconds`}
          >
            <span className="countdown-caption">Event starts in</span>
            <div className="countdown-time" aria-hidden="true">
              <span>{countdown.hours} <small>HRS</small></span>
              <i>:</i>
              <span>{countdown.minutes} <small>MIN</small></span>
              <i>:</i>
              <span>{countdown.seconds} <small>SEC</small></span>
            </div>
          </div>
          <p className="card-label">The evening</p>
          <h2>Glitz &amp; Glam</h2>
          <p className="helper-text">
            <strong>Dress code</strong>
            <br />
            Best version of yourself.
          </p>
        </aside>
      </section>
    </main>
  )
}
