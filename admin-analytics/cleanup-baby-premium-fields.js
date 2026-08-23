// Supprime les champs earlyAdopter et premiumUserIds des Baby docs
// node cleanup-baby-premium-fields.js

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function cleanup() {
  const snapshot = await db.collection('Baby').get();
  console.log(`${snapshot.docs.length} Baby docs à traiter`);

  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if ('earlyAdopter' in data || 'premiumUserIds' in data) {
      await doc.ref.update({
        earlyAdopter: admin.firestore.FieldValue.delete(),
        premiumUserIds: admin.firestore.FieldValue.delete(),
      });
      console.log(`✅ ${doc.id} nettoyé`);
      updated++;
    }
  }
  console.log(`\nTerminé — ${updated} docs nettoyés`);
}

cleanup().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
