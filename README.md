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
and an admin dashboard. It is a static, browser-only app: its guest list and
admin password are part of the public website code, and RSVP/admin changes are
saved in each browser's local storage. Changes made in one person's browser do
not sync to other guests or devices.
