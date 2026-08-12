import type {
  FinancialDocument,
  HourEntry,
  Lesson,
  Payment,
  Studio,
  UserProfile,
} from '../../types'

/**
 * A document as built by the UI, before the repository assigns the immutable
 * running `number`, internal `id`, `status`, and `createdAt`.
 */
export type DocumentDraft = Omit<FinancialDocument, 'id' | 'number' | 'status' | 'createdAt'>

/** Last assigned values for each sequence (0 = none issued yet). */
export type DocumentCounters = {
  /** Receipts, cancellations, refunds. */
  documentNumber: number
  /** Business invoices (חשבונית עסקה), displayed as INV-XXXX. */
  invoiceNumber: number
  /** Payment demands (דרישת תשלום), displayed as REQ-XXXX. */
  demandNumber: number
}

/** Sequences that can be seeded from settings (demands always start at 1). */
export type SeedableDocumentCounter = 'documentNumber' | 'invoiceNumber'

export interface DataRepository {
  getProfile(uid: string): Promise<UserProfile | null>
  saveProfile(uid: string, profile: UserProfile): Promise<void>
  listStudios(uid: string): Promise<Studio[]>
  upsertStudio(uid: string, studio: Studio): Promise<void>
  deleteStudio(uid: string, studioId: string): Promise<void>
  listLessons(uid: string, yearMonth: string): Promise<Lesson[]>
  upsertLesson(uid: string, lesson: Lesson): Promise<void>
  deleteLesson(uid: string, lessonId: string): Promise<void>
  listHourEntries(uid: string, yearMonth?: string): Promise<HourEntry[]>
  upsertHourEntry(uid: string, entry: HourEntry): Promise<void>
  deleteHourEntry(uid: string, entryId: string): Promise<void>
  listPayments(uid: string, yearMonth: string): Promise<Payment[]>
  upsertPayment(uid: string, payment: Payment): Promise<void>
  addFcmToken(uid: string, token: string): Promise<void>
  /** Financial documents — legal ones are immutable except cancel; invoice/demand may be deleted. */
  listDocuments(uid: string): Promise<FinancialDocument[]>
  /** Assigns the next running number and persists atomically. */
  issueDocument(uid: string, draft: DocumentDraft): Promise<FinancialDocument>
  /** Issues a cancellation/refund document and marks the original `cancelled`, atomically. */
  cancelDocument(
    uid: string,
    originalId: string,
    draft: DocumentDraft,
  ): Promise<FinancialDocument>
  /** Deletes a non-legal document (invoice / demand). Rejects other types. */
  deleteDocument(uid: string, documentId: string): Promise<void>
  /** Last assigned running numbers per sequence (0 if none). */
  getDocumentCounters(uid: string): Promise<DocumentCounters>
  /**
   * Sets the next number to issue for a seedable sequence.
   * Writes `counter = next - 1`. Rejects if `next` would go backwards.
   */
  setNextDocumentNumber(
    uid: string,
    next: number,
    counter?: SeedableDocumentCounter,
  ): Promise<void>
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

/** Fallback color for a studio with no color set (also the calendar dot default). */
export const DEFAULT_STUDIO_COLOR = '#5B7C6A'

/** Distinct studio colors for calendar visibility. */
export const STUDIO_COLORS = [
  '#C45C26', // burnt orange
  '#C49A3C', // mustard
  '#6B8F71', // sage
  '#3D7A6A', // teal
  '#4A7C9B', // ocean blue
  '#5B6B9A', // indigo
  '#8B5A7A', // plum
  '#C45B6A', // rose
  '#A65D3F', // terracotta
  '#7A8B3D', // olive
  '#B87333', // copper
  '#6A5ACD', // slate violet
  '#D4783A', // apricot
  '#2F6F5E', // deep green
  '#9B4D4D', // brick
  '#5C7A9B', // steel blue
]
