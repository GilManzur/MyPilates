/**
 * READ-ONLY — lists every Firebase Auth user and, for each, their business name
 * and how many financial documents they have. Nothing is modified.
 *
 * Prerequisites (run once):
 *   gcloud auth application-default login
 *
 * Usage (from the functions/ directory):
 *   node scripts/list-users.js
 *
 * If you migrated Firestore to the 'il' database:
 *   FIRESTORE_DB_ID=il node scripts/list-users.js
 */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'mypilates-yam'
initializeApp({ projectId: PROJECT_ID })
const db = getFirestore(process.env.FIRESTORE_DB_ID || '(default)')

async function main() {
  console.log(`Project: ${PROJECT_ID}  ·  DB: ${process.env.FIRESTORE_DB_ID || '(default)'}\n`)

  const users = []
  let pageToken
  do {
    const page = await getAuth().listUsers(1000, pageToken)
    users.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken)

  console.log(`${users.length} Auth user(s):\n`)
  for (const u of users) {
    const profileSnap = await db.collection('users').doc(u.uid).get()
    const business = profileSnap.exists ? profileSnap.data()?.business : undefined
    const docsSnap = await db.collection('users').doc(u.uid).collection('documents').get()
    console.log(`• ${u.email || '(no email)'}  ·  uid ${u.uid}`)
    console.log(`    displayName: ${u.displayName || '—'}`)
    console.log(`    business:    ${business?.legalName || '—'}  (עוסק ${business?.taxId || '—'})`)
    console.log(`    documents:   ${docsSnap.size}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err.message)
    process.exit(1)
  })
