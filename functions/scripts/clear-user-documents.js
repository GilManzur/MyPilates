/**
 * DEV/ADMIN ONLY — clears all financial documents for one user (by email),
 * and resets their document counters, for cleaning up TEST data.
 *
 * ⚠️  This bypasses the Firestore immutability rules via the Admin SDK and
 *     permanently deletes documents. Use only on test accounts. A קובץ קבוע of
 *     a real business must never be deleted.
 *
 * Prerequisites (run once):
 *   gcloud auth application-default login
 *
 * Usage (from the functions/ directory, where firebase-admin is installed):
 *   node scripts/clear-user-documents.js yamlevi011@gmail.com          # dry run — shows what WOULD be deleted
 *   node scripts/clear-user-documents.js yamlevi011@gmail.com --yes    # actually delete
 *
 * If you migrated Firestore to the 'il' database, prefix with:
 *   FIRESTORE_DB_ID=il node scripts/clear-user-documents.js <email> --yes
 */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const email = process.argv[2]
const confirmed = process.argv.includes('--yes')
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'mypilates-yam'

if (!email) {
  console.error('Usage: node scripts/clear-user-documents.js <email> [--yes]')
  process.exit(1)
}

initializeApp({ projectId: PROJECT_ID })
const db = getFirestore(process.env.FIRESTORE_DB_ID || '(default)')

async function main() {
  const userRecord = await getAuth().getUserByEmail(email)
  const uid = userRecord.uid
  console.log(`User ${email} → uid ${uid}`)

  const docsRef = db.collection('users').doc(uid).collection('documents')
  const snap = await docsRef.get()
  console.log(`Found ${snap.size} document(s).`)

  if (snap.size === 0) {
    console.log('Nothing to delete.')
    return
  }

  if (!confirmed) {
    console.log('\nDRY RUN — nothing deleted. Re-run with --yes to delete:')
    snap.docs.slice(0, 20).forEach((d) => {
      const x = d.data()
      console.log(`  · ${x.type} #${x.number} — ${x.recipient?.name ?? ''} — ${x.total} ₪`)
    })
    if (snap.size > 20) console.log(`  … and ${snap.size - 20} more`)
    return
  }

  // Delete in batches of 400 (Firestore batch limit is 500).
  let deleted = 0
  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch()
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
    await batch.commit()
    deleted += Math.min(400, docs.length - i)
  }

  // Reset the running-number counters so new documents start from 1.
  const countersRef = db.collection('users').doc(uid).collection('counters')
  await Promise.all(
    ['documentNumber', 'invoiceNumber', 'demandNumber'].map((id) =>
      countersRef.doc(id).set({ value: 0 }, { merge: true }),
    ),
  )

  console.log(`\nDeleted ${deleted} document(s) and reset counters for ${email}.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err.message)
    process.exit(1)
  })
