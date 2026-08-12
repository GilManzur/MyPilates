import { createRoot } from 'react-dom/client'
import { DocumentPrint } from '../../components/DocumentPrint'
import { documentTypeLabel, formatDocumentNumber } from '../documents'
import type { FinancialDocument } from '../../types'
import { archiveReceiptPdf, elementToPdfBlob } from './documentPdf'

/**
 * Backs up an issued receipt to Drive/Sheets, independently of any on-screen
 * viewer: it renders the document off-screen, rasterizes it to a PDF, and POSTs
 * it to the archive Apps Script. Fire-and-forget — safe to call from anywhere a
 * receipt is issued (documents page, payments page). No-ops when archiving is
 * not configured (VITE_ARCHIVE_WEBAPP_URL unset).
 */
export async function archiveReceiptDocument(doc: FinancialDocument): Promise<void> {
  if (!import.meta.env.VITE_ARCHIVE_WEBAPP_URL) return
  if (typeof document === 'undefined') return

  const host = document.createElement('div')
  // Keep it laid out (so it paints) but far off-screen and non-interactive.
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:640px;background:#fff;pointer-events:none;z-index:-1;'
  document.body.appendChild(host)
  const root = createRoot(host)

  const capture = async () => {
    root.render(<DocumentPrint document={doc} />)
    // Let it paint (and give the logo image a moment to load) before capture.
    await new Promise((resolve) => setTimeout(resolve, 500))
    const node = host.querySelector('.doc-print') as HTMLElement | null
    if (!node) throw new Error('archive: render node not found')
    node.classList.add('doc-print--capture')

    const blob = await elementToPdfBlob(node)
    const name = doc.business.ownerFullName?.trim() || doc.business.legalName
    const number = formatDocumentNumber(doc.type, doc.number)
    await archiveReceiptPdf(blob, {
      fileName: `${documentTypeLabel(doc.type)} ${number} - ${name}.pdf`,
      yearMonth: doc.issuedAt.slice(0, 7),
      number,
      type: doc.type,
      issuedAt: doc.issuedAt,
      recipientName: doc.recipient.name,
      total: doc.total,
    })
    console.info('[archive] receipt sent to Drive/Sheets:', number)
  }

  try {
    // Guard against a hung rasterization so the off-screen node is always cleaned up.
    await Promise.race([
      capture(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('archive: rasterization timed out')), 20000),
      ),
    ])
  } catch (err) {
    console.warn('[archive] receipt backup failed:', err)
  } finally {
    root.unmount()
    host.remove()
  }
}
