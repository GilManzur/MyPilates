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

if (!useLocalData) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
}

export { app, auth, db }

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (useLocalData || !app) return null
  if (!(await isSupported())) return null
  if (!messaging) messaging = getMessaging(app)
  return messaging
}

export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
