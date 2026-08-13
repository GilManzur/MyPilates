export type LessonStatus = 'scheduled' | 'completed' | 'cancelled'
export type HourSource = 'lesson' | 'manual'
export type PaymentStatus = 'pending' | 'confirmed'

/** עוסק פטור business identity, printed on every issued document. */
export interface BusinessProfile {
  /** שם העסק / השם המלא */
  legalName: string
  /** מספר עוסק פטור / ת״ז */
  taxId: string
  address?: string
  phone?: string
  email?: string
  /** Personal full name used in the sent/downloaded file name (falls back to legalName). */
  ownerFullName?: string
}

export interface UserProfile {
  displayName: string
  email: string
  fcmTokens: string[]
  business?: BusinessProfile
}

export interface Studio {
  id: string
  name: string
  hourlyRate: number
  currency: 'ILS'
  color: string
  /** Contact used to pre-fill WhatsApp / email when sending the studio a document. */
  phone?: string
  email?: string
  /** Fixed pay per work day at this studio. 0 = no travel pay. */
  travelPay: number
  /** Hourly rate for swap/replacement lessons. 0 = swap pay disabled. */
  swapPay: number
  active: boolean
  createdAt: string
}

export interface Lesson {
  id: string
  studioId: string
  title: string
  startAt: string
  endAt: string
  durationHours: number
  status: LessonStatus
  hoursConfirmed: boolean
  createdAt: string
  /** Shared id for weekly recurring lessons created together. */
  seriesId?: string
  /** When true, hours are billed at the studio's swapPay rate. */
  isSwap?: boolean
}

export interface HourEntry {
  id: string
  studioId: string
  date: string
  hours: number
  source: HourSource
  lessonId?: string
  note?: string
  createdAt: string
  /** Copied from Lesson.isSwap when confirming lesson hours. */
  isSwap?: boolean
}

export interface Payment {
  id: string
  studioId: string
  yearMonth: string
  expectedAmount: number
  status: PaymentStatus
  confirmedAt?: string
}

/**
 * Financial documents an עוסק פטור may issue.
 * - receipt (קבלה): issued on receipt of payment; carries payment-method breakdown.
 * - invoice (חשבונית עסקה) / demand (דרישת תשלום): documentation / request, pre-payment.
 * - cancellation (ביטול קבלה) / refund (החזר כספי): reference an original document.
 * עוסק פטור may NOT issue a tax invoice (חשבונית מס).
 */
export type DocumentType = 'receipt' | 'invoice' | 'demand' | 'cancellation' | 'refund'
export type DocumentStatus = 'issued' | 'cancelled'
export type PaymentMethod = 'cash' | 'check' | 'credit' | 'transfer' | 'bit' | 'paypal'

export interface DocumentLineItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface DocumentPayment {
  method: PaymentMethod
  amount: number
  /** המחאה: bank, branch, account number, check number, due date */
  bank?: string
  branch?: string
  accountNumber?: string
  checkNumber?: string
  dueDate?: string
  /** אשראי: card type; העברה/Bit/PayPal: free reference */
  cardType?: string
  reference?: string
}

export interface FinancialDocument {
  /** Internal id (createId). */
  id: string
  /**
   * Sequential running number within the document's sequence:
   * receipts/cancellations/refunds, invoices, and demands each have their own counter.
   * Assigned atomically. Display via `formatDocumentNumber`.
   */
  number: number
  type: DocumentType
  status: DocumentStatus
  issuedAt: string
  recipient: {
    name: string
    taxId?: string
    address?: string
    phone?: string
    studioId?: string
    /** Recipient agreed to receive documents electronically (חוזר 24/2004 §2.5.2). */
    consentToDigital?: boolean
  }
  lineItems: DocumentLineItem[]
  total: number
  currency: 'ILS'
  /** Payment-method breakdown, required on receipts. */
  payments?: DocumentPayment[]
  /** For cancellation/refund — the original document's running number. */
  relatedNumber?: number
  /** For cancellation/refund — original document type (for display formatting). */
  relatedType?: DocumentType
  /**
   * For monthly auto-generated documents tied to a studio's month.
   * `entryIds` are the HourEntry ids this document covers — used to compute the
   * un-covered "remaining" entries so a later document bills only the delta.
   */
  sourceRef?: { studioId: string; yearMonth: string; paymentId?: string; entryIds?: string[] }
  note?: string
  /** Immutable snapshot of the business identity at issue time. */
  business: BusinessProfile
  createdAt: string
  /**
   * ISO timestamp of the first time the original ("מקור") was printed/shared.
   * Written exactly once; afterwards every output is forced to "העתק"
   * (הוראה 4.01, נספח ה׳ (א)(4): "מקור" on one copy only).
   */
  originalPrintedAt?: string
}

export interface StudioMonthSummary {
  studioId: string
  studioName: string
  hourlyRate: number
  totalHours: number
  /** Regular (non-swap) hours billed at hourlyRate. */
  regularHours: number
  travelPay: number
  travelDays: number
  travelAmount: number
  /** Amount for regular hours only. */
  hoursAmount: number
  swapPay: number
  swapHours: number
  swapAmount: number
  amount: number
  paymentStatus: PaymentStatus
  paymentId?: string
}
