# 🚗 Car Rater

**Find the one that feels right.**

A phone-first web app for shortlisting cars. You're at a dealership, you've just
sat in something and driven it round the block — pull out your phone, rate it in
a minute or two, take some photos, write down what you actually thought, and move
on to the next one. Later, compare everything you've seen and work out which model
you really want.

This is a **make/model shortlisting tool**, not a used-car inspection checklist.

Everything lives on your phone. There is no account, no server and no tracking,
and the whole thing works with no signal at all.

---

## Features

- **Rate a car in 1–3 minutes** across seven deliberately named categories:
  Cuteness · Comfyness · Techonologia · Vroom Factor · Rio Approved 🐶 ·
  Uuhhh, I didn't expect that · $$
- **The facts too** — year, transmission, mileage and price, all optional, shown
  in UK formatting (`12,500 mi`, `£16,995`) wherever the car appears.
- **Features** — tap nine common ones (heated seats, CarPlay, reversing camera
  and so on) plus anything else you want to add by name. They are facts, not
  scores: they never touch the star average.
- **Duplicate Car** — found a second example of the same model? Copy the entry
  and edit what differs. The make, model, year, transmission, ratings and
  features come across; the mileage, price, photos, comments and verdict start
  clean, because those belong to one particular car rather than to the model.
  Each of those can be opted into if you do want it.
- **Your checklist, your order** — *More → Manage Features* lets you drag the
  built-in features into the order you care about, or take off the ones you
  don't. Taking one off changes what you are asked about next time; it never
  erases it from a car you already rated.
- **Overall score** — the mean of the seven, to one decimal place. Partial
  ratings show a provisional score and say so.
- **Headache Potential**, **Euro NCAP** and **dealbreaker flags** — recorded
  separately, deliberately kept out of the star average.
- **YES / MAYBE / NO verdict** — the gut call, independent of the maths.
- **Photos** — camera or gallery, up to 10 per car, resized and compressed on
  device, with captions, a cover photo and a swipeable viewer.
- **Comments** — a proper multi-line notes field, autosaved as you type.
- **My Cars** — sort by overall score, recency, verdict or any single category;
  filter by YES / MAYBE / NO.
- **Compare** — 2 to 4 cars side by side, readable at 390px. The factual rows
  come first and are never judged; only the star categories get the "strongest
  in this row" highlight.
- **Autosave and drafts** — lock the phone, switch apps, refresh, come back
  tomorrow; a half-finished rating is still there.
- **Backup and restore** — a portable ZIP containing every car *and* every photo.
- **Installable PWA** — add it to the home screen and it behaves like an app,
  fully offline.

---

## Development

Requires Node 20 or newer.

```bash
npm install       # install dependencies
npm run dev       # local dev server (prints the URL, usually http://localhost:5173)
npm run test      # run the test suite once
npm run test:watch# run tests in watch mode
npm run lint      # ESLint
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
npm run check     # lint + test + build, all three
npm run icons     # regenerate the PWA icons in public/
```

`npm run dev` does **not** register the service worker — that's deliberate, so
you never fight a stale cache while developing. Use `npm run build && npm run
preview` to exercise the real offline behaviour.

### Demo data

The production app starts empty. In a **dev build only**, *More → Development
only → Load demo data* seeds five example cars (Lexus LBX, Mini Cooper, Mini
Countryman, Audi Q2, Audi A1). That block is compiled out of production builds,
so no fake cars can ever reach a real install.

### Project layout

```
src/
  components/
    car/        car-specific pieces (list rows, photo grid, rating sections)
    layout/     app shell, bottom nav, headers, icons
    ui/         generic primitives (Button, StarRating, Sheet, Toast…)
  constants/    rating category config, app-wide constants
  db/           the only module that touches Dexie/IndexedDB directly
  hooks/        live queries, object URLs, debounced autosave
  screens/      one file per screen
  services/     cars, photos, ratings, sorting, backup, storage
  styles/       design tokens + base styles
  types/        domain types
```

Two rules keep this tidy:

1. **No component talks to IndexedDB.** Screens call the services in
   `src/services`; only `src/db/database.ts` knows about Dexie.
2. **Lists that appear on more than one screen are defined once.** The seven
   rating categories live in `src/constants/ratings.ts` and the nine features in
   `src/constants/features.ts`. Every screen reads those arrays, so the order
   and the wording can never drift apart. Records store stable keys, never the
   display text, so wording can change without touching the database.
3. **User preferences never live in `features.ts`.** The shipped nine and their
   canonical order are the app's definition and stay constant; which of them
   *this person* wants, and in what order, is a row in the `settings` store read
   through `src/services/settingsRepo.ts` and handed to the screens by one live
   query at the app root (`src/hooks/FeaturePreferencesProvider.tsx`). A device
   that has never opened Manage Features has no row at all and resolves to the
   defaults.

Design tokens live in `src/styles/tokens.css`. Components use the CSS variables;
no colour is hardcoded anywhere else.

---

## Installing it on your phone

Serve the built app over HTTPS, open it on your phone, then:

**Android (Chrome)** — tap the ⋮ menu → *Add to Home screen* (or *Install app*).
Chrome usually also shows an install prompt of its own after a few seconds.

**iPhone (Safari)** — tap the Share button → scroll down → *Add to Home Screen*.
It must be Safari; Chrome on iOS can't install web apps.

Once installed it opens full screen with no browser chrome, and works with no
signal.

---

## Upgrading

**1.4** added **Duplicate Car**, on the car's own page below Edit. It creates a
brand new car — its own id, its own timestamps, its own photos — and opens it
straight in Edit so you can change what differs. The original is only ever read.

No database change was needed for it: a duplicate is an ordinary car record and
its photos are ordinary photo records, so the schema stays at version 2 and
backups keep their existing format. Copied photos get **new** photo ids and the
cover follows the picture it pointed at, which is what keeps the two cars
genuinely independent — delete a photo from one and the other is untouched.

**1.3** added **Manage Features**: reorder the built-in checklist, remove the
ones you don't care about, restore the defaults whenever you like. Your
arrangement is saved on the device and travels in a backup.

This one does bump the Dexie schema, from version 1 to version 2, because the
preferences need an object store of their own and a new store cannot exist
without a version. The upgrade is purely additive: Dexie carries `cars` and
`photos` forward with their exact indexes and every existing record untouched,
and all the upgrade does is create the new empty store. Verified by replaying a
real 1.2 database through it.

Removing a feature from the checklist **never** touches a saved car. A car that
recorded it keeps it: the fact still shows on the car's profile (a little
quieter, and labelled as no longer on your checklist) and still appears under
"Also has" in Compare. It simply stops being offered when you rate a new car,
and stops counting in either half of the `5/7 features` line. Put it back with
*Restore default features* and it is a normal feature again, with nothing lost
in between.

**1.2** added the **Features** checklist — nine built-in features plus your own
custom ones.

**1.1** removed the Trim / Version field from the add and edit screens and added
optional **Mileage**, **Price** and **Transmission**.

**Nothing you already have is touched by any of them.** Neither 1.1 nor 1.2
moved the Dexie schema off version 1 — none of the fields they added is queried,
sorted or filtered at the database level, so they need no index, and bumping the
version would have forced every existing browser through an upgrade transaction
for no benefit. Cars
written by an older version simply read back with the new fields unset, and a
`trim` you entered before 1.1 is still stored and still travels through saves,
exports and restores; it just isn't shown or editable any more. Backups written
by any version import into any other: older ones restore with the newer fields
unset, and newer ones restore into an older app, which ignores what it doesn't
know — the backup format is still version 1, and 1.3's feature preferences ride
along in a `settings` block that older versions simply skip. Restoring by
**Replace** applies the backup's checklist to the device; restoring by **Merge**
keeps the checklist you are looking at. See `src/db/database.ts` for the full
reasoning.

---

## Where your data lives

Everything — cars, ratings, comments, verdicts and photo files — is stored in
**IndexedDB on that one device**. Nothing is uploaded anywhere. There is no
account, so there is nothing to sign into and nothing to sync.

The practical consequences:

- Your phone and your laptop hold **separate** sets of cars.
- Clearing the browser's site data, or deleting the installed app on some
  platforms, deletes your cars.
- iOS may evict data for web apps that go unused for several weeks. Car Rater
  asks the browser for *persistent storage* once, the first time you save a car,
  which reduces the risk — but it is a request, not a guarantee.

**So take a backup.** That's what the next section is for.

Photos are resized to a maximum long edge of 1800px, re-encoded as WebP (JPEG
where WebP isn't supported) and stored as Blobs, with a separate small
thumbnail for fast list rendering. EXIF orientation is applied during decode, so
photos taken sideways come out the right way up. A 12-megapixel phone photo
typically ends up a few hundred kilobytes rather than several megabytes.

---

## Backup and restore

**More → Backup & Restore → Export Backup** produces a file named
`car-rater-backup-YYYY-MM-DD.zip` containing:

```
cars.json        every car, rating, verdict, comment and metadata field
photos/<id>.webp the photo files referenced from cars.json
README.txt       a note explaining what the archive is
```

It's an ordinary ZIP — you can open it, read `cars.json`, and pull the photos
out with any file manager. Email it to yourself, drop it in cloud storage,
whatever suits.

**Import Backup** validates the archive before touching anything, then offers:

- **Merge** — keeps what's already on the device and adds the cars from the
  backup. A car that's already there is added as a separate copy rather than
  overwriting the existing one.
- **Replace** — deletes everything on the device first. This asks you to type
  `REPLACE` to confirm.

An invalid, corrupted or foreign ZIP is rejected with a plain explanation and
**nothing is deleted or changed**. If individual photo files are missing from an
otherwise-valid archive, the cars still restore and the app tells you how many
photos it couldn't find.

*More → Danger zone → Clear all data* wipes the device, and asks you to type
`DELETE` first.

---

## Deployment

The build is a folder of static files. No server, no backend, no environment
variables.

```bash
npm run build      # output lands in dist/
```

`dist/` uses **relative asset paths** and the app uses **hash routing**
(`/#/cars`), which together mean it runs from any URL — a domain root, a
sub-folder, a project page — with **no configuration at all** and **no server
rewrite rules**. Just upload `dist/`.

### GitHub Pages

The repository includes `.github/workflows/deploy.yml`, which builds and
publishes on every push to `main`.

1. Push the repository to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main`. The workflow builds and deploys.

Your app is then at `https://<user>.github.io/<repo>/`.

**You do not need to set a base path.** Because assets are referenced
relatively, a project page at `/car-rater/` works exactly like a site at the
root — this is tested. If you nevertheless want an absolute base (some CDNs or
reverse proxies prefer it), build with:

```bash
VITE_BASE=/car-rater/ npm run build
```

To deploy manually instead of via Actions:

```bash
npm run build
npx gh-pages -d dist        # or commit dist/ to a gh-pages branch yourself
```

### Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Framework preset: none (or Vite)

### Netlify

`netlify.toml` is included. Or configure by hand:

- Build command: `npm run build`
- Publish directory: `dist`

### Vercel

`vercel.json` is included. Or in the dashboard:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

### Anything else

Copy `dist/` to any static host. The only requirement is **HTTPS** — service
workers, and therefore installability and offline mode, don't work over plain
HTTP (except on `localhost`).

---

## Browser notes and caveats

- **HTTPS is required** for install and offline. `http://localhost` is exempt
  during development.
- **iPhone/Safari**: install only works from Safari's Share menu, not Chrome or
  Firefox on iOS. Safari does not support the `capture` attribute the way
  Android does, so *Take Photo* opens the normal photo picker with a camera
  option rather than jumping straight to the camera. Both routes work.
- **Android/Chrome**: *Take Photo* opens the camera directly.
- **Desktop browsers**: *Take Photo* opens a file picker (or a webcam, depending
  on the browser). The app is usable on desktop, but it's designed for a phone.
- **Private/incognito windows** may block IndexedDB entirely. Car Rater detects
  this and says so plainly instead of silently losing your data.
- **Storage limits**: if the device runs out of room, the app catches the quota
  error and tells you, rather than crashing. Export a backup and remove some
  photos to recover.
- The app never fetches anything from the network after it's installed. There
  are no web fonts, no analytics and no CDN dependencies — which is why it works
  in an underground car park.

---

## What's deliberately not here

No login, no accounts, no cloud sync, no finance calculator, no registration or
MOT lookup, no dealer inventory feeds, no live pricing, no AI recommendations,
no social features and no mechanical inspection checklists. Car Rater does one
job: help you work out which car you actually want.

---

## Licence

Private project. Do what you like with it.
