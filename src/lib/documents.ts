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

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type]
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function lineItemsTotal(items: DocumentLineItem[]): number {
  return round2(items.reduce((sum, item) => sum + item.amount, 0))
}

export function paymentsTotal(payments: DocumentPayment[]): number {
  return round2(payments.reduce((sum, payment) => sum + payment.amount, 0))
}

/**
 * Builds the line items for a monthly per-studio document from its summary:
 * one line for lesson hours, and one for travel pay when applicable.
 */
export function buildMonthlyLineItems(
  summary: Pick<
    StudioMonthSummary,
    'totalHours' | 'hourlyRate' | 'hoursAmount' | 'travelDays' | 'travelPay' | 'travelAmount'
  >,
  monthLabel: string,
): DocumentLineItem[] {
  const items: DocumentLineItem[] = [
    {
      description: `שיעורי פילאטיס — ${monthLabel}`,
      quantity: roundHours(summary.totalHours),
      unitPrice: summary.hourlyRate,
      amount: summary.hoursAmount,
    },
  ]
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
