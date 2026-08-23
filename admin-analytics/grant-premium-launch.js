// grant-premium-launch.js
// Met isPremium: true pour tous les users ayant créé leur compte avant le 10/06/2026
// → ces users obtiennent le premium sans rebuild de l'app
// → seuls ceux avant le 15/05/2026 verront la modale early adopter (géré dans l'app)
// Usage     : node grant-premium-launch.js
// Dry run   : node grant-premium-launch.js --dry

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const DRY = process.argv.includes('--dry');
const CUTOFF = new Date('2026-06-10'); // tous les comptes créés AVANT cette date

async function run() {
  const snap = await db.collection('Users').get();

  let granted = 0;
  let skipped = 0;
  let noDate = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    if (!data.creationDate) {
      console.log(`⚠️  Pas de creationDate : ${doc.id} (${data.email ?? data.userId ?? '?'})`);
      noDate++;
      continue;
    }

    const creationDate = data.creationDate.toDate();

    if (creationDate >= CUTOFF) {
      skipped++;
      continue;
    }

    if (data.isPremium === true) {
      console.log(`✓  Déjà premium : ${data.email ?? data.userId} (${creationDate.toISOString().slice(0, 10)})`);
      skipped++;
      continue;
    }

    console.log(`${DRY ? '[DRY] ' : ''}Grant premium → ${data.email ?? data.userId} (créé le ${creationDate.toISOString().slice(0, 10)})`);

    if (!DRY) {
      await doc.ref.update({ isPremium: true });
    }
    granted++;
  }

  console.log(`
─────────────────────────────────────
${DRY ? '[DRY RUN] ' : ''}Résultat :
  Premium accordé : ${granted}
  Déjà premium / après coupure : ${skipped}
  Sans creationDate : ${noDate}
─────────────────────────────────────`);
}

run().catch(err => { console.error(err); process.exit(1); });
