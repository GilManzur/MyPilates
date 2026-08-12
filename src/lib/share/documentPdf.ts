import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

/**
 * Renders a DOM node (the printable `.doc-print` receipt) to a single-page
 * A4 PDF blob. The node is rasterized first so Hebrew/RTL text renders exactly
 * as the browser shows it — jsPDF's own text engine can't be trusted with Hebrew.
 */
export async function elementToPdfBlob(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
  })
  const img = await loadImage(dataUrl)

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 28
  const availW = pageW - margin * 2
  const availH = pageH - margin * 2

  const ratio = img.height / img.width
  let renderW = availW
  let renderH = availW * ratio
  if (renderH > availH) {
    renderH = availH
    renderW = availH / ratio
  }
  const x = (pageW - renderW) / 2
  pdf.addImage(dataUrl, 'PNG', x, margin, renderW, renderH)
  return pdf.output('blob')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('failed to load rendered receipt image'))
    img.src = src
  })
}

/** `05X-XXXXXXX` / `+972…` → bare international digits for a wa.me link. */
export function normalizeIsraeliPhone(raw?: string): string | undefined {
  if (!raw) return undefined
  const digits = raw.replace(/\D/g, '')
  if (!digits) return undefined
  if (digits.startsWith('972')) return digits
  if (digits.startsWith('0')) return `972${digits.slice(1)}`
  return digits
}

export type ShareOutcome = 'shared' | 'fallback'

/**
 * Shares the PDF via the native share sheet when the browser supports sharing
 * files (mobile: the user picks WhatsApp and the recipient there). Otherwise
 * falls back to downloading the PDF and opening WhatsApp with a text message.
 */
export async function shareDocumentPdf(opts: {
  blob: Blob
  fileName: string
  title: string
  text: string
  phone?: string
}): Promise<ShareOutcome> {
  const { blob, fileName, title, text, phone } = opts
  const file = new File([blob], fileName, { type: 'application/pdf' })
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }

  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text })
      return 'shared'
    } catch (err) {
      // User dismissed the share sheet — nothing more to do.
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
      // Any other failure: fall through to the download + link fallback.
    }
  }

  downloadBlob(blob, fileName)
  const intl = normalizeIsraeliPhone(phone)
  const waUrl = intl
    ? `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(waUrl, '_blank', 'noopener')
  return 'fallback'
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
