// Captures screenshots (desktop + mobile) confirming the incremental (delta)
// receipts/invoices feature, and writes a self-contained artifact.
//
// Usage: start the dev server in LOCAL mode, then:
//   UI_REVIEW_BASE_URL=http://127.0.0.1:5199 node scripts/capture-delta.mjs
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_HTML = path.join(ROOT, 'scratch', 'delta-billing.html')
const BASE = process.env.UI_REVIEW_BASE_URL ?? 'http://127.0.0.1:5199'
const UID = 'local_delta'
const NOW = '2026-08-01T09:00:00.000Z'

const business = { legalName: 'סטודיו ים פילאטיס', ownerFullName: 'יעל כהן', taxId: '312456789' }
const studio = { id: 's1', name: 'סטודיו גלים', hourlyRate: 150, currency: 'ILS', color: '#5B7C6A', active: true, createdAt: NOW, travelPay: 0, swapPay: 0 }
const lesson = (id, day, title) => ({ id, studioId: 's1', title, startAt: `2026-08-${day}T07:00:00.000Z`, endAt: `2026-08-${day}T08:00:00.000Z`, durationHours: 1, status: 'scheduled', hoursConfirmed: true, createdAt: NOW })
const entry = (id, day, lessonId) => ({ id, studioId: 's1', date: `2026-08-${day}`, hours: 1, source: lessonId ? 'lesson' : 'manual', ...(lessonId ? { lessonId } : {}), createdAt: NOW })

// State: invoice #1 already covers h1,h2,h3; a surprise 4th entry (h4) is not yet billed.
function seedStore() {
  const inv1 = {
    id: 'inv1', number: 1, type: 'invoice', status: 'issued',
    issuedAt: '2026-08-20T10:00:00.000Z', createdAt: '2026-08-20T10:00:00.000Z',
    currency: 'ILS', business, recipient: { name: 'סטודיו גלים', studioId: 's1' },
    lineItems: [{ description: 'שיעורי פילאטיס — אוגוסט 2026', quantity: 3, unitPrice: 150, amount: 450 }],
    total: 450, sourceRef: { studioId: 's1', yearMonth: '2026-08', entryIds: ['h1', 'h2', 'h3'] },
  }
  return {
    profiles: { [UID]: { displayName: 'יעל', email: 'y@e.com', fcmTokens: [], business } },
    studios: { [UID]: [studio] },
    lessons: { [UID]: [lesson('l1', '05', 'מזרן בוקר'), lesson('l2', '12', 'רפורמר')] },
    hours: { [UID]: [entry('h1', '05', 'l1'), entry('h2', '12', 'l2'), entry('h3', '19', null), entry('h4', '26', null)] },
    payments: {},
    documents: { [UID]: [inv1] },
    counters: { [UID]: { documentNumber: 0, invoiceNumber: 1, demandNumber: 0 } },
    auth: { uid: UID, email: 'y@e.com', password: 'demo1234', displayName: 'יעל' },
  }
}

const shots = [
  {
    key: 'remaining',
    title: 'עמוד התשלומים — יתרה בלבד',
    gap: 'לפני: הפקה באמצע החודש "סגרה" את החודש; שיעור מפתיע חייב ביטול והפקה מחדש.',
    after: 'אחרי: "כבר קובל ₪450 · נותר ₪150", והכפתור מפיק רק על היתרה (השיעור החדש).',
    url: '/payments',
    target: '.list.panel',
  },
  {
    key: 'confirm',
    title: 'אישור לפני הפקה (וניתן לשחזר)',
    gap: 'לפני: לחיצה בטעות = מסמך שגוי על כל החודש.',
    after: 'אחרי: דיאלוג אישור עם הסכום ומספר הרשומות, והבהרה שאפשר לבטל ולהחזיר את השיעורים ליתרה.',
    url: '/payments',
    prep: async (page) => {
      await page.getByRole('button', { name: 'הפק חשבונית על היתרה' }).click()
      await page.waitForSelector('.sheet--confirm')
    },
    target: '.sheet--confirm',
  },
  {
    key: 'expanded',
    title: 'פירוט לפי מסמך',
    gap: 'לפני: אי אפשר לדעת אילו שיעורים עומדים מאחורי כל מסמך.',
    after: 'אחרי: הרחבת המסמך מציגה בדיוק את השיעורים/שעות שהוא מכסה (חשבונית ראשונה = 3 השיעורים הראשונים).',
    url: '/documents',
    prep: async (page) => {
      await page.locator('.doc-row').filter({ hasText: 'INV-0001' }).click()
      await page.waitForSelector('.doc-detail__row--lesson')
    },
    target: '.panel',
  },
]

const VIEWPORTS = [
  { key: 'desktop', width: 1280, height: 900, dsf: 1 },
  { key: 'mobile', width: 390, height: 844, dsf: 2 },
]

async function capture() {
  const browser = await chromium.launch({ headless: true })
  const images = {}
  for (const vp of VIEWPORTS) {
    for (const shot of shots) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dsf,
        locale: 'he-IL',
      })
      const page = await context.newPage()
      await context.addInitScript((next) => {
        localStorage.setItem('mypilates_local_v1', JSON.stringify(next))
      }, seedStore())
      await page.goto(`${BASE}${shot.url}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      try {
        if (shot.prep) await shot.prep(page)
        await page.waitForTimeout(300)
        const buf = await page.locator(shot.target).first().screenshot()
        images[shot.key] ??= {}
        images[shot.key][vp.key] = buf.toString('base64')
        console.log('captured', shot.key, vp.key)
      } catch (err) {
        console.error('FAILED', shot.key, vp.key, String(err).split('\n')[0])
      }
      await context.close()
    }
  }
  await browser.close()
  return images
}

function card(shot, imgs) {
  const img = (b64, label) =>
    b64
      ? `<figure class="shot shot--${label === 'מובייל' ? 'mobile' : 'desktop'}"><img src="data:image/png;base64,${b64}" alt="${shot.title} — ${label}" loading="lazy"/><figcaption>${label}</figcaption></figure>`
      : `<figure class="shot shot--missing"><span>אין תמונה (${label})</span></figure>`
  return `<section class="card"><h2>${shot.title}</h2><p class="gap">${shot.gap}</p><p class="after">${shot.after}</p><div class="shots">${img(imgs?.desktop, 'דסקטופ')}${img(imgs?.mobile, 'מובייל')}</div></section>`
}

function buildHtml(images) {
  const cards = shots.map((s) => card(s, images[s.key])).join('\n')
  return `<title>קבלות מצטברות (delta) — אימות ויזואלי</title>
<main dir="rtl" lang="he" class="wrap">
  <header class="masthead">
    <p class="eyebrow">YamPilates · תשלומים ומסמכים</p>
    <h1>קבלות/חשבוניות מצטברות — אישור השינוי</h1>
    <p class="lede">מסמך מכסה רק את השיעורים שעדיין לא קובלו. שיעור מפתיע? מפיקים מסמך נוסף על היתרה בלבד — בלי ביטול והפקה מחדש. צילומים אמיתיים מהאפליקציה, דסקטופ ומובייל.</p>
  </header>
  ${cards}
  <footer class="foot">YamPilates · ענף <code>feature/tax-compliance-docs</code></footer>
</main>
<style>
  :root{--paper:#FBFAF7;--surface:#FFFFFF;--ink:#1B2620;--muted:#5E6B63;--line:#E4E8E2;--accent:#4C7A64;--ok:#35795A;--danger:#B4462F;--radius:14px;--shadow:0 1px 2px rgba(20,32,27,.05),0 10px 30px rgba(20,32,27,.07);--font:"Assistant","Heebo","Segoe UI",system-ui,"Arial",sans-serif;}
  :root:not([data-theme="light"]){@media (prefers-color-scheme:dark){--paper:#0F1310;--surface:#171C18;--ink:#E8EDE8;--muted:#98A49C;--line:#262E28;--accent:#7FB396;--ok:#74C79A;--danger:#E28468;--shadow:0 1px 2px rgba(0,0,0,.3),0 12px 32px rgba(0,0,0,.4);}}
  :root[data-theme="dark"]{--paper:#0F1310;--surface:#171C18;--ink:#E8EDE8;--muted:#98A49C;--line:#262E28;--accent:#7FB396;--ok:#74C79A;--danger:#E28468;--shadow:0 1px 2px rgba(0,0,0,.3),0 12px 32px rgba(0,0,0,.4);}
  *{box-sizing:border-box;}
  body{background:var(--paper);color:var(--ink);font-family:var(--font);margin:0;}
  .wrap{max-width:1000px;margin:0 auto;padding:40px 22px 64px;}
  .eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:0 0 10px;}
  h1{font-size:clamp(24px,4vw,38px);line-height:1.14;margin:0 0 12px;font-weight:800;letter-spacing:-.01em;text-wrap:balance;}
  .lede{font-size:17px;line-height:1.6;color:var(--muted);margin:0 0 8px;max-width:64ch;}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:22px;margin-top:22px;}
  .card h2{margin:0 0 6px;font-size:21px;font-weight:800;letter-spacing:-.01em;}
  .gap{margin:0 0 3px;font-size:13.5px;color:var(--danger);}
  .after{margin:0 0 16px;font-size:13.5px;color:var(--ok);font-weight:600;}
  .shots{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;}
  .shot{margin:0;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--paper);}
  .shot img{display:block;width:100%;height:auto;}
  .shot--desktop{flex:1 1 520px;min-width:280px;}
  .shot--mobile{flex:0 0 230px;max-width:230px;}
  .shot figcaption{font-size:12px;font-weight:700;color:var(--muted);text-align:center;padding:7px;border-top:1px solid var(--line);letter-spacing:.04em;}
  .shot--missing{flex:1 1 300px;display:grid;place-items:center;min-height:120px;border-style:dashed;color:var(--muted);font-size:13px;}
  .foot{margin-top:30px;text-align:center;font-size:12.5px;color:var(--muted);}
  code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em;background:color-mix(in srgb,var(--ink) 8%,transparent);padding:1px 5px;border-radius:5px;}
</style>`
}

const images = await capture()
await writeFile(OUT_HTML, buildHtml(images), 'utf8')
console.log('wrote', OUT_HTML)
