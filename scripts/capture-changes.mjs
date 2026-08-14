import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'docs', 'ui-review', 'after')
const BASE = process.env.UI_REVIEW_BASE_URL ?? 'http://localhost:5199'
const YM = '2026-08'
const UID = 'local_cap'

function seedStore() {
  const now = new Date().toISOString()
  return {
    profiles: {
      [UID]: {
        displayName: 'יעל',
        email: 'yael@example.com',
        fcmTokens: [],
        business: {
          legalName: 'יעל כהן - פילאטיס',
          taxId: '123456789',
          address: 'רחוב הברוש 15, תל אביב',
          phone: '054-1234567',
          email: 'yael@pilates.co.il',
          ownerFullName: 'יעל כהן',
        },
      },
    },
    studios: {
      [UID]: [
        { id: 's1', name: 'סטודיו נשמה', hourlyRate: 120, currency: 'ILS', color: '#e07a5f', active: true, travelPay: 30, createdAt: now },
        { id: 's2', name: 'גוף ונפש', hourlyRate: 150, currency: 'ILS', color: '#81b29a', active: true, createdAt: now },
        { id: 's3', name: 'פילאטיס פלוס', hourlyRate: 140, currency: 'ILS', color: '#3d85c6', active: true, createdAt: now },
      ],
    },
    lessons: {
      [UID]: [
        { id: 'l1', studioId: 's1', title: 'מזרן', startAt: '2026-08-10T07:00:00', endAt: '2026-08-10T08:00:00', durationHours: 1, status: 'scheduled', hoursConfirmed: true, createdAt: now },
        { id: 'l2', studioId: 's2', title: 'רפורמר', startAt: '2026-08-11T16:00:00', endAt: '2026-08-11T17:30:00', durationHours: 1.5, status: 'scheduled', hoursConfirmed: true, createdAt: now },
        { id: 'l3', studioId: 's1', title: 'מזרן', startAt: '2026-08-12T07:00:00', endAt: '2026-08-12T08:00:00', durationHours: 1, status: 'scheduled', hoursConfirmed: true, createdAt: now },
        { id: 'l4', studioId: 's3', title: 'קאדילק', startAt: '2026-08-13T09:00:00', endAt: '2026-08-13T10:00:00', durationHours: 1, status: 'scheduled', hoursConfirmed: true, createdAt: now },
        { id: 'l5', studioId: 's2', title: 'יוגה-לאטיס', startAt: '2026-08-14T17:00:00', endAt: '2026-08-14T18:00:00', durationHours: 1, status: 'scheduled', hoursConfirmed: true, createdAt: now },
        { id: 'l6', studioId: 's1', title: 'מזרן', startAt: '2026-08-03T07:00:00', endAt: '2026-08-03T08:00:00', durationHours: 1, status: 'completed', hoursConfirmed: true, createdAt: now },
        { id: 'l7', studioId: 's2', title: 'רפורמר', startAt: '2026-08-05T16:00:00', endAt: '2026-08-05T17:30:00', durationHours: 1.5, status: 'completed', hoursConfirmed: true, createdAt: now },
        { id: 'l8', studioId: 's1', title: 'מזרן', startAt: '2026-08-17T07:00:00', endAt: '2026-08-17T08:00:00', durationHours: 1, status: 'scheduled', hoursConfirmed: false, createdAt: now },
        { id: 'l9', studioId: 's3', title: 'פרטי', startAt: '2026-08-19T09:00:00', endAt: '2026-08-19T10:00:00', durationHours: 1, status: 'scheduled', hoursConfirmed: false, createdAt: now },
        { id: 'l10', studioId: 's2', title: 'יוגה-לאטיס', startAt: '2026-08-21T17:00:00', endAt: '2026-08-21T18:00:00', durationHours: 1, status: 'scheduled', hoursConfirmed: false, createdAt: now },
      ],
    },
    hours: {
      [UID]: [
        { id: 'h1', studioId: 's1', date: `${YM}-03`, hours: 1, source: 'lesson', lessonId: 'l6', createdAt: now },
        { id: 'h2', studioId: 's2', date: `${YM}-05`, hours: 1.5, source: 'lesson', lessonId: 'l7', createdAt: now },
        { id: 'h3', studioId: 's1', date: `${YM}-10`, hours: 1, source: 'lesson', lessonId: 'l1', createdAt: now },
        { id: 'h4', studioId: 's2', date: `${YM}-11`, hours: 1.5, source: 'lesson', lessonId: 'l2', createdAt: now },
        { id: 'h5', studioId: 's1', date: `${YM}-12`, hours: 1, source: 'lesson', lessonId: 'l3', createdAt: now },
        { id: 'h6', studioId: 's3', date: `${YM}-13`, hours: 1, source: 'lesson', lessonId: 'l4', createdAt: now },
      ],
    },
    payments: {
      [UID]: [
        { id: 'pay1', studioId: 's1', yearMonth: YM, status: 'confirmed', amount: 500, createdAt: now },
      ],
    },
    documents: {
      [UID]: [
        {
          id: 'doc1', number: 1, type: 'receipt', status: 'issued',
          issuedAt: '2026-08-05T10:00:00', createdAt: now,
          recipient: { name: 'סטודיו נשמה', studioId: 's1' },
          lineItems: [{ description: 'שיעורי פילאטיס — אוגוסט 2026', quantity: 2, unitPrice: 120, amount: 240 }],
          total: 240, currency: 'ILS',
          payments: [{ method: 'transfer', amount: 240 }],
          business: { legalName: 'יעל כהן - פילאטיס', taxId: '123456789', address: 'רחוב הברוש 15, תל אביב', phone: '054-1234567', email: 'yael@pilates.co.il', ownerFullName: 'יעל כהן' },
          sourceRef: { studioId: 's1', yearMonth: YM, entryIds: ['h1', 'h3'] },
        },
        {
          id: 'doc2', number: 1, type: 'invoice', status: 'issued',
          issuedAt: '2026-08-08T10:00:00', createdAt: now,
          recipient: { name: 'גוף ונפש', studioId: 's2' },
          lineItems: [{ description: 'שיעורי פילאטיס — אוגוסט 2026', quantity: 1.5, unitPrice: 150, amount: 225 }],
          total: 225, currency: 'ILS',
          business: { legalName: 'יעל כהן - פילאטיס', taxId: '123456789', address: 'רחוב הברוש 15, תל אביב', phone: '054-1234567', email: 'yael@pilates.co.il', ownerFullName: 'יעל כהן' },
          sourceRef: { studioId: 's2', yearMonth: YM, entryIds: ['h2'] },
        },
      ],
    },
    documentCounters: { [UID]: { documentNumber: 1, invoiceNumber: 1, demandNumber: 0 } },
    auth: { uid: UID, email: 'yael@example.com', password: 'demo', displayName: 'יעל' },
  }
}

const shots = [
  {
    name: '01-calendar-mobile',
    path: '/calendar',
    note: 'יומן — שבוע מורחב עם שמות סטודיו',
  },
  {
    name: '02-documents-mobile',
    path: '/documents',
    note: 'מסמכים — כרטיסים במובייל',
  },
  {
    name: '03-doc-viewer',
    path: '/documents',
    note: 'חלון צפייה — 3 כפתורים',
    after: async (page) => {
      await page.getByRole('button', { name: /צפייה/ }).first().click()
      await page.waitForTimeout(500)
    },
  },
  {
    name: '04-payments-mobile',
    path: '/payments',
    note: 'תשלומים — כפתור הפק קבלה',
  },
  {
    name: '05-payment-method-step1',
    path: '/payments',
    note: 'בחירת אמצעי תשלום — שלב 1',
    after: async (page) => {
      await page.getByRole('button', { name: /קבלה/ }).first().click()
      await page.waitForTimeout(500)
    },
  },
  {
    name: '06-payment-method-step2',
    path: '/payments',
    note: 'תצוגה מקדימה — שלב 2',
    after: async (page) => {
      await page.getByRole('button', { name: /קבלה/ }).first().click()
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: /תצוגה מקדימה/ }).click()
      await page.waitForTimeout(600)
    },
  },
  {
    name: '07-confirm-cancel',
    path: '/documents',
    note: 'אישור ביטול מסמך (ConfirmSheet)',
    after: async (page) => {
      await page.getByRole('button', { name: /ביטול/ }).first().click()
      await page.waitForTimeout(500)
    },
  },
  {
    name: '08-documents-desktop',
    path: '/documents',
    note: 'מסמכים — טבלה בדסקטופ',
    viewport: { width: 1280, height: 800 },
  },
]

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const results = []

  for (const shot of shots) {
    const vp = shot.viewport ?? { width: 375, height: 812 }
    const context = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: 2,
      locale: 'he-IL',
    })
    const page = await context.newPage()

    await context.addInitScript((store) => {
      localStorage.setItem('mypilates_local_v1', JSON.stringify(store))
    }, seedStore())

    await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    if (shot.after) await shot.after(page)
    await page.waitForTimeout(300)

    const file = path.join(OUT, `${shot.name}.png`)
    await page.screenshot({ path: file, fullPage: shot.name.includes('calendar') || shot.name.includes('desktop') })
    console.log(`saved ${shot.name}`)
    results.push({ file: `${shot.name}.png`, note: shot.note })
    await context.close()
  }

  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(results, null, 2))
  await browser.close()
  console.log(`Done — ${results.length} screenshots`)
}

main().catch((err) => { console.error(err); process.exit(1) })
