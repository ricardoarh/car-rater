# Car Rater — build notes

React 19 + TypeScript + Vite 7 + Dexie 4, with `vite-plugin-pwa` (Workbox
`generateSW`). No backend, no accounts.

- **1.0.0** — 2026-09-13. Complete V1.
- **1.1.0** — 2026-09-13. Trim retired from the UI; Mileage, Price and
  Transmission added.
- **1.2.0** — 2026-09-13. Features checklist: nine built-in features plus
  user-named custom ones.
- **1.3.0** — 2026-09-13. Manage Features: reorder or remove the built-in
  checklist, restore defaults. First Dexie schema bump (1 → 2).
- **1.4.0** — 2026-09-13. Duplicate Car: create a new car from an existing entry
  with safe selective copying and independent photo records. No schema bump.

Deliverables: `car-rater.zip` (source repo, git history on `main`) and
`car-rater-dist.zip` (the built site, ready to drag onto a static host).

## Decisions worth remembering

**Hash routing + relative base.** `vite.config.ts` sets `base: './'` and the app
uses `HashRouter`. Together these mean the build runs from any URL — domain root,
`/car-rater/` project page, anywhere — with **no base-path configuration and no
server rewrite rules**. Verified by serving the same `dist/` from both `/` and
`/car-rater/`; the service worker scopes and precaches correctly in both. If an
absolute base is ever needed: `VITE_BASE=/car-rater/ npm run build`.

**Lists that appear on more than one screen are defined once.** The seven rating
categories live in `src/constants/ratings.ts`, the nine features in
`src/constants/features.ts` (key, label, shortLabel, order). Every screen reads
those arrays, and records store the stable `key` rather than the display text —
so wording can change without touching a single row. The rating labels are
deliberate and must not be "corrected": Cuteness · Comfyness · Techonologia ·
Vroom Factor · Rio Approved 🐶 · Uuhhh, I didn't expect that · $$

**User preferences never live in `features.ts`.** The shipped nine and their
canonical order are the app's definition and stay constant. Which of them *this
person* wants, and in what order, is a row in the `settings` store read through
`src/services/settingsRepo.ts`. A device that has never opened Manage Features
has no row at all and resolves to the defaults, which is exactly the state every
install upgrading from 1.2 is in.

**Repository layer.** `src/db/database.ts` is the only module that touches
Dexie. Screens call `carsRepo` / `settingsRepo` / `photoService` /
`backupService` / `duplicateService`. Keeps persistence, rating maths, photo handling and backup
separable and testable.

**Test environment quirk:** jsdom's `Blob` is a host object that
fake-indexeddb's structured clone cannot round-trip, and it has no
`.arrayBuffer()`. `src/test/blob-polyfill.ts` swaps in Node's `Blob` before
anything else loads (it must be a *separate* setup file, listed first, because
`db` is constructed at module-eval time). Production also gained a genuine
`blobToUint8Array` FileReader fallback, which older Safari needs anyway.

## Concurrency — the recurring lesson

Three separate bugs of the same shape have now been found and fixed. **Any
autosaved field must compute its next value INSIDE a Dexie transaction, from the
stored value — never from a React state snapshot.**

- **1.0:** `carsRepo.update` / `setRating` were plain read-modify-write. Tapping
  a star then immediately typing in the year field made the second write build
  on a stale read and silently drop the first. Both now run in
  `db.transaction('rw', db.cars, …)`.
- **1.2:** feature chips can't just send the whole array — two taps in the same
  second would both build on the same snapshot and the second would undo the
  first. `carsRepo` therefore gained `toggleFeature`, `addCustomFeature`,
  `renameCustomFeature` and `removeCustomFeature`, each recomputing the list
  inside its own transaction. `useFeatureActions` writes straight through with
  no debounce and no local mirror.
- **1.3:** the same rule applied to a *global* value. Every reorder, removal and
  restore in `settingsRepo` goes through one `mutateOrder` helper that reads the
  stored order inside a `db.transaction('rw', db.settings, …)` and computes the
  next one there. A drag is committed against a **neighbour key**, never an
  index (`moveFeatureBefore(key, beforeKey)`), so a removal landing at the same
  moment cannot put the moved row in the wrong place.
- Regression tests fire six toggles, a field edit and a star change with
  `Promise.all` and assert every one survived; the 1.3 set fires three removals
  concurrently, and a move racing a removal, and asserts all of them stuck.

**Sheet focus bug (found in 1.2).** `Sheet`'s effect listed `onClose` in its
deps, and every caller passes an inline arrow — so the effect tore down and
re-ran on every render, and its cleanup's `restoreTo.current.focus()` stole
focus after the first keystroke. Invisible until a sheet contained a text input.
It now holds `onClose` in a ref and depends on `open` alone.

**Preferences are read once, at the root.** `FeaturePreferencesProvider` holds
the single `useLiveQuery` and hands `activeFeatures` / `activeOrder` down by
context, so a 50-row My Cars list does not open 50 database observers. The query
is wrapped in an object (`{ settings }`) because `db.settings.get()` returns
`undefined` both while loading and for the very common "never customised" case,
and those two states must be distinguishable.

## Duplicate Car (1.4)

**What copies is decided by one question: is this true of the MODEL, or of THIS
CAR?** The user is standing in front of a second example of the same thing, so
the make, model, year, transmission, powertrain, ratings, features, Headache
Potential and Euro NCAP figures come across. The mileage, price, photos,
comments, notes, verdict and dealbreaker do not — those describe one particular
car on one particular day — though each can be opted into in the sheet. Every
toggle defaults to off, and reopening the sheet resets them: a duplicate should
never inherit choices the user made for a different one.

**The score is derived, never transcribed.** `buildDuplicate` copies the ratings
and runs `withDerivedScore` over them rather than carrying `overallScore`
across, so a copy can never enshrine a stale stored figure. A test asserts a
deliberately wrong stored score on the source does not survive into the copy.

**Nothing is shared by reference.** `ratings`, `features`, `customFeatures` and
`dealbreakerReasons` are rebuilt, and `undefined` is preserved as `undefined` so
a copy of a pre-1.2 car still looks like a pre-1.2 car. Feature keys are copied
verbatim rather than normalised, which is what carries a *retired* selection
into the duplicate — it was recorded against this model, so the copy records it
too. Duplication only ever reads the global feature preferences; it never writes
them. Legacy `trim` rides along unshown, exactly as it does through every other
operation.

**Photos are the part that needed care.** Each copy is a new `Photo` record with
a new id, owned by the new car, holding bytes read out and rebuilt into a fresh
Blob — never a second car pointed at the same record. Order and captions are
preserved and the cover follows the picture it pointed at, through an old id →
new id map, falling back to the first copied photo if the source cover was
already dangling. That independence is the whole point: deleting a photo from
one car cannot touch the other, verified both in unit tests and in the browser.

**All reading happens before any writing.** Blobs are read and the new records
assembled in memory first; only then does a single `db.transaction('rw',
db.cars, db.photos, …)` write the car and `bulkAdd` the photos. So a photo that
cannot be read fails the whole duplication having written nothing, and a write
that fails rolls the car back with its photos — never a car whose
`coverPhotoId` points at a photo that was not saved. It also keeps the byte
reads outside the transaction, which Dexie's zone tracking would otherwise treat
as an early commit. Failures surface as `DuplicateFailedError`, whose message is
a sentence ("Couldn't duplicate this car. Please try again."), never a raw Dexie
or decode error; the sheet stays open and the original is untouched.

**No schema bump, and none was needed.** A duplicate is an ordinary car record
and its photos are ordinary photo records — nothing new is persisted, so the
`cars` and `photos` stores cover it exactly as they are, and the version stays
at 2. Backups needed no change either: duplicates export and restore as normal
cars and photos, with no duplicate-specific metadata, no marker field and no
provenance link. A test asserts the exported copy has the same key set as any
other car.

**The duplicate is a saved car, not a draft.** It has to appear in My Cars, and
a fresh `createdAt` floats it to the top of Recent on its own. It opens straight
in Edit, because the reason for duplicating is that something differs — but it
is a real entry from the moment it exists, with no "Copy" badge anywhere.

## Migrations

**No stored record has ever been rewritten by an upgrade**, and the Dexie
version stayed at 1 through 1.1 and 1.2. Reasoning, also in
`src/db/database.ts`:

- Dexie's store string declares *indexes*, not record shape. None of `mileage`,
  `price`, `transmission`, `features` or `customFeatures` is queried, sorted or
  filtered at the database level (Compare and My Cars sort in memory), so
  indexing them costs write throughput and buys nothing.
- Bumping the version forces every existing browser through an IndexedDB upgrade
  transaction and can fire `blocked` events when the app is open in two tabs —
  all to achieve nothing. Records written by an older build simply read back
  with the new properties `undefined`.

**1.3 is the first version to bump it, to 2, and that was the right call.** The
feature preferences need a store of their own and a new object store cannot
exist without a version — so the choice was a genuine bump or a worse design
(preferences smuggled into a Car row, or hardcoded into `features.ts`, or put in
localStorage where a backup could not reach them). The bump is purely additive:
Dexie carries forward every table a later version does not mention, so `cars`
and `photos` keep their exact indexes and every existing record is untouched,
and the upgrade only creates the empty `settings` store. Verified by replaying a
real 1.2 database through it. Do not take this as licence to bump again — the
1.1/1.2 reasoning still holds for anything that is only a new property.

New fields are typed `mileage?: number` rather than `number | null` (the
convention used by `year`/`powertrain`) **on purpose**: older records do not
carry the property at all, so `undefined` is the honest representation.

The read helpers are total — `carFeatures(car)` on a car with no `features` key
returns `[]` rather than throwing — so legacy records need no special-casing at
any call site.

**Retiring `trim` without destroying it.** `basicsToPatch` (in
`src/services/carBasics.ts`) deliberately omits the `trim` key, and
`carsRepo.update` merges patches — so a key absent from the patch is a key left
alone. Old trims survive editing, exporting and restoring; they are simply never
shown.

**Removing a feature from the checklist is not a data migration, and must never
become one.** `settingsRepo.removeFeature` touches exactly one row — the
settings row. No car is opened, let alone rewritten. A selection the checklist
no longer offers becomes a *retired* selection: `featuresService` splits a car's
stored keys against the active list (`activeCarFeatures` / `retiredCarFeatures`)
so Car Detail can still show it (quieter, with an sr-only "no longer on your
checklist"), Compare can fold it into the existing "Also has" row, and the count
can exclude it from **both** halves — `5/7 features`, never `5/9`. Restore
defaults makes it a normal feature again with nothing lost in between. This is
the single most important rule in the 1.3 change; the upgrade harness asserts
the car record is byte-for-byte identical after a removal.

**Backup format stays at version 1** across every release. New fields are
additive properties inside existing car objects, so old backups import (fields
undefined) *and* new backups still import into older builds, which ignore what
they don't know. Bumping the number would make every older install in the wild
start refusing new backups, because `validateBackupJson` rejects anything above
`BACKUP_VERSION`. A stored value that is nonsense (negative mileage, unknown
transmission, unrecognised feature key) is dropped rather than failing the
restore. 1.3's preferences ride along in an additive top-level `settings` block
that older builds skip.

**Restore mode decides what happens to preferences.** **Replace** applies the
backup's checklist — a pre-1.3 backup carries none, which describes a device on
the defaults, so that is what it becomes. **Merge** keeps the checklist the
person is currently looking at, because silently rearranging the screen in front
of them to match an old ZIP would be a surprise; nothing is lost either way,
since a merged car carrying a feature this device no longer lists simply shows
it as a retired selection. Applying preferences is deliberately outside the
cars/photos transaction: a preference that failed to write must never roll back
a restore of the actual data.

**`clearAll()` does not clear settings.** The confirmation the user agrees to
says cars and photos; a feature checklist is a preference about how the app
works, not data about a car. A restore that genuinely should replace it does so
explicitly, through `settingsRepo`.

## Verification performed

- 278 unit/component tests (Vitest), ESLint and strict `tsc -b` all clean.
- **A genuine in-place upgrade test** — the pattern to repeat for every future
  change: build the previous release from git into a separate folder, serve it,
  create real data through its UI, then swap `dist` underneath the running
  browser on the *same origin* and reload. Checked afterwards: same car ids,
  ratings, scores, verdicts, comments, mileage, price, transmission,
  cover-photo links and photo bytes. 41/41 for 1.1 → 1.2; **52/52 for
  1.2 → 1.3** (`/tmp/serve/upgrade13.mjs`), which additionally confirms the
  IndexedDB version moved 10 → 20 (Dexie stores its own version ×10), that the
  only new store is `settings`, that the upgrade writes **no** settings row at
  all, that a removed feature stays on the cars that recorded it, that the
  Add/Edit checklist, Detail, My Cars count and Compare matrix all follow the
  user's order, that a Replace restore brings the backup's checklist with it,
  and that Clear all data leaves the checklist alone.
- **50/50 on a real in-place 1.3 → 1.4 upgrade** (`/tmp/serve/upgrade14.mjs`),
  which builds the acceptance car (Lexus LBX, three photos, YES verdict, four
  features plus a custom one) with the v1.3 build, swaps `dist` underneath, and
  then confirms: the schema did **not** move, the car and photos are
  byte-for-byte what 1.3 wrote, every model-level field matches the original
  field by field, the defaults reset, the opt-ins work, copied photos get new
  ids with the same bytes and order, the cover maps correctly, deleting a
  copied photo leaves the original alone, the copy sorts to the top of Recent,
  duplication works offline, and a backup round trip restores both cars with
  independent photos. Also swept 320–1440px with the sheet open.
- 4-point GitHub Pages sub-path check (`/tmp/serve/subpath14.mjs`): the same
  `dist` served from `/car-rater/` boots, duplicates, routes and registers its
  service worker under that scope.
- 15-point Manage Features accessibility and layout sweep
  (`/tmp/serve/manage-a11y.mjs`): named per-feature Move up / Move down / Remove
  buttons, drag handle `aria-hidden` with `touch-action: none`, position
  announced per row, the whole reorder operable by keyboard alone, and no
  overflow or sub-44px target at 320–1440px.
- 36-point end-to-end acceptance walk-through at 390×844, including a full
  backup → clear → restore round trip.
- **Offline verified with the network genuinely off:** app shell loads, cars
  visible, new car added with photos, rated, saved, compared and edited — then
  survived a reload. Manage Features reorders offline and the change persists.
  Zero page errors.
- No horizontal overflow at 320 / 360 / 375 / 390 / 430 / 820 / 1440 px.
- Every interactive target ≥ 44px tall on every screen; all buttons and inputs
  labelled; one `<h1>` per screen; keyboard star rating, keyboard-operable
  transmission control and keyboard-operable feature chips with visible focus.
- Palette contrast-checked: body text AAA, `--muted` AA on every surface,
  `--muted-light` reserved for icons/placeholders (AA-large).

## Known, deliberate

- "Uuhhh, I didn't expect that" wraps to two lines (as it does in the concept),
  and "Rio Approved 🐶" wraps its info glyph below 390px.
- Star buttons are 28–38px wide × 44px tall. Full width would crowd the labels
  off the line on a phone; this matches how iOS's own star controls behave.
- Compare never highlights a factual row as a "winner": lower mileage is not
  automatically better (it may be a worse car), nor is a lower price (it may be
  a lesser spec), nor is having more features. Only the star categories get the
  highlight.
- Feature chips are two columns on a phone, three from 620px, one below 340px.
  A long label makes the chip taller rather than making the text smaller.
- Feature chips use the **short** label as both visible and accessible name, with
  the full wording as `title`. Setting the full wording as `aria-label` would
  break WCAG "Label in Name" for e.g. "Auto Lights / Wipers" vs "Automatic
  Lights / Wipers".
- Custom feature chips hold two controls: the label renames, the × removes.
  Capped at 8 per car, 28 characters each — they are chips, not notes.
- My Cars shows "6/9 features" only when the count is above zero; "0/9" would be
  noise on every unedited car. From 1.3 both halves come from the *active*
  checklist, so the same car reads "4/8" once a feature is retired.
- Manage Features offers drag **and** Move up / Move down buttons. Drag uses
  Pointer Events, not HTML5 drag-and-drop, which does not fire on touch at all;
  the handle sets `touch-action: none` so the page does not scroll under the
  finger. The handle is `aria-hidden` — it is a touch affordance, and the named
  buttons are the accessible route.
- Duplicate Car sits below Edit on the car's page as a secondary button, not in
  an overflow menu — there isn't one on that screen, and inventing one for a
  single action would have been worse than a clearly secondary button.
- The duplicate sheet's five options are one per line rather than the feature
  checklist's two-column grid: each needs a line saying why it is off by
  default, and "why isn't my mileage here?" is the obvious question.
- Verdict and Dealbreaker are one toggle, not two. They are the same judgement
  about the same car on the same day, and splitting them would invite copying a
  dealbreaker without the verdict that explains it.
- The older free-text `notes` field follows Comments. It is the same kind of
  thing — what was written down at the time — even though it predates Comments.
- 1.3 deliberately has **no** "Add feature" button in Manage Features. The nine
  are the app's definition; per-car custom features already cover the long tail.
- An empty checklist is allowed, and is explained on screen rather than shown as
  a blank list. Add/Edit says so too, and still offers custom features.
- Tapping a selected star, transmission, powertrain or feature chip clears it.
  Consistent across the app, and the reason a test that re-taps an already-set
  control sees the value cleared rather than kept.
- The hero banner is inline SVG, not a photograph, so the app fetches nothing
  from the network after install. No web fonts either.
- `.detail__facts` was already taken by the "rest of it" definition list; the
  1.1 metadata lines use `.detail__spec` to avoid the collision.
