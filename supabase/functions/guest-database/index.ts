type GuestStatus = "Pending" | "Attending" | "Not Attending"

interface GuestRow {
  usn: string
  name: string
  status: GuestStatus
  confirmed_at: string | null
}

interface DenoRuntime {
  env: {
    get(name: string): string | undefined
  }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const denoRuntime = (globalThis as typeof globalThis & {
  Deno: DenoRuntime
}).Deno

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const columns = "usn,name,status,confirmed_at"

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function normalizeUsn(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, "").toUpperCase()
    : ""
}

function validUsn(usn: string) {
  return /^[A-Z0-9-]{1,32}$/.test(usn)
}

function validStatus(value: unknown): value is GuestStatus {
  return (
    value === "Pending" ||
    value === "Attending" ||
    value === "Not Attending"
  )
}

function presentGuest(row: GuestRow) {
  const date = row.confirmed_at ? new Date(row.confirmed_at) : null
  return {
    id: row.usn,
    name: row.name,
    usn: row.usn,
    status: row.status,
    confirmationDate: date
      ? date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "Asia/Manila",
        })
      : null,
    confirmationTime: date
      ? date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        })
      : null,
    confirmedAt: row.confirmed_at,
  }
}

function base64url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function fromBase64url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

async function createAdminToken(secret: string) {
  const header = base64url(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  )
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        role: "admin",
        exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60,
      }),
    ),
  )
  const content = header + "." + payload
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(content),
  )
  return content + "." + base64url(new Uint8Array(signature))
}

async function validAdminToken(request: Request, secret: string) {
  const authorization = request.headers.get("Authorization") ?? ""
  const parts = (authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : ""
  ).split(".")
  if (parts.length !== 3) return false

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64url(parts[1])),
    ) as { role?: unknown; exp?: unknown }
    if (
      payload.role !== "admin" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return false
    }
    return await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64url(parts[2]),
      new TextEncoder().encode(parts[0] + "." + parts[1]),
    )
  } catch {
    return false
  }
}

function secureEqual(left: string, right: string) {
  let difference = left.length ^ right.length
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }
  return difference === 0
}

async function queryGuests(
  url: string,
  serviceKey: string,
  path: string,
  method = "GET",
  body?: unknown,
) {
  const response = await fetch(url + "/rest/v1/guests" + path, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    console.error("Guest database query failed.", response.status, result)
    const error = result as { code?: string } | null
    throw new Error(error?.code === "23505" ? "DUPLICATE_GUEST" : "DATABASE_ERROR")
  }
  return result
}

denoRuntime.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405)

  try {
    const input: unknown = await request.json()
    if (!input || typeof input !== "object") {
      return respond({ error: "A JSON request body is required." }, 400)
    }
    const body = input as Record<string, unknown>
    if (typeof body.action !== "string") {
      return respond({ error: "An action is required." }, 400)
    }

    const adminPassword = denoRuntime.env.get("ADMIN_PASSWORD")
    const tokenSecret = denoRuntime.env.get("ADMIN_TOKEN_SECRET")
    if (body.action === "admin:login") {
      if (!adminPassword || !tokenSecret) {
        return respond(
          { error: "Administrator access is not configured on the server." },
          503,
        )
      }
      if (
        typeof body.password !== "string" ||
        !secureEqual(body.password, adminPassword)
      ) {
        return respond({ error: "Invalid admin credentials." }, 401)
      }
      return respond({ token: await createAdminToken(tokenSecret) })
    }

    if (
      body.action.startsWith("admin:") &&
      (!tokenSecret || !(await validAdminToken(request, tokenSecret)))
    ) {
      return respond(
        { error: "Administrator session expired. Sign in again." },
        401,
      )
    }

    const url = denoRuntime.env.get("SUPABASE_URL")
    const serviceKey = denoRuntime.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!url || !serviceKey) {
      return respond({ error: "The attendance database is not configured." }, 503)
    }

    const usn = normalizeUsn(body.usn)
    if (body.action.startsWith("guest:") || body.action.startsWith("admin:")) {
      if (body.action !== "admin:list" && !validUsn(usn)) {
        return respond({ error: "A valid USN is required." }, 400)
      }
    }

    if (body.action === "guest:verify") {
      const rows = (await queryGuests(
        url,
        serviceKey,
        "?usn=eq." + encodeURIComponent(usn) + "&select=" + columns,
      )) as GuestRow[]
      if (!rows[0]) return respond({ error: "No Guest Record Found." }, 404)
      return respond({ guest: presentGuest(rows[0]) })
    }

    if (body.action === "guest:confirm") {
      if (!validStatus(body.status) || body.status === "Pending") {
        return respond({ error: "Choose an attendance response." }, 400)
      }
      const rows = (await queryGuests(
        url,
        serviceKey,
        "?usn=eq." +
          encodeURIComponent(usn) +
          "&status=eq.Pending&select=" +
          columns,
        "PATCH",
        { status: body.status, confirmed_at: new Date().toISOString() },
      )) as GuestRow[]
      if (rows[0]) return respond({ guest: presentGuest(rows[0]) })

      const existing = (await queryGuests(
        url,
        serviceKey,
        "?usn=eq." + encodeURIComponent(usn) + "&select=" + columns,
      )) as GuestRow[]
      if (!existing[0]) return respond({ error: "No Guest Record Found." }, 404)
      return respond(
        {
          error: "This guest has already submitted a response.",
          guest: presentGuest(existing[0]),
        },
        409,
      )
    }

    if (body.action === "admin:list") {
      const rows = (await queryGuests(
        url,
        serviceKey,
        "?select=" + columns + "&order=name.asc",
      )) as GuestRow[]
      return respond({ guests: rows.map(presentGuest) })
    }

    if (body.action === "admin:set-status") {
      if (!validStatus(body.status)) {
        return respond({ error: "A valid attendance status is required." }, 400)
      }
      const rows = (await queryGuests(
        url,
        serviceKey,
        "?usn=eq." + encodeURIComponent(usn) + "&select=" + columns,
        "PATCH",
        {
          status: body.status,
          confirmed_at:
            body.status === "Pending" ? null : new Date().toISOString(),
        },
      )) as GuestRow[]
      if (!rows[0]) return respond({ error: "Guest not found." }, 404)
      return respond({ guest: presentGuest(rows[0]) })
    }

    if (body.action === "admin:add") {
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (!name || name.length > 160) {
        return respond({ error: "Enter a guest name." }, 400)
      }
      try {
        const rows = (await queryGuests(
          url,
          serviceKey,
          "?select=" + columns,
          "POST",
          { usn, name, status: "Pending" },
        )) as GuestRow[]
        return respond({ guest: presentGuest(rows[0]) })
      } catch (error) {
        if (error instanceof Error && error.message === "DUPLICATE_GUEST") {
          return respond(
            { error: "A guest with that USN is already registered." },
            409,
          )
        }
        throw error
      }
    }

    if (body.action === "admin:remove") {
      const rows = (await queryGuests(
        url,
        serviceKey,
        "?usn=eq." +
          encodeURIComponent(usn) +
          "&status=eq.Pending&select=usn",
        "DELETE",
      )) as { usn: string }[]
      if (!rows[0]) {
        return respond({ error: "Only pending guests can be removed." }, 409)
      }
      return respond({ removed: true })
    }

    return respond({ error: "Unknown action." }, 400)
  } catch (error) {
    console.error("Guest database request failed.", error)
    return respond(
      { error: "The attendance database request failed. Please try again." },
      500,
    )
  }
})
