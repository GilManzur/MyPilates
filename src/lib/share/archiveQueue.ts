import type { FinancialDocument } from '../../types'

const STORAGE_KEY = 'mypilates_archive_queue'
const MAX_RETRIES = 5

export interface QueueEntry {
  id: string
  doc: FinancialDocument
  retries: number
  lastAttempt?: string
}

function readQueue(): QueueEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeQueue(queue: QueueEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function enqueueArchive(doc: FinancialDocument) {
  const queue = readQueue()
  if (queue.some((e) => e.id === doc.id)) return
  queue.push({ id: doc.id, doc, retries: 0 })
  writeQueue(queue)
}

export function dequeueArchive(id: string) {
  writeQueue(readQueue().filter((e) => e.id !== id))
}

export function markAttempt(id: string) {
  const queue = readQueue()
  const entry = queue.find((e) => e.id === id)
  if (entry) {
    entry.retries++
    entry.lastAttempt = new Date().toISOString()
    if (entry.retries > MAX_RETRIES) {
      writeQueue(queue.filter((e) => e.id !== id))
      return
    }
    writeQueue(queue)
  }
}

export function getPendingArchives(): QueueEntry[] {
  return readQueue().filter((e) => e.retries <= MAX_RETRIES)
}

let processing = false

export async function processArchiveQueue() {
  if (processing) return
  const { archiveDocument } = await import('./archiveReceipt')
  const pending = getPendingArchives()
  if (pending.length === 0) return
  processing = true
  try {
    for (const entry of pending) {
      markAttempt(entry.id)
      const result = await archiveDocument(entry.doc)
      if (result === 'ok') {
        dequeueArchive(entry.id)
      }
    }
  } finally {
    processing = false
  }
}

export function initArchiveQueueListeners() {
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => void processArchiveQueue())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void processArchiveQueue()
  })
  void processArchiveQueue()
}
