import { createRoot } from 'react-dom/client'
import { DocumentPrint } from '../../components/DocumentPrint'
import { documentTypeLabel, formatDocumentNumber } from '../documents'
import type { FinancialDocument } from '../../types'
import type { ArchiveOutcome } from './documentPdf'
import { archiveReceiptPdf, elementToPdfBlob } from './documentPdf'

export async function archiveDocument(doc: FinancialDocument): Promise<ArchiveOutcome> {
  if (typeof document === 'undefined') return 'skipped'
  if (!import.meta.env.VITE_ARCHIVE_WEBAPP_URL) {
    console.warn(
      '[archive] skipped — VITE_ARCHIVE_WEBAPP_URL is not set.',
    )
    return 'skipped'
  }
  console.info('[archive] starting for', doc.type, doc.number)

  const host = document.createElement('div')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:640px;background:#fff;pointer-events:none;z-index:-1;'
  document.body.appendChild(host)
  const root = createRoot(host)

  let outcome: ArchiveOutcome = 'error'

  const capture = async () => {
    root.render(<DocumentPrint document={doc} />)
    // Poll for the rendered node instead of a fixed timeout.
    let node: HTMLElement | null = null
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      node = host.querySelector('.doc-print') as HTMLElement | null
      if (node) break
    }
    if (!node) throw new Error('archive: render node not found')
    // Give the logo a moment to load after the node is present.
    await new Promise((resolve) => setTimeout(resolve, 300))
    node.classList.add('doc-print--capture')

    const blob = await elementToPdfBlob(node)
    const name = doc.business.ownerFullName?.trim() || doc.business.legalName
    const number = formatDocumentNumber(doc.type, doc.number)
    const result = await archiveReceiptPdf(blob, {
      fileName: `${documentTypeLabel(doc.type)} ${number} - ${name}.pdf`,
      yearMonth: doc.issuedAt.slice(0, 7),
      number,
      type: doc.type,
      issuedAt: doc.issuedAt,
      recipientName: doc.recipient.name,
      total: doc.total,
    })
    outcome = result.status
    if (result.status === 'ok') {
      console.info('[archive] receipt sent to Drive/Sheets:', number)
    } else if (result.error) {
      console.warn('[archive] failed:', result.error)
    }
  }

  try {
    await Promise.race([
      capture(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('archive: rasterization timed out')), 20000),
      ),
    ])
  } catch (err) {
    console.warn('[archive] receipt backup failed:', err)
    outcome = 'error'
  } finally {
    root.unmount()
    host.remove()
  }
  return outcome
}
