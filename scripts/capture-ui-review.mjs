import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs', 'ui-review', 'screenshots')
const BASE = process.env.UI_REVIEW_BASE_URL ?? 'http://127.0.0.1:5173'
const YM = '2026-08'
const UID = 'local_review'

function seedStore(clearAuth = false) {
  const now = new Date().toISOString()
  return {
    profiles: {
      [UID]: { displayName: 'ים', email: 'yam@example.com', fcmTokens: [] },
    },
    studios: {
      [UID]: [
        {
          id: 'studio_waves',
          name: 'סטודיו גלים',
          hourlyRate: 150,
          currency: 'ILS',
          color: '#5B7C6A',
          active: true,
          createdAt: now,
        },
        {
          id: 'studio_beach',
          name: 'פילאטיס חוף',
          hourlyRate: 180,
          currency: 'ILS',
          color: '#6A8A9B',
          active: true,
          createdAt: now,
        },
        {
          id: 'studio_idle',
          name: 'סטודיו ללא שיעורים',
          hourlyRate: 160,
          currency: 'ILS',
          color: '#8B6F5C',
          active: true,
          createdAt: now,
        },
      ],
    },
    lessons: {
      [UID]: [
        {
          id: 'lesson_1',
          studioId: 'studio_waves',
          title: 'מזרן בוקר',
          startAt: '2026-08-05T07:00:00.000Z',
          endAt: '2026-08-05T08:00:00.000Z',
          durationHours: 1,
          status: 'scheduled',
          hoursConfirmed: true,
          createdAt: now,
        },
        {
          id: 'lesson_2',
          studioId: 'studio_beach',
          title: 'רפורמר ערב',
          startAt: '2026-08-12T16:00:00.000Z',
          endAt: '2026-08-12T17:30:00.000Z',
          durationHours: 1.5,
          status: 'scheduled',
          hoursConfirmed: false,
          createdAt: now,
        },
        {
          id: 'lesson_3',
          studioId: 'studio_waves',
          title: 'קאדילק',
          startAt: '2026-08-20T09:00:00.000Z',
          endAt: '2026-08-20T10:00:00.000Z',
          durationHours: 1,
          status: 'scheduled',
          hoursConfirmed: false,
          createdAt: now,
        },
        {
          id: 'lesson_4',
          studioId: 'studio_beach',
          title: 'שיעור פרטי',
          startAt: '2026-08-28T11:00:00.000Z',
          endAt: '2026-08-28T12:00:00.000Z',
          durationHours: 1,
          status: 'scheduled',
          hoursConfirmed: false,
          createdAt: now,
        },
      ],
    },
    hours: {
      [UID]: [
        {
          id: 'hour_1',
          studioId: 'studio_waves',
          date: `${YM}-05`,
          hours: 1,
          source: 'lesson',
          lessonId: 'lesson_1',
          createdAt: now,
        },
        {
          id: 'hour_2',
          studioId: 'studio_beach',
          date: `${YM}-08`,
          hours: 2,
          source: 'manual',
          note: 'החלפה',
          createdAt: now,
        },
      ],
    },
    payments: { [UID]: [] },
    auth: clearAuth
      ? null
      : {
          uid: UID,
          email: 'yam@example.com',
          password: 'demo1234',
          displayName: 'ים',
        },
  }
}

const shots = [
  { name: '01-login', path: '/login', clearAuth: true, note: 'מסך התחברות' },
  { name: '02-home', path: '/', note: 'בית — סיכום חודשי בלי סטודיו ריק' },
  { name: '03-calendar', path: '/calendar', note: 'יומן חודשי עם שיעורים צבועים' },
  { name: '04-hours', path: '/hours', note: 'שעות — אישור והזנה ידנית' },
  { name: '05-payments', path: '/payments', note: 'תשלומים — רק סטודיוים עם שעות' },
  { name: '06-settings', path: '/settings', note: 'הגדרות כולל ניהול סטודיוים' },
  {
    name: '07-studio-color-sheet',
    path: '/settings',
    note: 'בחירת צבע לסטודיו',
    after: async (page) => {
      await page.getByRole('button', { name: 'סטודיו חדש' }).click()
      await page.waitForSelector('.color-picker')
    },
  },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const manifest = []

  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      locale: 'he-IL',
    })
    const page = await context.newPage()
    const store = seedStore(Boolean(shot.clearAuth))

    await context.addInitScript((next) => {
      localStorage.setItem('mypilates_local_v1', JSON.stringify(next))
    }, store)

    await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    if (shot.after) await shot.after(page)
    await page.waitForTimeout(300)

    const file = path.join(OUT_DIR, `${shot.name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log('saved', file)
    manifest.push({
      file: `screenshots/${shot.name}.png`,
      title: shot.note,
      route: shot.path,
    })
    await context.close()
  }

  await writeFile(
    path.join(ROOT, 'docs', 'ui-review', 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  )
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
