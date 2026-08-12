# הקמת גיבוי הקבלות ל-Google Drive (Apps Script)

הסקריפט [`automation/receipts-archive.gs`](../automation/receipts-archive.gs) שומר כל קבלה
שמופקת כקובץ **PDF** בתיקיית **Google Drive** לפי חודש, ומוסיף שורה לגיליון **Google Sheets**
לריכוז. הוא רץ בחשבון ה-Google **שלך**, כך שכל הקבצים נשמרים אצלך.

> זו שכבת **גיבוי/ריכוז** (הוראה 4.01 §25ו). היא אינה מחליפה את שמירת המסד בישראל.

## שלב 1 — הכנה ב-Google Drive

1. צרי **תיקייה** חדשה בדרייב (למשל "קבלות"). היכנסי אליה והעתיקי את המזהה מכתובת ה-URL:
   ```
   drive.google.com/drive/folders/1AbCdEf...   ← החלק המודגש הוא ROOT_FOLDER_ID
   ```
2. צרי **גיליון Google Sheets** חדש (למשל "ריכוז קבלות"). העתיקי את המזהה מה-URL:
   ```
   docs.google.com/spreadsheets/d/1XyZ.../edit  ← החלק שבין d/ ל-/edit הוא LEDGER_SHEET_ID
   ```

## שלב 2 — יצירת הסקריפט

1. כנסי ל-<https://script.google.com> → **New project**.
2. מחקי את הקוד הריק והדביקי את כל תוכן `automation/receipts-archive.gs`.
3. לחצי על גלגל השיניים (**Project Settings**) → גללי ל-**Script Properties** → **Add script property**,
   והוסיפי שלוש שורות:

| שם המפתח (Property) | מה לשים בערך (Value) |
|---|---|
| `ROOT_FOLDER_ID` | מזהה תיקיית הדרייב משלב 1 |
| `LEDGER_SHEET_ID` | מזהה הגיליון משלב 1 |
| `ARCHIVE_TOKEN` | **סיסמת-סוד שאת ממציאה** — מחרוזת אקראית ארוכה (למשל `yam-8f3k9x2p-2026`). זכרי אותה, תצטרכי אותה בשלב 4. |

## שלב 3 — פרסום כ-Web App

1. **Deploy** → **New deployment**.
2. ליד "Select type" לחצי על גלגל השיניים ובחרי **Web app**.
3. הגדירי:
   - **Execute as:** `Me` (החשבון שלך)
   - **Who has access:** `Anyone`
4. **Deploy**, אשרי את ההרשאות (Google תבקש גישה ל-Drive/Sheets — זה תקין), והעתיקי את
   **Web app URL** שמתקבל.

## שלב 4 — חיבור האפליקציה

בקובץ `.env` של הפרויקט הוסיפי:

```
VITE_ARCHIVE_WEBAPP_URL=<ה-Web app URL משלב 3>
VITE_ARCHIVE_TOKEN=<אותו ARCHIVE_TOKEN בדיוק משלב 2>
```

בַּנִי מחדש את האפליקציה (`npm run build`) ופרסי. מעכשיו כל קבלה שתפיקי נשמרת אוטומטית
לתיקיית החודש ב-Drive (למשל `קבלות/2026-08/קבלה 0002 - יעל כהן.pdf`) ונרשמת בגיליון.

## עדכון הסקריפט בהמשך

אחרי כל שינוי בקוד הסקריפט: **Deploy** → **Manage deployments** → עפרון (Edit) →
**Version: New version** → **Deploy**. ה-URL נשאר זהה.

## אבטחה

ה-Web App פתוח לכל מי שיש לו את הקישור, ולכן כל בקשה **חייבת** לשאת את ה-`ARCHIVE_TOKEN`
הנכון — הסקריפט דוחה בקשות בלי הטוקן. אל תשתפי את הטוקן.
