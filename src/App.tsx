import { FormEvent, useEffect, useMemo, useState } from "react"

import * as XLSX from "xlsx"
import {
  databaseRequest,
  isDatabaseConfigured,
  type AttendanceChoice,
  type GuestRecord,
  type GuestStatus,
} from "./database"

type AdminFilter = "All" | GuestStatus

const EVENT_STARTS_AT = new Date(2026, 9, 16, 15, 0, 0).getTime()

const EVENT_DETAILS = {
  title: "Acquaintance Party",

  date: "Friday, October 16, 2026",

  time: "3:00 PM Onwards",

  venue: "3rd Floor Balikbayan Hall, Urdaneta City Cultural and Sports Complex",

  theme: "Glitz & Glam",

  dressCode: "Best version of yourself",
}

const PROGRAM_SCHEDULE = [
  {
    time: "3:00 PM – 3:30 PM",
    activity: "Registration/Attendance and Photo Booth",
    person: "Supreme Student Council & Adviser",
  },
  { time: "3:30 PM – 3:40 PM", activity: "Opening Prayer", person: "AVP" },
  {
    time: "3:40 PM – 3:55 PM",
    activity: "Welcome Remarks",
    person: "Dr. Jeannie J. Bruan, LLB",
  },
  {
    time: "3:55 PM – 4:15 PM",
    activity:
      "Grand Entrance and Introduction of the School Director, College Dean, Program Head, SHS Academic Coordinator, Faculty Members, and Administrative Staff",
    person: "Supreme Student Council Officers",
  },
  {
    time: "4:15 PM – 4:25 PM",
    activity:
      "Mass Presentation and Induction of Department Officers for School Year 2026-2027",
    person:
      "Supreme Student Adviser: Sir Mark Emarson Ayap; Dr. Jeannie J. Bruan, LLB",
  },
  {
    time: "4:25 PM – 4:40 PM",
    activity:
      "Presentation and Induction of Supreme Student Council Officers for School Year 2026-2027",
    person:
      "Supreme Student Adviser: Ms. Lovely Salguet; Dr. Jeannie J. Bruan, LLB",
  },
  {
    time: "4:40 PM – 4:45 PM",
    activity: "Inaugural Speech of the SSC",
    person: "Presidents name",
  },
  {
    time: "4:45 PM – 4:50 PM",
    activity: "Intermission Dance Performance",
    person: "Supreme Student Council Officers",
  },
  {
    time: "4:50 PM – 5:00 PM",
    activity: "Message from the College Dean",
    person: "Mr. Terrence Spenzer Pascua, LPT, MBA, CHRA",
  },
  {
    time: "5:00 PM – 5:10 PM",
    activity: "Department Presentation",
    person: "BSA and BSBA",
  },
  {
    time: "5:10 PM – 5:20 PM",
    activity: "Department Presentation",
    person: "BSHM- Second Year",
  },
  {
    time: "5:20 PM – 5:40 PM",
    activity: "Presentation of Mr. and Miss Acquaintance Candidates",
    person: "Emcees",
  },
  {
    time: "5:40 PM – 5:50 PM",
    activity: "Department Presentation",
    person: "BSIT and BSCS",
  },
  {
    time: "5:50 PM – 6:10 PM",
    activity: "Search for Dancing King and Queen",
    person: "All Participants",
  },
  {
    time: "6:10 PM – 6:20 PM",
    activity: "Department Presentation",
    person: "BSHM- First Year",
  },
  {
    time: "6:20 PM – 6:30 PM",
    activity: "Department Presentation",
    person: "Senior High School",
  },
  { time: "6:30 PM – 7:00 PM", activity: "Dinner", person: "" },
  {
    time: "7:00 PM – 7:15 PM",
    activity:
      "Announcement and Recognition of Winners: Mr. and Miss Acquaintance; Dancing King and Queen; Mr. and Miss Congeniality; Crowd's Darling",
    person: "Emcees",
  },
  {
    time: "7:15 PM – 7:20 PM",
    activity: "Closing Remarks",
    person: "Ms. Tiffany B.Ramos, MBA, CHRA",
  },
  {
    time: "7:20 PM – 8:00 PM",
    activity: "Dance, Dance, Dance: Open Dance Floor",
    person: "All Participants",
  },
]

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function normalizeUsn(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase()
}

function buildGuestRow(guest: GuestRecord, index: number) {
  return {
    No: index + 1,

    USN: guest.usn,

    "Guest Name": guest.name,

    "Attendance Status": guest.status,

    "Confirmation Date": guest.confirmationDate ?? "-",

    "Confirmation Time": guest.confirmationTime ?? "-",
  }
}

export default function App() {
  const [guests, setGuests] = useState<GuestRecord[]>([])

  const [databaseError, setDatabaseError] = useState(
    isDatabaseConfigured
      ? ""
      : "The shared attendance database is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable guest verification.",
  )

  const [adminToken, setAdminToken] = useState("")

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const [pdfError, setPdfError] = useState("")

  const [pdfSuccess, setPdfSuccess] = useState("")

  const [countdownNow, setCountdownNow] = useState(() => Date.now())

  const [guestUsnInput, setGuestUsnInput] = useState("")

  const [verificationError, setVerificationError] = useState("")

  const [verifiedGuest, setVerifiedGuest] = useState<GuestRecord | null>(null)

  const [attendanceChoice, setAttendanceChoice] =
    useState<AttendanceChoice | null>(null)

  const [attendanceConfirmationChoice, setAttendanceConfirmationChoice] =
    useState<AttendanceChoice | null>(null)

  const [confirmationModal, setConfirmationModal] = useState<{
    guest: string

    status: AttendanceChoice
  } | null>(null)

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)

  const [showAdminLogin, setShowAdminLogin] = useState(false)

  const [adminPassword, setAdminPassword] = useState("")

  const [adminError, setAdminError] = useState("")

  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [isVerifyingUsn, setIsVerifyingUsn] = useState(false)

  const [isSavingAttendance, setIsSavingAttendance] = useState(false)

  const [isRefreshingGuests, setIsRefreshingGuests] = useState(false)

  const [isAddingGuest, setIsAddingGuest] = useState(false)

  const [updatingGuestId, setUpdatingGuestId] = useState<string | null>(null)

  const [adminSearch, setAdminSearch] = useState("")

  const [adminFilter, setAdminFilter] = useState<AdminFilter>("All")

  const [adminSort, setAdminSort] = useState<"name-asc" | "date-desc">(
    "name-asc",
  )

  const [activeView, setActiveView] = useState<"guest" | "admin">("guest")

  const [guestFormError, setGuestFormError] = useState("")

  const refreshGuestDatabase = async (showLoading = true) => {
    if (!adminToken) return
    if (showLoading) setIsRefreshingGuests(true)

    try {
      const result = await databaseRequest<{ guests: GuestRecord[] }>(
        { action: "admin:list" },
        adminToken,
      )
      setGuests(result.guests)
      setDatabaseError("")
    } catch (error) {
      console.error("Could not refresh the guest database.", error)
      setDatabaseError(
        error instanceof Error
          ? error.message
          : "Guest data could not be retrieved. Please try again.",
      )
    } finally {
      if (showLoading) setIsRefreshingGuests(false)
    }
  }

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setCountdownNow(Date.now()),
      1000,
    )

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!isAdminAuthenticated || !adminToken || activeView !== "admin") return

    const intervalId = window.setInterval(() => {
      void refreshGuestDatabase(false)
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [activeView, adminToken, isAdminAuthenticated])

  useEffect(() => {
    if (!confirmationModal && !attendanceConfirmationChoice) return

    const previousOverflow = document.body.style.overflow

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmationModal(null)

        setAttendanceConfirmationChoice(null)
      }
    }

    document.body.style.overflow = "hidden"

    window.addEventListener("keydown", closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow

      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [attendanceConfirmationChoice, confirmationModal])

  const summary = useMemo(
    () => ({
      total: guests.length,

      attending: guests.filter((guest) => guest.status === "Attending").length,

      notAttending: guests.filter((guest) => guest.status === "Not Attending")
        .length,

      pending: guests.filter((guest) => guest.status === "Pending").length,
    }),

    [guests],
  )

  const attendingGuests = useMemo(
    () => guests.filter((guest) => guest.status === "Attending"),

    [guests],
  )

  const notAttendingGuests = useMemo(
    () => guests.filter((guest) => guest.status === "Not Attending"),

    [guests],
  )

  const pendingGuests = useMemo(
    () => guests.filter((guest) => guest.status === "Pending"),

    [guests],
  )

  const adminResults = useMemo(() => {
    const normalizedSearch = normalizeName(adminSearch)

    return guests

      .filter((guest) => {
        const matchesSearch =
          !normalizedSearch ||
          normalizeName(guest.name).includes(normalizedSearch)

        return (
          matchesSearch &&
          (adminFilter === "All" || guest.status === adminFilter)
        )
      })

      .sort((left, right) => {
        if (adminSort === "date-desc") {
          return (right.confirmedAt ?? "").localeCompare(left.confirmedAt ?? "")
        }

        return left.name.localeCompare(right.name)
      })
  }, [adminFilter, adminSearch, adminSort, guests])

  const countdownSeconds = Math.max(
    0,
    Math.floor((EVENT_STARTS_AT - countdownNow) / 1000),
  )

  const countdownHours = String(Math.floor(countdownSeconds / 3600)).padStart(
    2,
    "0",
  )

  const countdownMinutes = String(
    Math.floor((countdownSeconds % 3600) / 60),
  ).padStart(2, "0")

  const countdownRemainderSeconds = String(countdownSeconds % 60).padStart(
    2,
    "0",
  )

  const guestIsConfirmed = Boolean(
    verifiedGuest && verifiedGuest.status !== "Pending",
  )

  const handleVerifyGuest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isVerifyingUsn) return

    setVerificationError("")

    setIsVerifyingUsn(true)

    void (async () => {
      try {
        const result = await databaseRequest<{ guest: GuestRecord }>({
          action: "guest:verify",
          usn: normalizeUsn(guestUsnInput),
        })
        setVerifiedGuest(result.guest)
        setAttendanceChoice(
          result.guest.status === "Pending" ? null : result.guest.status,
        )
      } catch (error) {
        console.error("Could not verify guest USN.", error)
        setVerificationError(
          error instanceof Error ? error.message : "Guest verification failed.",
        )
        setVerifiedGuest(null)
        setAttendanceChoice(null)
      } finally {
        setIsVerifyingUsn(false)
      }
    })()
  }

  const handleConfirmAttendance = async (choice: AttendanceChoice | null) => {
    if (!verifiedGuest || !choice || isSavingAttendance) return

    if (verifiedGuest.status !== "Pending") {
      setVerificationError("This guest has already submitted a response.")

      return
    }

    setIsSavingAttendance(true)
    setVerificationError("")

    try {
      const result = await databaseRequest<{ guest: GuestRecord }>({
        action: "guest:confirm",
        usn: verifiedGuest.usn,
        status: choice,
      })
      const updatedGuest = result.guest
      setVerifiedGuest(updatedGuest)
      setAttendanceChoice(choice)
      setGuests((current) =>
        current.map((guest) =>
          guest.id === updatedGuest.id ? updatedGuest : guest,
        ),
      )
      setConfirmationModal({ guest: updatedGuest.name, status: choice })
    } catch (error) {
      console.error("Could not save attendance confirmation.", error)
      if (
        error instanceof Error &&
        error.message === "This guest has already submitted a response."
      ) {
        try {
          const latest = await databaseRequest<{ guest: GuestRecord }>({
            action: "guest:verify",
            usn: verifiedGuest.usn,
          })
          setVerifiedGuest(latest.guest)
          setAttendanceChoice(
            latest.guest.status === "Pending" ? null : latest.guest.status,
          )
          setVerificationError(
            `This guest has already submitted a response as ${latest.guest.status}.`,
          )
          return
        } catch (refreshError) {
          console.error("Could not retrieve the existing guest response.", refreshError)
        }
      }
      setVerificationError(
        error instanceof Error
          ? error.message
          : "Your response could not be saved. Please try again.",
      )
    } finally {
      setIsSavingAttendance(false)
    }
  }

  const handleAdminLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isLoggingIn) return

    setAdminError("")

    setIsLoggingIn(true)

    void (async () => {
      try {
        const login = await databaseRequest<{ token: string }>({
          action: "admin:login",
          password: adminPassword,
        })
        const database = await databaseRequest<{ guests: GuestRecord[] }>(
          { action: "admin:list" },
          login.token,
        )
        setAdminToken(login.token)
        setGuests(database.guests)
        setDatabaseError("")
        setIsAdminAuthenticated(true)
        setActiveView("admin")
        setShowAdminLogin(false)
        setAdminPassword("")
      } catch (error) {
        console.error("Administrator sign-in failed.", error)
        setAdminError(
          error instanceof Error ? error.message : "Administrator sign-in failed.",
        )
      } finally {
        setIsLoggingIn(false)
      }
    })()
  }

  const updateGuestStatus = async (
    guestId: string,
    nextStatus: GuestStatus,
  ) => {
    const currentGuest = guests.find((guest) => guest.id === guestId)

    if (!currentGuest || !adminToken || updatingGuestId) return
    setUpdatingGuestId(guestId)

    try {
      const result = await databaseRequest<{ guest: GuestRecord }>(
        {
          action: "admin:set-status",
          usn: currentGuest.usn,
          status: nextStatus,
        },
        adminToken,
      )
      setGuests((current) =>
        current.map((guest) =>
          guest.id === guestId ? result.guest : guest,
        ),
      )
      setDatabaseError("")
      if (verifiedGuest?.id === guestId) setVerifiedGuest(result.guest)
    } catch (error) {
      console.error("Could not update guest attendance status.", error)
      setDatabaseError(
        error instanceof Error
          ? error.message
          : "Guest attendance status could not be updated.",
      )
    } finally {
      setUpdatingGuestId(null)
    }
  }

  const handleAddGuest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget

    const formData = new FormData(form)

    const name = String(formData.get("newGuest") ?? "").trim()

    const usn = normalizeUsn(String(formData.get("newUsn") ?? ""))

    setGuestFormError("")

    if (!name || !usn) {
      setGuestFormError("Enter both a guest name and USN.")

      return
    }

    const exists = guests.some((guest) => normalizeUsn(guest.usn) === usn)

    if (exists) {
      setGuestFormError("A guest with that USN is already registered.")

      return
    }

    setIsAddingGuest(true)
    void (async () => {
      try {
        const result = await databaseRequest<{ guest: GuestRecord }>(
          { action: "admin:add", name, usn },
          adminToken,
        )
        setGuests((current) => [...current, result.guest])
        setDatabaseError("")
        form.reset()
      } catch (error) {
        console.error("Could not add guest.", error)
        setGuestFormError(
          error instanceof Error ? error.message : "Guest could not be added.",
        )
      } finally {
        setIsAddingGuest(false)
      }
    })()
  }

  const handleGuestRemoval = async (guestId: string) => {
    const guest = guests.find((item) => item.id === guestId)
    if (!guest || !adminToken || updatingGuestId) return
    setUpdatingGuestId(guestId)

    try {
      await databaseRequest<{ removed: boolean }>(
        { action: "admin:remove", usn: guest.usn },
        adminToken,
      )
      setGuests((current) => current.filter((item) => item.id !== guestId))
      setDatabaseError("")
    } catch (error) {
      console.error("Could not remove guest.", error)
      setDatabaseError(
        error instanceof Error ? error.message : "Guest could not be removed.",
      )
    } finally {
      setUpdatingGuestId(null)
    }
  }

  const handleSavePdf = async () => {
    if (isGeneratingPdf) return
    setIsGeneratingPdf(true)
    setPdfError("")
    setPdfSuccess("")

    try {
      const { downloadInvitationPdf } = await import("./pdf")
      await downloadInvitationPdf(
        `acquaintance-party-invitation-${normalizeUsn(verifiedGuest?.usn ?? "guest")}.pdf`,
      )
      setPdfSuccess("Your invitation PDF has been downloaded.")
    } catch (error) {
      console.error("Could not generate the invitation PDF.", error)
      setPdfError(
        error instanceof Error
          ? error.message
          : "The invitation PDF could not be generated. Please try again.",
      )
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const exportGuests = (mode: "all" | "attending") => {
    const rows = (mode === "all" ? guests : attendingGuests).map(buildGuestRow)

    const worksheet = XLSX.utils.json_to_sheet(rows)

    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,

      worksheet,

      mode === "all" ? "Guest List" : "Attending Guests",
    )

    XLSX.writeFile(
      workbook,

      mode === "all"
        ? "Acquaintance_Party_Guest_List.xlsx"
        : "Acquaintance_Party_Attending_Guests.xlsx",
    )
  }

  const renderGuestTable = (
    rows: GuestRecord[],
    showAttendanceActions = false,
  ) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>USN</th>
            <th>Guest Name</th>
            <th>Status</th>
            <th>Date Confirmed</th>
            <th>Time Confirmed</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((guest, index) => (
            <tr key={guest.id}>
              <td>{index + 1}</td>
              <td>{guest.usn}</td>
              <td>{guest.name}</td>
              <td>
                <span
                  className={`status-pill ${guest.status.toLowerCase().replace(" ", "-")}`}
                >
                  {guest.status}
                </span>
              </td>
              <td>{guest.confirmationDate ?? "—"}</td>
              <td>{guest.confirmationTime ?? "—"}</td>
              <td className="action-cell">
                {showAttendanceActions && guest.status === "Pending" ? (
                  <>
                    <button
                      type="button"
                      className="mini-button"
                      disabled={updatingGuestId !== null}
                      onClick={() => updateGuestStatus(guest.id, "Attending")}
                    >
                      Attending
                    </button>
                    <button
                      type="button"
                      className="mini-button"
                      disabled={updatingGuestId !== null}
                      onClick={() =>
                        updateGuestStatus(guest.id, "Not Attending")
                      }
                    >
                      Not Attending
                    </button>
                  </>
                ) : null}
                {showAttendanceActions && guest.status === "Attending" ? (
                  <button
                    type="button"
                    className="mini-button"
                    disabled={updatingGuestId !== null}
                    onClick={() => updateGuestStatus(guest.id, "Not Attending")}
                  >
                    Mark Not Attending
                  </button>
                ) : null}
                {showAttendanceActions && guest.status === "Not Attending" ? (
                  <button
                    type="button"
                    className="mini-button"
                    disabled={updatingGuestId !== null}
                    onClick={() => updateGuestStatus(guest.id, "Attending")}
                  >
                    Mark Attending
                  </button>
                ) : null}
                {guest.status !== "Pending" ? (
                  <button
                    type="button"
                    className="mini-button danger"
                    disabled={updatingGuestId !== null}
                    onClick={() => updateGuestStatus(guest.id, "Pending")}
                  >
                    Reset
                  </button>
                ) : null}
                {guest.status === "Pending" ? (
                  <button
                    type="button"
                    className="mini-button danger"
                    disabled={updatingGuestId !== null}
                    onClick={() => handleGuestRemoval(guest.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7}>No guests in this list.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )

  return (
    <main className="app-shell">
      {(!isAdminAuthenticated && !showAdminLogin) ||
      (isAdminAuthenticated && activeView === "guest") ? (
        <>
          <header className="topbar guest-topbar screen-only">
            <div className="brand-mark brand-pill" aria-hidden="true">
              <span>✦</span>
            </div>
            <div className="topbar-copy">
              <span className="eyebrow subtle">Acquaintance Party</span>
              <strong>Invitation &amp; Confirmation</strong>
            </div>
            {!verifiedGuest ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  isAdminAuthenticated
                    ? setActiveView("admin")
                    : setShowAdminLogin(true)
                }
              >
                {isAdminAuthenticated ? "Admin Dashboard" : "Admin Login"}
              </button>
            ) : null}
          </header>

          {databaseError ? (
            <p className="error-banner storage-error" role="alert">
              {databaseError}
            </p>
          ) : null}

          {!verifiedGuest ? (
            <section className="guest-screen">
              <div className="hero-panel">
                <div className="hero-badge">
                  An evening worth showing up for
                </div>
                <img
                  className="stationery-art"
                  src={`${import.meta.env.BASE_URL}stationery-florals.svg`}
                  alt=""
                  aria-hidden="true"
                />
                <h1>{EVENT_DETAILS.title}</h1>
                <p>
                  Enter your registered USN to access your formal invitation and
                  confirm your attendance.
                </p>
                <div className="event-meta">
                  <span>{EVENT_DETAILS.date}</span>
                  <span>{EVENT_DETAILS.time}</span>
                  <span>{EVENT_DETAILS.venue}</span>
                </div>
              </div>
              <div className="verification-card elevate-card">
                <div className="event-countdown" role="timer" aria-live="off">
                  <span className="countdown-caption">Event starts in</span>
                  <div
                    className="countdown-time"
                    aria-label={`${countdownHours} hours, ${countdownMinutes} minutes, ${countdownRemainderSeconds} seconds`}
                  >
                    <span>
                      {countdownHours} <small>HRS</small>
                    </span>
                    <i aria-hidden="true">:</i>
                    <span>
                      {countdownMinutes} <small>MIN</small>
                    </span>
                    <i aria-hidden="true">:</i>
                    <span>
                      {countdownRemainderSeconds} <small>SEC</small>
                    </span>
                  </div>
                </div>
                <p className="card-label">Guest Verification</p>
                <h2>Enter your USN</h2>
                <form onSubmit={handleVerifyGuest} noValidate>
                  <label htmlFor="guest-usn">
                    ABE International College of Business and Accountancy -
                    Urdaneta City, Inc.
                  </label>
                  <input
                    id="guest-usn"
                    type="text"
                    value={guestUsnInput}
                    onChange={(event) => {
                      setGuestUsnInput(event.target.value)

                      if (verificationError) setVerificationError("")
                    }}
                    placeholder="Enter your registered USN"
                    autoComplete="off"
                  />
                  {verificationError ? (
                    <p className="error-banner" role="alert">
                      {verificationError}
                    </p>
                  ) : (
                    <p className="helper-text">
                      Enter the USN assigned to you on the official guest list.
                    </p>
                  )}
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={isVerifyingUsn || !isDatabaseConfigured}
                  >
                    Verify USN
                  </button>
                </form>
              </div>
            </section>
          ) : (
            <>
              <section className="invitation-screen">
                <div className="invitation-header row between">
                  <div className="brand-mark brand-pill" aria-hidden="true">
                    <span>✦</span>
                  </div>
                  <button
                    type="button"
                    className="back-link"
                    onClick={() => {
                      setVerifiedGuest(null)

                      setGuestUsnInput("")

                      setAttendanceChoice(null)

                      setVerificationError("")
                    }}
                  >
                    Not {verifiedGuest.name}?
                  </button>
                </div>
                <article className="invitation-card formal-card">
                  <div className="invitation-side">ABE URDANETA</div>
                  <div className="invitation-body">
                    <div className="invite-header">
                      <span>You are warmly invited to</span>
                      <span className="sparkle">✦</span>
                    </div>
                    <img
                      className="stationery-art2"
                      src={`${import.meta.env.BASE_URL}stationery-florals.svg`}
                      alt=""
                      aria-hidden="true"
                    />
                    <h2>
                      {EVENT_DETAILS.title}
                      <small>Invitation</small>
                    </h2>
                    <p className="reserve-line">
                      Reserved especially for{" "}
                      <strong>{verifiedGuest.name}</strong>
                    </p>
                    <div className="info-grid">
                      <div>
                        <label>Date</label>
                        <strong>{EVENT_DETAILS.date}</strong>
                      </div>
                      <div>
                        <label>Time</label>
                        <strong>{EVENT_DETAILS.time}</strong>
                      </div>
                      <div className="wide">
                        <label>Venue</label>
                        <strong>{EVENT_DETAILS.venue}</strong>
                      </div>
                      <div>
                        <label>Theme</label>
                        <strong>{EVENT_DETAILS.theme}</strong>
                      </div>
                      <div>
                        <label>Dress code</label>
                        <strong>{EVENT_DETAILS.dressCode}</strong>
                      </div>
                    </div>
                    <div className="attendance-panel">
                      <p className="panel-title">
                        Please choose your attendance
                      </p>
                      <div className="choice-row">
                        <button
                          type="button"
                          className={`choice-button attending-choice${
                            attendanceChoice === "Attending" ? " active" : ""
                          }`}
                          onClick={() =>
                            setAttendanceConfirmationChoice("Attending")
                          }
                          disabled={guestIsConfirmed}
                        >
                          COUNT ME IN
                        </button>
                        <button
                          type="button"
                          className={`choice-button${
                            attendanceChoice === "Not Attending"
                              ? " active"
                              : ""
                          }`}
                          onClick={() =>
                            setAttendanceConfirmationChoice("Not Attending")
                          }
                          disabled={guestIsConfirmed}
                        >
                          I CAN'T ATTEND
                        </button>
                      </div>
                      {verificationError ? (
                        <p className="error-banner" role="alert">
                          {verificationError}
                        </p>
                      ) : null}
                      {guestIsConfirmed ? (
                        <p className="response-note">
                          Your response has already been recorded as{" "}
                          <strong>{verifiedGuest.status}</strong>.
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="invitation-print-button"
                      onClick={() => void handleSavePdf()}
                      disabled={isGeneratingPdf}
                    >
                      {isGeneratingPdf ? "Preparing PDF…" : "Save PDF"}
                    </button>
                    {pdfError ? (
                      <p className="error-banner" role="alert">
                        {pdfError}
                      </p>
                    ) : null}
                    {pdfSuccess ? (
                      <p className="response-note" role="status">
                        {pdfSuccess}
                      </p>
                    ) : null}
                  </div>
                </article>
              </section>
              <div className="print-layout" aria-hidden="true">
                <section className="print-page">
                  <article className="print-card print-card-main">
                    <div className="print-medallion" aria-hidden="true">
                      ✦
                    </div>
                    <div className="print-institution-logos">
                      <img
                        src={`${import.meta.env.BASE_URL}abe-international-business-college.png`}
                        alt=""
                      />
                      <img
                        src={`${import.meta.env.BASE_URL}ama-education-system.png`}
                        alt=""
                      />
                    </div>
                    <p className="print-heading">
                      ABE International School of Business and Accountancy Inc.
                    </p>
                    <h1>
                      <span>Acquaintance</span>Party
                    </h1>
                    <p className="print-subtitle">
                      An evening of connection &amp; celebration
                    </p>
                    <div className="print-divider" aria-hidden="true" />
                    <p className="reserved">Reserved especially for</p>
                    <h2>{verifiedGuest.name}</h2>
                    <div className="print-detail-grid">
                      <div>
                        <span>Date</span>
                        <strong>{EVENT_DETAILS.date}</strong>
                      </div>
                      <div>
                        <span>Time</span>
                        <strong>3:00 PM – 8:00 PM</strong>
                      </div>
                      <div className="wide">
                        <span>Venue</span>
                        <strong>{EVENT_DETAILS.venue}</strong>
                      </div>
                      <div>
                        <span>Theme</span>
                        <strong>{EVENT_DETAILS.theme}</strong>
                      </div>
                      <div>
                        <span>Dress code</span>
                        <strong>{EVENT_DETAILS.dressCode}</strong>
                      </div>
                    </div>
                    <p className="attendance-note">
                      {guestIsConfirmed ? (
                        <>
                          Your response: <strong>{verifiedGuest.status}</strong>
                        </>
                      ) : (
                        <>Kindly confirm your attendance online.</>
                      )}
                    </p>
                    <p className="print-message">
                      We look forward to celebrating with you.
                    </p>
                    <footer className="print-footer">
                      <span>ABE URDANETA</span>
                      <span>GLITZ &amp; GLAM</span>
                    </footer>
                  </article>
                </section>
                <section className="print-page">
                  <article className="print-card print-card-program">
                    <div
                      className="print-medallion program-medallion"
                      aria-hidden="true"
                    >
                      ✦
                    </div>
                    <p className="print-heading">
                      Friday, October 16, 2026 · 3:00 PM – 8:00 PM
                    </p>
                    <h1>Programme Flow</h1>
                    <div className="program-spread">
                      <div className="program-column">
                        <p className="program-section-label">
                          Part I · Registration
                        </p>
                        <table>
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Activity</th>
                              <th>In charge</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PROGRAM_SCHEDULE.slice(0, 1).map((item) => (
                              <tr key={item.time}>
                                <td>{item.time}</td>
                                <td>{item.activity}</td>
                                <td>{item.person}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="program-section-label program-section-continuation">
                          Part II · Programme Proper
                        </p>
                        <table>
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Activity</th>
                              <th>In charge</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PROGRAM_SCHEDULE.slice(1, 10).map((item) => (
                              <tr key={item.time}>
                                <td>{item.time}</td>
                                <td>{item.activity}</td>
                                <td>{item.person}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="program-column program-column-right">
                        <p className="program-section-label">
                          Part II · Programme Proper · Continued
                        </p>
                        <table>
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Activity</th>
                              <th>In charge</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PROGRAM_SCHEDULE.slice(10).map((item) => (
                              <tr key={item.time}>
                                <td>{item.time}</td>
                                <td>{item.activity}</td>
                                <td>{item.person}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mc-block">
                          <p>Masters of Ceremonies</p>
                          <span>Ms. Lovely Salguet</span>
                          <span>Ms. Tiffany Ramos</span>
                        </div>
                        <footer className="print-footer">
                          <span>ABE URDANETA · ACQUAINTANCE PARTY 2026</span>
                          <span>GLITZ &amp; GLAM</span>
                        </footer>
                      </div>
                    </div>
                  </article>
                </section>
              </div>
            </>
          )}
        </>
      ) : null}

      {showAdminLogin && !isAdminAuthenticated ? (
        <section className="admin-login-page">
          <div className="admin-login-topbar">
            <span className="eyebrow subtle">Acquaintance Party</span>
            <button
              type="button"
              className="back-link"
              onClick={() => {
                setShowAdminLogin(false)
                setAdminError("")
              }}
            >
              Back to Guest Invitation
            </button>
          </div>
          <div className="login-modal admin-login-card">
            <p className="card-label">Administrator Access</p>
            <h3>Secure Login</h3>
            <form onSubmit={handleAdminLogin}>
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="Enter password"
              />
              {adminError ? (
                <p className="error-banner" role="alert">
                  {adminError}
                </p>
              ) : null}
              <button
                type="submit"
                className="primary-button"
                disabled={isLoggingIn}
              >
                Sign In
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {isLoggingIn || isVerifyingUsn || isSavingAttendance || isGeneratingPdf ? (
        <div className="modal-backdrop loading-backdrop" role="presentation">
          <div className="loading-modal" role="status" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <p className="card-label">
              {isVerifyingUsn || isSavingAttendance
                ? "Guest Attendance"
                : isGeneratingPdf
                  ? "Invitation PDF"
                  : "Administrator Access"}
            </p>
            <h2>
              {isVerifyingUsn
                ? "Verifying your USN"
                : isSavingAttendance
                  ? "Saving your response"
                  : isGeneratingPdf
                    ? "Preparing your PDF"
                    : "Signing you in"}
            </h2>
            <p>
              {isVerifyingUsn
                ? "Finding your invitation…"
                : isSavingAttendance
                  ? "Recording your response securely…"
                  : isGeneratingPdf
                    ? "Creating your download…"
                    : "Checking your password…"}
            </p>
          </div>
        </div>
      ) : null}

      {isAdminAuthenticated && activeView === "admin" ? (
        <div className="admin-shell screen-only">
          <header className="admin-header row between">
            <div>
              <p className="card-label">Admin Dashboard</p>
              <h1>Acquaintance Party Guest Management</h1>
            </div>
            <div className="row gap-12">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setActiveView("guest")}
              >
                Guest View
              </button>
              <button
                type="button"
                className="secondary-button danger-button"
                onClick={() => {
                  setIsAdminAuthenticated(false)
                  setAdminToken("")
                  setGuests([])
                  setShowAdminLogin(false)
                  setActiveView("guest")
                }}
              >
                Log Out
              </button>
            </div>
          </header>
          {databaseError ? (
            <p className="error-banner" role="alert">
              {databaseError}
            </p>
          ) : null}
          <section className="summary-grid">
            <article className="summary-card">
              <span>Total Guests</span>
              <strong>{summary.total}</strong>
            </article>
            <article className="summary-card success-card">
              <span>Total Attending</span>
              <strong>{summary.attending}</strong>
            </article>
            <article className="summary-card warning-card">
              <span>Total Not Attending</span>
              <strong>{summary.notAttending}</strong>
            </article>
            <article className="summary-card muted-card">
              <span>Pending / No Resp</span>
              <strong>{summary.pending}</strong>
            </article>
          </section>
          <section className="toolbar row between wrap">
            <div className="search-group">
              <input
                type="text"
                value={adminSearch}
                onChange={(event) => setAdminSearch(event.target.value)}
                placeholder="Search guest name"
              />
            </div>
            <div className="row gap-12 wrap">
              <select
                value={adminFilter}
                onChange={(event) =>
                  setAdminFilter(event.target.value as AdminFilter)
                }
              >
                <option value="All">All Status</option>
                <option value="Attending">Attending</option>
                <option value="Not Attending">Not Attending</option>
                <option value="Pending">Pending</option>
              </select>
              <select
                value={adminSort}
                onChange={(event) =>
                  setAdminSort(event.target.value as "name-asc" | "date-desc")
                }
              >
                <option value="name-asc">Sort: Name A–Z</option>
                <option value="date-desc">Sort: Recent</option>
              </select>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void refreshGuestDatabase()}
                disabled={isRefreshingGuests}
              >
                {isRefreshingGuests ? "Refreshing…" : "Refresh"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => exportGuests("all")}
              >
                Export to Excel
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => exportGuests("attending")}
              >
                Export Attending Guests
              </button>
            </div>
          </section>
          <section className="admin-panel add-guest-panel">
            <h2>Add Guest Manually</h2>
            <form className="inline-form" onSubmit={handleAddGuest}>
              <input
                name="newUsn"
                type="text"
                placeholder="USN (e.g. ABE-0100)"
              />
              <input name="newGuest" type="text" placeholder="Guest name" />
              <button
                type="submit"
                className="primary-button compact-button"
                disabled={isAddingGuest}
              >
                {isAddingGuest ? "Adding…" : "Add Guest"}
              </button>
            </form>
            {guestFormError ? (
              <p className="error-banner" role="alert">
                {guestFormError}
              </p>
            ) : null}
          </section>
          <section className="admin-panel">
            <h2>Attending Guests</h2>
            {renderGuestTable(attendingGuests, true)}
          </section>
          <section className="admin-panel">
            <h2>Not Attending</h2>
            {renderGuestTable(notAttendingGuests, true)}
          </section>
          <section className="admin-panel">
            <h2>Pending Guests</h2>
            {renderGuestTable(pendingGuests, true)}
          </section>
          <section className="admin-panel">
            <h2>Registered Guest Search Results</h2>
            {renderGuestTable(adminResults)}
          </section>
        </div>
      ) : null}

      {confirmationModal ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="confirmation-modal elegant-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="success-mark" aria-hidden="true">
              ✓
            </div>
            <p
              className={`card-label ${
                confirmationModal.status === "Attending"
                  ? "confirmed-label"
                  : ""
              }`}
            >
              {confirmationModal.status === "Attending"
                ? "Attendance Confirmed"
                : "Response Recorded"}
            </p>
            <h3>Guest: {confirmationModal.guest}</h3>
            <p className="modal-status">
              Status: <strong>{confirmationModal.status}</strong>
            </p>
            <p className="modal-copy">
              Your response has been successfully recorded.
            </p>
            <div className="modal-actions row between">
              <button
                type="button"
                className="secondary-button"
                onClick={() => window.print()}
              >
                Print Invitation
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => setConfirmationModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {attendanceConfirmationChoice ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="attendance-confirmation-dialog elegant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-confirmation-title"
          >
            <p className="card-label">Please Confirm</p>
            <h3 id="attendance-confirmation-title">
              {attendanceConfirmationChoice === "Attending"
                ? "Will you be joining us?"
                : "Are you sure you can't attend?"}
            </h3>
            <p className="modal-copy">
              {attendanceConfirmationChoice === "Attending"
                ? "Confirm that you will attend the Acquaintance Party."
                : "Confirm that you will not attend the Acquaintance Party."}
            </p>
            <div className="modal-actions row between">
              <button
                type="button"
                className="primary-button"
                disabled={isSavingAttendance}
                onClick={() => {
                  const choice = attendanceConfirmationChoice
                  setAttendanceConfirmationChoice(null)
                  void handleConfirmAttendance(choice)
                }}
              >
                Confirm
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAttendanceConfirmationChoice(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
