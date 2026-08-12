// Captures real screenshots of the tax-compliance features (desktop + mobile)
// and writes a self-contained before/after artifact with the images inlined.
//
// Usage: start the dev server in LOCAL mode, then:
//   UI_REVIEW_BASE_URL=http://127.0.0.1:5199 node scripts/capture-compliance.mjs
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_HTML = path.join(ROOT, 'scratch', 'compliance-before-after.html')
const BASE = process.env.UI_REVIEW_BASE_URL ?? 'http://127.0.0.1:5199'
const UID = 'local_compliance'
const NOW = new Date().toISOString()

const business = {
  legalName: 'סטודיו ים פילאטיס',
  taxId: '312456789',
  address: 'רחוב החוף 12, תל אביב',
  phone: '050-1234567',
}

function doc(over) {
  return {
    id: over.id,
    number: over.number,
    type: over.type,
    status: over.status ?? 'issued',
    issuedAt: NOW,
    createdAt: NOW,
    currency: 'ILS',
    business,
    recipient: { name: over.recipient },
    lineItems: [
      { description: over.desc, quantity: 1, unitPrice: over.total, amount: over.total },
    ],
    total: over.total,
    ...(over.type === 'receipt'
      ? { payments: [{ method: 'transfer', amount: over.total }] }
      : {}),
    ...(over.originalPrintedAt ? { originalPrintedAt: NOW } : {}),
  }
}

function seedStore() {
  return {
    profiles: { [UID]: { displayName: 'ים', email: 'yam@example.com', fcmTokens: [], business } },
    studios: {},
    lessons: {},
    hours: {},
    payments: {},
    documents: {
      [UID]: [
        doc({ id: 'r2', number: 2, type: 'receipt', recipient: 'דנה לוי', desc: 'מנוי חודשי — 8 שיעורים', total: 520 }),
        doc({ id: 'r1', number: 1, type: 'receipt', recipient: 'נועה ברק', desc: 'שיעור ניסיון', total: 90, originalPrintedAt: true }),
        doc({ id: 'inv1', number: 1, type: 'invoice', status: 'cancelled', recipient: 'לירן כהן', desc: 'שיעור פילאטיס יחיד', total: 240 }),
      ],
    },
    counters: { [UID]: { documentNumber: 2, invoiceNumber: 1, demandNumber: 0 } },
    auth: { uid: UID, email: 'yam@example.com', password: 'demo1234', displayName: 'ים' },
  }
}

// Each shot: prepare the screen, then capture `target` (a selector) or the page.
const shots = [
  {
    key: 'void',
    title: 'ביטול־במקום במקום מחיקה',
    gap: 'לפני: חשבונית/דרישה נמחקו פיזית ושברו את הרצף.',
    after: 'אחרי: הרשומה מסומנת "מבוטל" ונשמרת — הרצף נשמר. הכפתור הוא "ביטול מסמך", לא מחיקה.',
    target: '.panel',
  },
  {
    key: 'sequence',
    title: 'בדיקת רצף מסמכים',
    gap: 'לפני: לא היה דרך לדעת אם חסר מסמך ברצף.',
    after: 'אחרי: דוח שמסמן במפורש כל מספר קיים/חסר בכל רצף (נספח ה׳ א5).',
    prep: async (page) => {
      await page.getByRole('button', { name: 'בדיקת רצף' }).click()
      await page.waitForSelector('[role=dialog][aria-label="בדיקת רצף מסמכים"]')
    },
    target: '[role=dialog][aria-label="בדיקת רצף מסמכים"]',
  },
  {
    key: 'ledger',
    title: 'ריכוז חודשי מודפס',
    gap: 'לפני: רשימה שטוחה בלי תקופה, מהות, מספור עמודים או סימן סיום.',
    after: 'אחרי: פלט מרוכז עם כל כותרות החובה (נספח ה׳ א1+א2) ו"סוף פלט".',
    prep: async (page) => {
      await page.getByRole('button', { name: 'ריכוז חודשי' }).click()
      await page.waitForSelector('[role=dialog][aria-label="ריכוז חודשי"]')
    },
    target: '[role=dialog][aria-label="ריכוז חודשי"]',
  },
  {
    key: 'viewer',
    title: 'מעקב מקור / העתק',
    gap: 'לפני: "מקור" ניתן להדפסה אינסוף פעמים.',
    after: 'אחרי: אחרי ההדפסה/שיתוף הראשון נכפה "העתק"; הכפתור הופך ל"הדפסת העתק".',
    prep: async (page) => {
      await page.locator('.list-item').filter({ hasText: 'מס׳ 2' }).getByRole('button', { name: 'צפייה והדפסה' }).click()
      await page.waitForSelector('[role=dialog][aria-label="תצוגת מסמך"] .doc-print')
    },
    target: '[role=dialog][aria-label="תצוגת מסמך"] .doc-print',
  },
  {
    key: 'draft',
    title: 'סימון "טיוטה"',
    gap: 'לפני: הפקה ישירה, בלי סימון טיוטה.',
    after: 'אחרי: תצוגה מקדימה עם סימן מים "טיוטה" עד ללחיצה על "הפקה" (נספח ה׳ א3).',
    prep: async (page) => {
      await page.getByRole('button', { name: 'מסמך חדש' }).click()
      await page.waitForSelector('[role=dialog][aria-label], form')
      await page.getByLabel('שם הלקוח / המשלם').fill('דנה לוי')
      await page.getByLabel('תיאור').fill('מנוי חודשי — 8 שיעורים')
      await page.getByLabel('מחיר יחידה').fill('520')
      await page.getByRole('button', { name: 'תצוגה מקדימה' }).click()
      await page.waitForSelector('[role=dialog][aria-label="תצוגה מקדימה"] .doc-print')
    },
    target: '[role=dialog][aria-label="תצוגה מקדימה"] .doc-print',
  },
  {
    key: 'consent',
    title: 'בסיס "מסמך ממוחשב"',
    gap: 'לפני: אין תיעוד הסכמה לשליחה דיגיטלית.',
    after: 'אחרי: צ׳קבוקס הסכמת נמען בטופס; תווית "מסמך ממוחשב" על ה-PDF הנשלח (חוזר 24/2004).',
    prep: async (page) => {
      await page.getByRole('button', { name: 'מסמך חדש' }).click()
      await page.getByLabel('שם הלקוח / המשלם').fill('דנה לוי')
      await page.getByLabel('תיאור').fill('מנוי חודשי')
      await page.getByLabel('מחיר יחידה').fill('520')
      await page.getByText('הנמען הסכים לקבלת מסמכים ממוחשבים').click()
      await page.waitForTimeout(150)
    },
    target: 'form',
  },
]

const VIEWPORTS = [
  { key: 'desktop', width: 1280, height: 900, dsf: 1 },
  { key: 'mobile', width: 390, height: 844, dsf: 2 },
]

async function capture() {
  const browser = await chromium.launch({ headless: true })
  const images = {} // key -> { desktop, mobile }

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
      await page.goto(`${BASE}/documents`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      try {
        if (shot.prep) await shot.prep(page)
        await page.waitForTimeout(350)
        const el = page.locator(shot.target).first()
        const buf = await el.screenshot()
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

function cardHtml(shot, imgs) {
  const img = (b64, label) =>
    b64
      ? `<figure class="shot shot--${label === 'מובייל' ? 'mobile' : 'desktop'}">
           <img src="data:image/png;base64,${b64}" alt="${shot.title} — ${label}" loading="lazy" />
           <figcaption>${label}</figcaption>
         </figure>`
      : `<figure class="shot shot--missing"><span>אין תמונה (${label})</span></figure>`
  return `<section class="card">
    <h2>${shot.title}</h2>
    <p class="gap">${shot.gap}</p>
    <p class="after">${shot.after}</p>
    <div class="shots">
      ${img(imgs?.desktop, 'דסקטופ')}
      ${img(imgs?.mobile, 'מובייל')}
    </div>
  </section>`
}

function buildHtml(images) {
  const cards = shots.map((s) => cardHtml(s, images[s.key])).join('\n')
  return `<title>תמונות אמת — התאמת המסמכים להוראות ניהול ספרים</title>
<main dir="rtl" lang="he" class="wrap">
  <header class="masthead">
    <p class="eyebrow">רשות המסים · הוראה 4.01 + חוזר 24/2004</p>
    <h1>תמונות אמת מהמערכת — סגירת פערי המסמכים הדיגיטליים</h1>
    <p class="lede">צילומי מסך אמיתיים מהאפליקציה, בדסקטופ ובמובייל, לכל שינוי שבוצע. מתחת לכל כרטיס: מה היה לפני ומה יש עכשיו.</p>
    <div class="caveat"><span>שים לב</span> F (מיגרציה לישראל) ו-G (גיבוי Apps Script) הן תשתית ללא מסך ייעודי, ולכן אינן מיוצגות כאן בצילום.</div>
  </header>
  ${cards}
  <footer class="foot">YamPilates · ענף <code>feature/tax-compliance-docs</code></footer>
</main>
<style>
  :root {
    --paper:#FBFAF7; --surface:#FFFFFF; --ink:#1B2620; --muted:#5E6B63; --line:#E4E8E2;
    --accent:#4C7A64; --ok:#35795A; --danger:#B4462F; --warn:#A9791F; --warn-soft:#F6EFDD;
    --radius:14px; --shadow:0 1px 2px rgba(20,32,27,.05),0 10px 30px rgba(20,32,27,.07);
    --font:"Assistant","Heebo","Segoe UI",system-ui,"Arial",sans-serif;
  }
  :root:not([data-theme="light"]){ @media (prefers-color-scheme: dark){
    --paper:#0F1310; --surface:#171C18; --ink:#E8EDE8; --muted:#98A49C; --line:#262E28;
    --accent:#7FB396; --ok:#74C79A; --danger:#E28468; --warn:#D7B25F; --warn-soft:#241E12;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 12px 32px rgba(0,0,0,.4);
  }}
  :root[data-theme="dark"]{
    --paper:#0F1310; --surface:#171C18; --ink:#E8EDE8; --muted:#98A49C; --line:#262E28;
    --accent:#7FB396; --ok:#74C79A; --danger:#E28468; --warn:#D7B25F; --warn-soft:#241E12;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 12px 32px rgba(0,0,0,.4);
  }
  *{box-sizing:border-box;}
  body{background:var(--paper);color:var(--ink);font-family:var(--font);margin:0;}
  .wrap{max-width:1000px;margin:0 auto;padding:40px 22px 64px;}
  .eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:0 0 10px;}
  h1{font-size:clamp(24px,4vw,38px);line-height:1.14;margin:0 0 12px;font-weight:800;letter-spacing:-.01em;text-wrap:balance;}
  .lede{font-size:17px;line-height:1.6;color:var(--muted);margin:0 0 18px;max-width:64ch;}
  .caveat{background:var(--warn-soft);border:1px solid color-mix(in srgb,var(--warn) 30%,transparent);border-radius:12px;padding:11px 15px;font-size:13.5px;line-height:1.5;}
  .caveat span{font-weight:800;color:var(--warn);margin-inline-end:8px;}
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
