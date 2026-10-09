export type GuestStatus = "Pending" | "Attending" | "Not Attending"

export type AttendanceChoice = Exclude<GuestStatus, "Pending">

export interface GuestRecord {
  id: string
  name: string
  usn: string
  status: GuestStatus
  confirmationDate: string | null
  confirmationTime: string | null
  confirmedAt: string | null
}

const projectUrl = "https://qwqxipkizubynxsoxahd.supabase.co"
const projectPublishableKey =
  "sb_publishable_KTFQ1k1Z-CYco9jBXscKaA_T3z9q9zZ"

const databaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, "") || projectUrl
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  projectPublishableKey

export const isDatabaseConfigured = Boolean(databaseUrl && publishableKey)

export async function databaseRequest<T>(
  payload: Record<string, unknown>,
  token?: string,
): Promise<T> {
  if (!databaseUrl || !publishableKey) {
    throw new Error(
      "Attendance storage is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then deploy the Supabase function.",
    )
  }

  let response: Response
  try {
    response = await fetch(`${databaseUrl}/functions/v1/guest-database`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error("Could not reach the attendance database.", error)
    throw new Error("Could not connect to the attendance database. Check your connection and try again.")
  }

  let result: unknown
  try {
    result = await response.json()
  } catch (error) {
    console.error("The attendance database returned an invalid response.", error)
    throw new Error("The attendance database returned an invalid response.")
  }

  if (!result || typeof result !== "object") {
    throw new Error(`Attendance database request failed (${response.status}).`)
  }

  if (!response.ok) {
    throw new Error(
      "error" in result && typeof result.error === "string"
        ? result.error
        : `Attendance database request failed (${response.status}).`,
    )
  }

  return result as T
}
