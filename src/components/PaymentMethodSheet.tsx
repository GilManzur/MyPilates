import { useState } from 'react'
import { Button } from './Button'
import { Overlay } from './Overlay'
import { DocumentPrint } from './DocumentPrint'
import { Field, TextInput, TextSelect } from './Field'
import { paymentMethodLabel } from '../lib/documents'
import type {
  BusinessProfile,
  DocumentLineItem,
  DocumentPayment,
  FinancialDocument,
  PaymentMethod,
} from '../types'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'transfer', 'bit', 'paypal', 'credit', 'check']

export type PaymentSheetRequest = {
  studioName: string
  studioId: string
  amount: number
  lineItems: DocumentLineItem[]
  business: BusinessProfile
  sourceRef: { studioId: string; yearMonth: string; paymentId?: string; entryIds?: string[] }
}

export function PaymentMethodSheet({
  request,
  onClose,
  onConfirm,
}: {
  request: PaymentSheetRequest | null
  onClose: () => void
  onConfirm: (payment: DocumentPayment) => void
}) {
  const [step, setStep] = useState<'method' | 'preview'>('method')
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [bank, setBank] = useState('')
  const [branch, setBranch] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [checkNumber, setCheckNumber] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [cardType, setCardType] = useState('')
  const [reference, setReference] = useState('')

  if (!request) return null

  const payment: DocumentPayment = {
    method,
    amount: request.amount,
    ...(method === 'check'
      ? {
          ...(bank ? { bank } : {}),
          ...(branch ? { branch } : {}),
          ...(accountNumber ? { accountNumber } : {}),
          ...(checkNumber ? { checkNumber } : {}),
          ...(dueDate ? { dueDate } : {}),
        }
      : method === 'credit'
        ? { ...(cardType ? { cardType } : {}) }
        : { ...(reference ? { reference } : {}) }),
  }

  const previewDoc: FinancialDocument = {
    id: 'preview',
    number: 0,
    type: 'receipt',
    status: 'issued',
    issuedAt: new Date().toISOString(),
    recipient: { name: request.studioName, studioId: request.studioId },
    lineItems: request.lineItems,
    total: request.amount,
    currency: 'ILS',
    payments: [payment],
    business: request.business,
  }

  return (
    <Overlay onClose={onClose}>
      <div className="sheet-backdrop" onClick={onClose}>
        <div
          className="sheet sheet--payment"
          role="dialog"
          aria-modal="true"
          aria-label="בחירת אמצעי תשלום"
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'method' ? (
            <>
              <h2>אמצעי תשלום</h2>
              <Field label="סוג">
                <TextSelect
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabel(m)}
                    </option>
                  ))}
                </TextSelect>
              </Field>

              {method === 'check' ? (
                <div className="grid-2">
                  <Field label="בנק">
                    <TextInput value={bank} onChange={(e) => setBank(e.target.value)} />
                  </Field>
                  <Field label="סניף">
                    <TextInput value={branch} onChange={(e) => setBranch(e.target.value)} />
                  </Field>
                  <Field label="מס׳ חשבון">
                    <TextInput
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </Field>
                  <Field label="מס׳ המחאה">
                    <TextInput
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                    />
                  </Field>
                  <Field label="תאריך פירעון">
                    <TextInput
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </Field>
                </div>
              ) : method === 'credit' ? (
                <Field label="סוג כרטיס">
                  <TextInput value={cardType} onChange={(e) => setCardType(e.target.value)} />
                </Field>
              ) : (
                <Field label="אסמכתא (אופציונלי)">
                  <TextInput value={reference} onChange={(e) => setReference(e.target.value)} />
                </Field>
              )}

              <div className="row-actions">
                <Button variant="secondary" onClick={onClose}>
                  ביטול
                </Button>
                <Button variant="primary" onClick={() => setStep('preview')}>
                  תצוגה מקדימה
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2>תצוגה מקדימה</h2>
              <div className="payment-sheet__preview">
                <DocumentPrint document={previewDoc} draft />
              </div>
              <div className="row-actions">
                <Button variant="secondary" onClick={() => setStep('method')}>
                  חזרה
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    onConfirm(payment)
                    onClose()
                  }}
                >
                  הפיקי קבלה
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Overlay>
  )
}
