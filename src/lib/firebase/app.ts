import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const useLocalData =
  import.meta.env.VITE_USE_LOCAL_DATA === 'true' || !firebaseConfig.apiKey

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let messaging: Messaging | undefined

// Firestore database id. Defaults to '(default)'. Set VITE_FIRESTORE_DB_ID to a
// named database (e.g. 'il' in me-west1 / Tel Aviv) for the data-residency
// requirement (חוזר 24/2004 §2.7.1) — see docs/firestore-israel-migration.md.
const firestoreDbId = (import.meta.env.VITE_FIRESTORE_DB_ID as string | undefined) || '(default)'

if (!useLocalData) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app, firestoreDbId)
}

export { app, auth, db }

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (useLocalData || !app) return null
  if (!(await isSupported())) return null
  if (!messaging) messaging = getMessaging(app)
  return messaging
}

export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
