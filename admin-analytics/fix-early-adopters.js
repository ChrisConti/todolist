// fix-early-adopters.js
// Corrige les users qui ont un doublon de profil (Google/Apple sign-in après compte email)
// → met creationDate avant le 15/05/2026 et isPremium: false sur tous leurs docs sans date valide
// Usage : node fix-early-adopters.js
// Dry run (sans écrire) : node fix-early-adopters.js --dry

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const DRY = process.argv.includes('--dry');
const LAUNCH_DATE = new Date('2026-05-15');
const FALLBACK_DATE = admin.firestore.Timestamp.fromDate(new Date('2026-01-01'));

async function run() {
  const snap = await db.collection('Users').get();

  // Grouper par userId
  const byUserId = {};
  for (const doc of snap.docs) {
    const d = doc.data();
    const uid = d.userId;
    if (!uid) continue;
    if (!byUserId[uid]) byUserId[uid] = [];
    byUserId[uid].push({ ref: doc.ref, data: d });
  }

  let fixed = 0;

  for (const [uid, docs] of Object.entries(byUserId)) {
    // Trouver la date la plus ancienne parmi les docs de cet user
    let oldestDate = null;
    for (const { data } of docs) {
      if (!data.creationDate) continue;
      const dt = data.creationDate.toDate();
      if (!oldestDate || dt < oldestDate) oldestDate = dt;
    }

    // Chercher les docs qui n'ont pas de creationDate ou ont une date >= LAUNCH_DATE
    for (const { ref, data } of docs) {
      const hasDate = !!data.creationDate;
      const date = hasDate ? data.creationDate.toDate() : null;
      const needsFix = !hasDate || date >= LAUNCH_DATE;

      if (needsFix) {
        const dateToSet = (oldestDate && oldestDate < LAUNCH_DATE)
          ? admin.firestore.Timestamp.fromDate(oldestDate)
          : FALLBACK_DATE;

        console.log(`${DRY ? '[DRY] ' : ''}Fix doc ${ref.id} (${data.email ?? uid}) : creationDate → ${dateToSet.toDate().toISOString().slice(0, 10)}`);

        if (!DRY) {
          await ref.update({
            creationDate: dateToSet,
            ...(data.isPremium === undefined ? { isPremium: false } : {}),
          });
        }
        fixed++;
      }
    }
  }

  console.log(`\n${DRY ? '[DRY] ' : ''}${fixed} doc(s) ${DRY ? 'à corriger' : 'corrigés'}.`);
}

run().catch(err => { console.error(err); process.exit(1); });
