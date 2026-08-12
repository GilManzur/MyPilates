/**
 * YamPilates — Receipt archive (Google Apps Script Web App)
 * ---------------------------------------------------------
 * Receives a receipt PDF from the app at issue time and:
 *   1. files the PDF into a per-month Drive folder ("<root>/YYYY-MM/<name>.pdf")
 *   2. appends a row to a ledger Google Sheet (ריכוז)
 *
 * This is the quarterly-backup / ריכוז layer (הוראה 4.01 §25(ו)). It runs in the
 * studio owner's own Google account, so the files live in the owner's Drive.
 *
 * ── One-time setup ────────────────────────────────────────────────────────────
 * 1. Create a Drive folder for receipts and a Google Sheet for the ledger.
 * 2. script.google.com → New project → paste this file.
 * 3. Project Settings → Script Properties, add:
 *      ROOT_FOLDER_ID   = <the Drive receipts folder id (from its URL)>
 *      LEDGER_SHEET_ID  = <the Google Sheet id (from its URL)>
 *      ARCHIVE_TOKEN    = <a long random secret; also put it in the app .env>
 * 4. Deploy → New deployment → type "Web app":
 *      Execute as: Me    ·    Who has access: Anyone
 *    Copy the Web app URL.
 * 5. In the app .env set:
 *      VITE_ARCHIVE_WEBAPP_URL = <the Web app URL>
 *      VITE_ARCHIVE_TOKEN      = <the same ARCHIVE_TOKEN>
 *
 * Re-deploy (Manage deployments → Edit → new version) after editing this code.
 */

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties()
    const data = JSON.parse(e.postData.contents)

    if (!data.token || data.token !== props.getProperty('ARCHIVE_TOKEN')) {
      return jsonOut({ ok: false, error: 'unauthorized' })
    }

    const root = DriveApp.getFolderById(props.getProperty('ROOT_FOLDER_ID'))
    const monthFolder = getOrCreateFolder(root, String(data.yearMonth || 'unknown'))

    const bytes = Utilities.base64Decode(data.pdfBase64)
    const fileName = data.fileName || (data.type + '-' + data.number + '.pdf')
    const pdf = Utilities.newBlob(bytes, 'application/pdf', fileName)
    const file = monthFolder.createFile(pdf)

    appendLedgerRow(props.getProperty('LEDGER_SHEET_ID'), data, file.getUrl())

    return jsonOut({ ok: true, url: file.getUrl() })
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) })
  }
}

/** Returns the child folder with `name`, creating it if absent. */
function getOrCreateFolder(parent, name) {
  const existing = parent.getFoldersByName(name)
  return existing.hasNext() ? existing.next() : parent.createFolder(name)
}

/** Appends one row to the ledger sheet, adding a header row on first use. */
function appendLedgerRow(sheetId, data, fileUrl) {
  const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0]
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['מספר', 'סוג', 'תאריך', 'נמען', 'סכום', 'קישור PDF'])
  }
  sheet.appendRow([
    data.number,
    data.type,
    data.issuedAt,
    data.recipientName,
    data.total,
    fileUrl,
  ])
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
