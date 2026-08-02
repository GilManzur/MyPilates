import { createLocalRepository } from './localRepo'
import { createFirebaseRepository } from './firebaseRepo'
import { useLocalData } from '../firebase/app'
import type { DataRepository } from './types'

let repo: DataRepository | null = null

export function getRepository(): DataRepository {
  if (!repo) {
    repo = useLocalData ? createLocalRepository() : createFirebaseRepository()
  }
  return repo
}

export function isLocalMode(): boolean {
  return useLocalData
}
