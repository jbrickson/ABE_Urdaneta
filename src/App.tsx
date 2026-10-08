import { FormEvent, useEffect, useMemo, useState } from "react"

import * as XLSX from "xlsx"

type GuestStatus = "Pending" | "Attending" | "Not Attending"

type AttendanceChoice = Exclude<GuestStatus, "Pending">

type AdminFilter = "All" | GuestStatus

interface GuestRecord {
  id: string

  name: string

  usn: string

  status: GuestStatus

  confirmationDate: string | null

  confirmationTime: string | null

  confirmedAt: string | null
}

interface Attendee {
  usn: string
  name: string
}

interface GuestDatabase {
  guests: GuestRecord[]
  knownSeededUsns: string[]
  error: string
}

const DB_KEY = "acquaintance-party-db-v2"

const ADMIN_PASSWORD = "emar2026"

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
    time: "3:00 PM – 4:00 PM",
    activity: "Registration, attendance & photo booth",
    person: "SSC Officers / Advisers",
  },
  { time: "4:00 – 4:10 PM", activity: "Prayer", person: "AVP" },
  {
    time: "4:10 – 4:25 PM",
    activity: "Welcome remarks",
    person: "Dr. Jeannie J. Braun, LLB",
  },
  {
    time: "4:25 – 4:35 PM",
    activity: "Entrance of faculties and staff",
    person: "SSC Officers",
  },
  {
    time: "4:35 – 4:40 PM",
    activity: "Presentation of SSC Officers",
    person: "SSC Advisers — Ms. Lovely Salguet & Mr. Mark Emarson Ayap",
  },
  {
    time: "4:40 – 4:45 PM",
    activity: "Induction of SSC Officers",
    person: "Dr. Jeannie J. Braun, LLB",
  },
  {
    time: "4:45 – 4:55 PM",
    activity: "Intermission dance number",
    person: "SSC Officers",
  },
  {
    time: "4:55 – 5:05 PM",
    activity: "A message from the Dean",
    person: "Dean Terrence Spenzer Pascua, LPT, MBA",
  },
  {
    time: "5:05 – 5:15 PM",
    activity: "Department presentation",
    person: "BSIT / CS",
  },
  {
    time: "5:15 – 5:25 PM",
    activity: "Department presentation",
    person: "BSHM — 2nd Year",
  },
  {
    time: "5:25 – 5:45 PM",
    activity: "Presentation of Mr. and Miss Acquaintance candidates",
    person: "Emcees",
  },
  {
    time: "5:45 – 5:55 PM",
    activity: "Department presentation",
    person: "BSA / BSBA",
  },
  {
    time: "5:55 – 6:15 PM",
    activity: "Search for Dancing King and Queen",
    person: "Emcees",
  },
  {
    time: "6:15 – 6:25 PM",
    activity: "Department presentation",
    person: "BSHM — 1st Year",
  },
  {
    time: "6:25 – 6:35 PM",
    activity: "Department presentation",
    person: "Senior High School",
  },
  { time: "6:35 – 7:00 PM", activity: "Dinner", person: "—" },
  {
    time: "7:00 – 7:15 PM",
    activity:
      "Announcement of Mr. and Miss Acquaintance and Dancing King and Queen",
    person: "Emcees",
  },
  {
    time: "7:15 – 7:20 PM",
    activity: "Closing remarks",
    person: "Ms. Tiffany B. Ramos",
  },
  { time: "7:20 – 8:00 PM", activity: "Dance, Dance, Dance", person: "—" },
]

const ATTENDEES: Attendee[] = [
  { usn: "01350062", name: "Dr. Jeannie J. Braun" },

  { usn: "12183021", name: "Sir Janbrickson C. Parco" },

  { usn: "12183024", name: "Sir Terrence Spenzer L. Pascua" },

  { usn: "12183028", name: "Ma'am Lovely Anne Salguet" },

  { usn: "12183035", name: "Sir Mark Emarson F. Ayap" },

  { usn: "12183014", name: "Ma'am Anne Castro" },

  { usn: "12183016", name: "Reuven Glenn B. Carillo" },

  { usn: "12183019", name: "Ma. Luisa T. Pajarillo" },

  { usn: "12183037", name: "Ma'am Tiffany Ramos" },

  { usn: "12183030", name: "Renante L. Valdez" },

  { usn: "12183033", name: "Angelica Mae D. Arzadon" },

  { usn: "25001920910", name: "Zipagan, Juan Rafael Palad" },

  { usn: "26000351510", name: "Sapasap, Rhian Joy Bautista" },

  { usn: "25000839010", name: "Fernandez, Aira Faye Perez" },

  { usn: "25001711310", name: "Bravo, Isaiah De Leon" },

  { usn: "26001052910", name: "Mendoza, Raymart Aduan" },

  { usn: "25000614110", name: "Estonilo, Valerie Jen" },

  { usn: "25000653410", name: "Jucutan, Cristina Cassandra Faye Quitevez" },

  { usn: "26000651410", name: "Aguilar, John Paul" },

  { usn: "26001391010", name: "Villanueva, Prince Nazzer" },

  { usn: "25000750510", name: "Caldito, Quennie Rich Borlado" },

  { usn: "25001366110", name: "Bautista, Louise Redoble" },

  { usn: "24001380310", name: "Andrada, Ena Jemaica Tarinay" },

  { usn: "25000653110", name: "Romo, Prescious Joy Pajar" },

  { usn: "26000818210", name: "Mercado, Ian Mondala" },

  { usn: "24000309110", name: "Adaliga, Francis Andrei Lomboy" },

  { usn: "24000309210", name: "Ranillo, Faye Angelie Lomboy" },

  { usn: "26000362710", name: "Sacdalan, Camille Garcia" },

  { usn: "25000997610", name: "Pagaduan Jr., Justino Gamurot" },

  { usn: "25001065610", name: "Visico, Vince Kingsley Docosin" },

  { usn: "25000817610", name: "Sagum, Matt Gedeon Aquino" },

  { usn: "25000704610", name: "Cablayan, Raymon Legaspi" },

  { usn: "25000949910", name: "Gagabuan, Febelyn Mendoza" },

  { usn: "24001785310", name: "Ordonio, Princess Joy Sijalbo" },

  { usn: "24000868310", name: "Leprozo, John Benedict Agacita" },

  { usn: "25000603510", name: "Nabong, Joyce Ann Cabatan" },

  { usn: "25001057510", name: "Arimas, Mark Anthony Materum" },

  { usn: "24000156110", name: "Visitacion, Jasmine Bucasas" },

  { usn: "25002099610", name: "Cablayan, Joshua Legaspi" },

  { usn: "25000572010", name: "Velasco, Devine Aquino" },

  { usn: "25000624210", name: "Castillo, Rafael Alexander Espiritu" },

  { usn: "26000931710", name: "Muan, Mary Cris Ibay" },

  { usn: "25000620110", name: "Labiano, Kimberly Serra" },

  { usn: "25000619610", name: "Valdez, Elizabeth Joyce Micua" },

  { usn: "19002372600", name: "Molina, John Rey De Vera" },

  { usn: "25001484910", name: "De guzman, Claribelle Pacli" },

  { usn: "25001455710", name: "Pacli, Maria Claire Casuga" },

  { usn: "25001490510", name: "Malapit, Cherry Pacli" },

  { usn: "24000798610", name: "Montalbo, Cathlene Jane Bala" },

  { usn: "23003166310", name: "Bacolod, Kylle Luz Ocharan" },

  { usn: "24001204510", name: "Verde, Karl Vincent Singson" },

  { usn: "24000805210", name: "Ramos jr., Sherwin Garcia" },

  { usn: "25001036610", name: "Lugue, Laython Johnsen M" },

  { usn: "25000594210", name: "Baltazar, John Ford Deguzman" },

  { usn: "26000597210", name: "Dingle, Trisha Lyn Dela cruz" },

  { usn: "25000798810", name: "Pariscal, Cyril Mae Alvarez" },

  { usn: "24000106510", name: "Malapitan, Christopher John Castillo" },

  { usn: "25000799410", name: "Dela cruz, Juvielyn Alvarez" },

  { usn: "25001166510", name: "Sunga, Ana Nina" },

  { usn: "26001267610", name: "Mendijar, Rica Stephanie" },

  { usn: "25001085210", name: "Bolaton, Jhazelle Zyrha Locquaio" },

  { usn: "25001263010", name: "Collado, Rosamiah Marquez" },

  { usn: "24000307610", name: "Sanchez, Eloisa Mina" },

  { usn: "25000997810", name: "Bangabanga, Markniel Aban" },

  { usn: "25001632610", name: "Al-gharaibeh, Tamara Villasor" },

  { usn: "26000939810", name: "Echon, Eric Namuca" },

  { usn: "24000805610", name: "Reyes, Mark Jb Paguyo" },

  { usn: "26000716410", name: "Dejito, Jorchiel Mae" },

  { usn: "26000414310", name: "Natan, Mia Gyle Palma" },

  { usn: "24000169210", name: "Esteban, John Edward Aboc" },

  { usn: "25000888210", name: "Esteban, Zekiah Joy Aboc" },

  { usn: "26000826110", name: "Olpindo, Rysa" },

  { usn: "24001519710", name: "Capitan, Maria Concepcion" },

  { usn: "26000762910", name: "Cañaveral, Vyenali Cris" },

  { usn: "26000754410", name: "Villanueva, Kristine Ann" },

  { usn: "26001003710", name: "Lapitan, Jea Margo Montero" },

  { usn: "26001131410", name: "Laluan, Yhanniz Francey Solis" },

  { usn: "23003150310", name: "Mangrobang, Lareyn Belle Itliong" },

  { usn: "25001201810", name: "Dulatre, Sarah Cacala" },

  { usn: "25000817710", name: "Gombio, Austine Nichole Palaganas" },

  { usn: "26001057110", name: "Espiritu, Rens Gabriel Duca" },

  { usn: "26000793910", name: "Darapisa, Jannery" },

  { usn: "26000713910", name: "Pascua, Alina" },

  { usn: "26000755810", name: "Serra, Jean Claude" },

  { usn: "26000627710", name: "Tabunda, Ashlie" },

  { usn: "25002039410", name: "Oclima, Alexa Wynne Cave" },

  { usn: "26000296810", name: "Ladio, Jireh Sabare" },

  { usn: "26000765610", name: "Flores, Miracle" },

  { usn: "26000200910", name: "Cendaña, Vin Lester Parocha" },

  { usn: "25000609310", name: "Valdez, James Velasco" },

  { usn: "25000609410", name: "Padilla, Luiz Angelo Basada" },

  { usn: "25000843910", name: "Gapuz, Eileen Joy Nonog" },

  { usn: "25000454610", name: "Sernadilla, Brix Aziken Mendoza" },

  { usn: "25000707710", name: "Calub, Edilberto Sagun" },

  { usn: "25000838510", name: "Mercado, Darlene Joyce Quidit" },

  { usn: "26000587710", name: "Dacalcap, Althea Bartolome" },

  { usn: "25000651410", name: "Lagahit, Kimberly Canin" },

  { usn: "26000773710", name: "Escalona, Aelyza" },

  { usn: "26000774010", name: "Subai, Remilla Rose Anne Bañaria" },
]

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function normalizeUsn(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase()
}

function createGuestRecord(attendee: Attendee, index: number): GuestRecord {
  return {
    id: `${normalizeUsn(attendee.usn)}-${index}`,

    name: attendee.name.trim(),

    usn: normalizeUsn(attendee.usn),

    status: "Pending",

    confirmationDate: null,

    confirmationTime: null,

    confirmedAt: null,
  }
}

function isGuestRecord(value: unknown): value is GuestRecord {
  if (!value || typeof value !== "object") return false

  const guest = value as Partial<GuestRecord>

  return (
    typeof guest.id === "string" &&
    typeof guest.name === "string" &&
    typeof guest.usn === "string" &&
    (guest.status === "Pending" ||
      guest.status === "Attending" ||
      guest.status === "Not Attending")
  )
}

function loadGuestDatabase(): GuestDatabase {
  const seededGuests = ATTENDEES.map(createGuestRecord)
  const seededUsns = seededGuests.map((guest) => guest.usn)

  try {
    const raw = window.localStorage.getItem(DB_KEY)

    if (!raw) {
      return { guests: seededGuests, knownSeededUsns: seededUsns, error: "" }
    }

    const parsed: unknown = JSON.parse(raw)

    if (Array.isArray(parsed) && parsed.every(isGuestRecord)) {
      const savedUsns = new Set(parsed.map((guest) => normalizeUsn(guest.usn)))
      const newGuests = seededGuests.filter(
        (guest) => !savedUsns.has(guest.usn),
      )

      return {
        guests: [...parsed, ...newGuests],
        knownSeededUsns: seededUsns,
        error: "",
      }
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("guests" in parsed) ||
      !Array.isArray(parsed.guests) ||
      !parsed.guests.every(isGuestRecord) ||
      !("knownSeededUsns" in parsed) ||
      !Array.isArray(parsed.knownSeededUsns) ||
      !parsed.knownSeededUsns.every(
        (usn): usn is string => typeof usn === "string",
      )
    ) {
      throw new Error("Saved guest data is not in the expected format.")
    }

    const savedUsns = new Set(
      parsed.knownSeededUsns.map((usn) => normalizeUsn(usn)),
    )
    const newGuests = seededGuests.filter((guest) => !savedUsns.has(guest.usn))

    return {
      guests: [...parsed.guests, ...newGuests],
      knownSeededUsns: [
        ...new Set([
          ...parsed.knownSeededUsns.map(normalizeUsn),
          ...seededUsns,
        ]),
      ],
      error: "",
    }
  } catch (error) {
    console.error("Could not load saved guest data.", error)

    return {
      guests: seededGuests,
      knownSeededUsns: seededUsns,
      error:
        "Saved guest data could not be loaded. The original guest list is shown.",
    }
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",

    day: "numeric",

    year: "numeric",
  })
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",

    minute: "2-digit",
  })
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
  const [initialDatabase] = useState(loadGuestDatabase)

  const [guests, setGuests] = useState(initialDatabase.guests)

  const [knownSeededUsns, setKnownSeededUsns] = useState(
    initialDatabase.knownSeededUsns,
  )

  const [storageError, setStorageError] = useState(initialDatabase.error)

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

  const [adminSearch, setAdminSearch] = useState("")

  const [adminFilter, setAdminFilter] = useState<AdminFilter>("All")

  const [adminSort, setAdminSort] = useState<"name-asc" | "date-desc">(
    "name-asc",
  )

  const [activeView, setActiveView] = useState<"guest" | "admin">("guest")

  const [guestFormError, setGuestFormError] = useState("")

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setCountdownNow(Date.now()),
      1000,
    )

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    try {
      const serializedDatabase = JSON.stringify({ guests, knownSeededUsns })

      if (window.localStorage.getItem(DB_KEY) === serializedDatabase) {
        setStorageError("")
        return
      }

      window.localStorage.setItem(DB_KEY, serializedDatabase)

      setStorageError("")
    } catch (error) {
      console.error("Could not save guest data.", error)

      setStorageError("Guest data could not be saved in this browser.")
    }
  }, [guests, knownSeededUsns])

  const refreshGuestDatabase = () => {
    const database = loadGuestDatabase()

    setGuests(database.guests)
    setKnownSeededUsns(database.knownSeededUsns)
    setStorageError(database.error)
  }

  useEffect(() => {
    const syncGuestDatabase = (event: StorageEvent) => {
      if (event.key === DB_KEY || event.key === null) refreshGuestDatabase()
    }

    window.addEventListener("storage", syncGuestDatabase)

    return () => window.removeEventListener("storage", syncGuestDatabase)
  }, [])

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

    window.setTimeout(() => {
      const guest = guests.find(
        (record) => normalizeUsn(record.usn) === normalizeUsn(guestUsnInput),
      )

      if (!guest) {
        setVerificationError("No Guest Record Found.")

        setVerifiedGuest(null)

        setAttendanceChoice(null)
      } else {
        setVerifiedGuest(guest)

        setAttendanceChoice(guest.status === "Pending" ? null : guest.status)
      }

      setIsVerifyingUsn(false)
    }, 350)
  }

  const handleConfirmAttendance = (choice: AttendanceChoice | null) => {
    if (!verifiedGuest || !choice) return

    if (verifiedGuest.status !== "Pending") {
      setVerificationError("This guest has already submitted a response.")

      return
    }

    const now = new Date()

    const updatedGuest: GuestRecord = {
      ...verifiedGuest,

      status: choice,

      confirmationDate: formatDate(now),

      confirmationTime: formatTime(now),

      confirmedAt: now.toISOString(),
    }

    setGuests((current) =>
      current.map((guest) =>
        guest.id === verifiedGuest.id ? updatedGuest : guest,
      ),
    )

    setVerifiedGuest(updatedGuest)

    setAttendanceChoice(choice)

    setConfirmationModal({ guest: updatedGuest.name, status: choice })
  }

  const handleAdminLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isLoggingIn) return

    setAdminError("")

    setIsLoggingIn(true)

    window.setTimeout(() => {
      setIsLoggingIn(false)

      if (adminPassword === ADMIN_PASSWORD) {
        setIsAdminAuthenticated(true)

        setActiveView("admin")

        setShowAdminLogin(false)

        setAdminPassword("")
      } else {
        setAdminError("Invalid admin credentials.")
      }
    }, 350)
  }

  const updateGuestStatus = (guestId: string, nextStatus: GuestStatus) => {
    const currentGuest = guests.find((guest) => guest.id === guestId)

    if (!currentGuest) return

    const now = new Date()

    const updatedGuest: GuestRecord =
      nextStatus === "Pending"
        ? {
            ...currentGuest,

            status: nextStatus,

            confirmationDate: null,

            confirmationTime: null,

            confirmedAt: null,
          }
        : {
            ...currentGuest,

            status: nextStatus,

            confirmationDate: formatDate(now),

            confirmationTime: formatTime(now),

            confirmedAt: now.toISOString(),
          }

    setGuests((current) =>
      current.map((guest) => (guest.id === guestId ? updatedGuest : guest)),
    )

    if (verifiedGuest?.id === guestId) setVerifiedGuest(updatedGuest)
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

    setGuests((current) => [
      ...current,

      {
        id: `${usn}-${Date.now()}`,

        name,

        usn,

        status: "Pending",

        confirmationDate: null,

        confirmationTime: null,

        confirmedAt: null,
      },
    ])

    form.reset()
  }

  const handleGuestRemoval = (guestId: string) => {
    setGuests((current) => current.filter((guest) => guest.id !== guestId))
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
                      onClick={() => updateGuestStatus(guest.id, "Attending")}
                    >
                      Attending
                    </button>
                    <button
                      type="button"
                      className="mini-button"
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
                    onClick={() => updateGuestStatus(guest.id, "Not Attending")}
                  >
                    Mark Not Attending
                  </button>
                ) : null}
                {showAttendanceActions && guest.status === "Not Attending" ? (
                  <button
                    type="button"
                    className="mini-button"
                    onClick={() => updateGuestStatus(guest.id, "Attending")}
                  >
                    Mark Attending
                  </button>
                ) : null}
                {guest.status !== "Pending" ? (
                  <button
                    type="button"
                    className="mini-button danger"
                    onClick={() => updateGuestStatus(guest.id, "Pending")}
                  >
                    Reset
                  </button>
                ) : null}
                {guest.status === "Pending" ? (
                  <button
                    type="button"
                    className="mini-button danger"
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

          {storageError ? (
            <p className="error-banner storage-error" role="alert">
              {storageError}
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
                    disabled={isVerifyingUsn}
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
                    <details className="schedule-details">
                      <summary>View program schedule</summary>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Activity</th>
                              <th>In charge</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PROGRAM_SCHEDULE.map((item) => (
                              <tr key={`${item.time}-${item.activity}`}>
                                <td>{item.time}</td>
                                <td>{item.activity}</td>
                                <td>{item.person}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
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
                      onClick={() => window.print()}
                    >
                      Print / Save as PDF
                    </button>
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

      {isLoggingIn || isVerifyingUsn ? (
        <div className="modal-backdrop loading-backdrop" role="presentation">
          <div className="loading-modal" role="status" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <p className="card-label">
              {isVerifyingUsn ? "Guest Verification" : "Administrator Access"}
            </p>
            <h2>{isVerifyingUsn ? "Verifying your USN" : "Signing you in"}</h2>
            <p>
              {isVerifyingUsn
                ? "Finding your invitation…"
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
                  setShowAdminLogin(false)
                  setActiveView("guest")
                }}
              >
                Log Out
              </button>
            </div>
          </header>
          {storageError ? (
            <p className="error-banner" role="alert">
              {storageError}
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
                onClick={refreshGuestDatabase}
              >
                Refresh
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
              <button type="submit" className="primary-button compact-button">
                Add Guest
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
                onClick={() => {
                  const choice = attendanceConfirmationChoice
                  setAttendanceConfirmationChoice(null)
                  handleConfirmAttendance(choice)
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
