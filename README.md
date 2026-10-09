# ABE Urdaneta Acquaintance Party

A public event invitation and RSVP/guest-management app for the ABE Urdaneta
Acquaintance Party on October 16, 2026.

## Run locally

```sh
npm ci
npm run dev
```

## Deploy

The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` builds the
site and deploys it to GitHub Pages whenever changes are pushed to `main`.
After the first successful deployment, the site is available at
<https://jbrickson.github.io/ABE_Urdaneta/>.

In the repository settings, set **Pages → Build and deployment → Source** to
**GitHub Actions** if it is not already selected. You can also start a deployment
from the workflow's **Run workflow** button.

## RSVP and guest management

The app includes the registered guest list, USN verification, RSVP confirmation,
and an admin dashboard. Guests can save a two-page landscape invitation and programme as a PDF after
verifying their USN. Guest records and attendance responses are stored in a
private Supabase Postgres database; the guest list and admin password are not
bundled into the public site. RSVP confirmations are shared between browsers
and devices.

## Configure shared attendance storage

The site is hosted on GitHub Pages and uses the existing Supabase project
`Acquaintance Party Invitation System` (`qwqxipkizubynxsoxahd`). The project
URL and publishable API key are public-client configuration; no database
password, administrator password, service-role key, or other privileged
credential is included in frontend code. Environment variables may override
the project defaults for local testing.

1. From this repository root, authenticate the Supabase CLI and link the
   existing ABE project:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

   The project reference is `qwqxipkizubynxsoxahd`; `project_id` in
   `supabase/config.toml` is only the local CLI project name. The existing
   project has already been provisioned for this site, so do not create a
   second project.

2. Apply the database migration. It creates the private guest table and seeds
   the existing 99 registered guests as pending:

   ```sh
   supabase db push
   ```

3. In Supabase **Project Settings → Edge Functions → Secrets**, add
   `ADMIN_PASSWORD` (choose a new strong password; do not reuse the former
   password from the old frontend build) and `ADMIN_TOKEN_SECRET`.
   Generate the latter locally and paste it directly into the Supabase
   dashboard without sharing or committing it:

   Generate a signing secret with Node.js:

   ```sh
   node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to the Edge
   Function by Supabase. Never put the service-role key, administrator
   password, or token secret in a `VITE_` variable or commit them.

4. Deploy the API function:

   ```sh
   supabase functions deploy guest-database
   ```

   The function's Supabase JWT gateway verification is disabled in
   `supabase/config.toml`; it verifies administrator actions using its own
   short-lived signed session token and keeps database access server-side.
   Guest access is limited to verifying/responding for one USN. Row-level
   security is enabled and browser roles have no direct table permissions.

5. The frontend defaults to this project's URL and publishable key. No GitHub
   Actions variables are required unless you intentionally override the
   project. These values are intended for public clients; never set a
   service-role key as a `VITE_` variable.

Legacy confirmations in individual browsers' local storage are not imported
automatically; they were separate, untrusted copies. After the migration, use
the administrator dashboard to restore any responses that need to be retained.
