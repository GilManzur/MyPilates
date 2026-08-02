# MyPilates

מעקב שיעורים, שעות ושכר מסטודיוים — תזכורות ומעקב תשלומים למאמנות פילאטיס.

PWA בעברית (RTL) למאמנות פילאטיס שעובדות בכמה סטודיוים.

## תכונות

- ניהול סטודיוים עם שכר שעתי נפרד
- יומן שיעורים חודשי
- אישור שעות משיעור ביומן או הזנה ידנית
- סיכום תשלומים חודשי ואישור קבלת תשלום
- נוטיפיקציות תזכורת לשיעורים ולסוף חודש
- מותאם לאייפון (הוספה למסך הבית)

## התחלה מהירה

```bash
npm install
npm run dev
```

ברירת המחדל היא **מצב מקומי** (`VITE_USE_LOCAL_DATA=true`) — הנתונים נשמרים ב-localStorage בלי צורך ב-Firebase.

## Firebase

1. צרי פרויקט Firebase והפעילי Authentication (Email/Password), Firestore, Cloud Messaging
2. העתיקי `.env.example` ל-`.env` ומלאי את ערכי `VITE_FIREBASE_*`
3. הגדירי `VITE_USE_LOCAL_DATA=false`
4. פרסי כללים: `npx -y firebase-tools@latest deploy --only firestore:rules`
5. (אופציונלי) פרסי Functions לנוטיפיקציות מתוזמנות:

```bash
cd functions
npm install
cd ..
npx -y firebase-tools@latest deploy --only functions
```

## סקריפטים

| פקודה | תיאור |
| --- | --- |
| `npm run dev` | שרת פיתוח |
| `npm test` | בדיקות Vitest |
| `npm run build` | בנייה לפרודקשן |
| `npm run lint` | lint |

## מבנה

- `src/features`-style hooks + pages למסכים
- `src/lib/money` — לוגיקת חישוב שכר (נבדקת)
- `src/lib/data` — שכבת נתונים (local / Firebase)
- `functions/` — Cloud Functions לתזכורות
