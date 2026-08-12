# Firestore data-residency migration (→ Israel / me-west1)

## Why

הוראות ניהול ספרים (חוזר 24/2004 §2.7.1, סעיף 25(א)) require a business with
income produced in Israel to keep its accounting system **in Israel**. Our
Firestore `(default)` database is in **`europe-west1` (Belgium)**, and a
database's location is **fixed at creation and cannot be changed**.

The fix: create a **new named database `il` in `me-west1` (Tel Aviv)** in the
same project (`mypilates-yam`), migrate the data, and point the app + functions
at it. Auth, Functions, Hosting and all user uids are unaffected.

> Not legal advice — confirm the requirement and the notification to פקיד השומה
> with the studio's accountant before cutover.

## The code is already env-driven

- Client: `VITE_FIRESTORE_DB_ID` (`src/lib/firebase/app.ts`) — defaults to `(default)`.
- Functions: `FIRESTORE_DB_ID` (`functions/index.js`) — defaults to `(default)`.

Nothing changes until these are set to `il`. That is the cutover switch.

## Runbook

Prerequisites: `gcloud` authenticated on `mypilates-yam`, `firebase` CLI, a GCS
bucket in the project for the export (e.g. `gs://mypilates-yam-migration`).

1. **Create the Israel database** (empty, same project):
   ```bash
   gcloud firestore databases create --database=il --location=me-west1 --project=mypilates-yam
   ```

2. **Freeze writes** — put the app in maintenance / announce a short window so no
   documents are written to `(default)` during the copy.

3. **Export the current data and import into `il`:**
   ```bash
   gcloud firestore export gs://mypilates-yam-migration/pre-il --database='(default)' --project=mypilates-yam
   gcloud firestore import gs://mypilates-yam-migration/pre-il --database=il --project=mypilates-yam
   ```

4. **Deploy rules + indexes to `il`.** Add the `il` database to `firebase.json`
   (array form) and deploy:
   ```jsonc
   "firestore": [
     { "database": "(default)", "location": "europe-west1", "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
     { "database": "il",        "location": "me-west1",      "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
   ]
   ```
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

5. **Cut over the app:** set `VITE_FIRESTORE_DB_ID=il` in the deploy env and
   rebuild/redeploy Hosting (`npm run build` → `firebase deploy --only hosting`).

6. **Cut over Functions:** set the env var and redeploy:
   ```bash
   firebase functions:config:set   # (or set FIRESTORE_DB_ID in the runtime env)
   firebase deploy --only functions
   ```
   Ensure `FIRESTORE_DB_ID=il` is present in the functions runtime environment.

7. **Verify** (see checklist) then unfreeze writes.

8. **Notify פקיד השומה** in writing of the storage location (business action).

9. Once confident, the old `(default)` (Belgium) database can be left read-only
   as an archive or deleted per the accountant's guidance.

## Verification

- `gcloud firestore databases list --project=mypilates-yam` shows `il` in `me-west1`.
- App reads/writes land in `il` (create a document, confirm it appears under the
  `il` database in the Firebase console, not `(default)`).
- `lessonReminders` / `monthEndPaymentReminder` run against `il` (check logs).
- No data missing vs. the pre-migration export.

## Rollback

Unset `VITE_FIRESTORE_DB_ID` / `FIRESTORE_DB_ID` and redeploy — the app returns
to `(default)`. Safe as long as the freeze in step 2 held (no divergent writes).
