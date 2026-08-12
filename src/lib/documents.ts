import type {
  DocumentLineItem,
  DocumentPayment,
  DocumentType,
  PaymentMethod,
  StudioMonthSummary,
} from '../types'
import { roundHours } from './money/calculations'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  receipt: 'קבלה',
  invoice: 'חשבונית עסקה',
  demand: 'דרישת תשלום',
  cancellation: 'ביטול קבלה',
  refund: 'קבלה על החזר כספי',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'מזומן',
  check: 'המחאה',
  credit: 'כרטיס אשראי',
  transfer: 'העברה בנקאית',
  bit: 'Bit',
  paypal: 'PayPal',
}

/** Document types that record received money (and therefore carry a payment breakdown). */
export const PAYMENT_BEARING_TYPES: DocumentType[] = ['receipt', 'refund']

/** Non-legal docs that may be hard-deleted (no cancellation document). */
export const DELETABLE_DOCUMENT_TYPES: DocumentType[] = ['invoice', 'demand']

export function isDeletableDocumentType(type: DocumentType): boolean {
  return DELETABLE_DOCUMENT_TYPES.includes(type)
}

/** Counter key used when issuing a document of this type. */
export type DocumentCounterKey = 'documentNumber' | 'invoiceNumber' | 'demandNumber'

export function counterKeyForDocumentType(type: DocumentType): DocumentCounterKey {
  if (type === 'demand') return 'demandNumber'
  if (type === 'invoice') return 'invoiceNumber'
  return 'documentNumber'
}

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type]
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}

/** Zero-padded width for prefixed sequences (demands / invoices). */
export const PREFIXED_NUMBER_WIDTH = 4

/**
 * Display form of a document's running number.
 * Demands → `REQ-0001`; invoices → `INV-0001`;
 * receipts/cancellations/refunds stay plain numeric.
 */
export function formatDocumentNumber(type: DocumentType, number: number): string {
  if (type === 'demand') {
    return `REQ-${String(number).padStart(PREFIXED_NUMBER_WIDTH, '0')}`
  }
  if (type === 'invoice') {
    return `INV-${String(number).padStart(PREFIXED_NUMBER_WIDTH, '0')}`
  }
  return String(number)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const HE_ONES = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה']
const HE_TENS = ['', 'עשרה', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים']
const HE_HUNDREDS = [
  '', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות',
  'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות',
]
const HE_THOUSANDS = [
  '', 'אלף', 'אלפיים', 'שלושת אלפים', 'ארבעת אלפים', 'חמשת אלפים',
  'ששת אלפים', 'שבעת אלפים', 'שמונת אלפים', 'תשעת אלפים', 'עשרת אלפים',
]

/** Adds a leading vav to the final group so groups read naturally, e.g. "מאה ועשרים". */
function joinHebrewGroups(parts: string[]): string {
  if (parts.length > 1) {
    const last = parts[parts.length - 1]
    if (!last.includes('ו')) parts[parts.length - 1] = `ו${last}`
  }
  return parts.join(' ')
}

function hebrewUnder1000(n: number): string {
  const parts: string[] = []
  const hundreds = Math.floor(n / 100)
  const rem = n % 100
  if (hundreds > 0) parts.push(HE_HUNDREDS[hundreds])
  if (rem > 0) {
    if (rem < 10) parts.push(HE_ONES[rem])
    else if (rem === 10) parts.push('עשרה')
    else if (rem < 20) parts.push(`${rem === 12 ? 'שנים' : HE_ONES[rem - 10]} עשר`)
    else {
      const tens = Math.floor(rem / 10)
      const ones = rem % 10
      parts.push(ones === 0 ? HE_TENS[tens] : `${HE_TENS[tens]} ו${HE_ONES[ones]}`)
    }
  }
  return joinHebrewGroups(parts)
}

function hebrewInteger(n: number): string {
  if (n === 0) return 'אפס'
  const thousands = Math.floor(n / 1000)
  const rest = n % 1000
  const parts: string[] = []
  if (thousands > 0) {
    parts.push(thousands <= 10 ? HE_THOUSANDS[thousands] : `${hebrewUnder1000(thousands)} אלף`)
  }
  if (rest > 0) parts.push(hebrewUnder1000(rest))
  return joinHebrewGroups(parts)
}

/**
 * Spells a monetary amount in Hebrew for a receipt total, e.g.
 * `1200` → "אלף ומאתיים שקלים חדשים", `1200.5` → "… ו־50/100".
 * The integer part is spelled out; agorot follow in check-style `NN/100`.
 * Returns '' for amounts ≥ 1,000,000 (out of the supported range).
 */
export function amountToHebrewWords(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return ''
  const shekels = Math.floor(abs)
  const agorot = Math.round((abs - shekels) * 100)
  const base = shekels === 1 ? 'שקל חדש אחד' : `${hebrewInteger(shekels)} שקלים חדשים`
  return agorot > 0 ? `${base} ו־${String(agorot).padStart(2, '0')}/100` : base
}

export function lineItemsTotal(items: DocumentLineItem[]): number {
  return round2(items.reduce((sum, item) => sum + item.amount, 0))
}

export function paymentsTotal(payments: DocumentPayment[]): number {
  return round2(payments.reduce((sum, payment) => sum + payment.amount, 0))
}

/**
 * Builds the line items for a monthly per-studio document from its summary:
 * regular hours, optional swap hours, and optional travel pay.
 */
export function buildMonthlyLineItems(
  summary: Pick<
    StudioMonthSummary,
    | 'regularHours'
    | 'hourlyRate'
    | 'hoursAmount'
    | 'swapHours'
    | 'swapPay'
    | 'swapAmount'
    | 'travelDays'
    | 'travelPay'
    | 'travelAmount'
  >,
  monthLabel: string,
): DocumentLineItem[] {
  const items: DocumentLineItem[] = []
  if (summary.hoursAmount > 0 || summary.regularHours > 0) {
    items.push({
      description: `שיעורי פילאטיס — ${monthLabel}`,
      quantity: roundHours(summary.regularHours),
      unitPrice: summary.hourlyRate,
      amount: summary.hoursAmount,
    })
  }
  if (summary.swapAmount > 0) {
    items.push({
      description: `החלפות — ${monthLabel}`,
      quantity: roundHours(summary.swapHours),
      unitPrice: summary.swapPay,
      amount: summary.swapAmount,
    })
  }
  if (summary.travelAmount > 0) {
    items.push({
      description: `החזר נסיעות — ${monthLabel}`,
      quantity: summary.travelDays,
      unitPrice: summary.travelPay,
      amount: summary.travelAmount,
    })
  }
  return items
}
