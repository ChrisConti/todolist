// find-latest-purchase.js
// Trouve le dernier achat premium réel (champ premiumDate) et son bébé.
// Usage : node find-latest-purchase.js

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
  const snap = await db.collection('Users')
    .where('premiumDate', '!=', null)
    .orderBy('premiumDate', 'desc')
    .limit(5)
    .get();

  if (snap.empty) {
    console.log('Aucun achat premium (champ premiumDate) trouvé.');
    return;
  }

  for (const doc of snap.docs) {
    const u = doc.data();
    console.log('─────────────────────────────');
    console.log(`👤 ${u.username ?? '(sans nom)'}  |  ${u.email ?? '?'}`);
    console.log(`   userId: ${u.userId ?? doc.id}`);
    console.log(`   premiumDate: ${u.premiumDate?.toDate?.().toISOString() ?? '?'}`);
    console.log(`   creationDate: ${u.creationDate?.toDate?.().toISOString().slice(0,10) ?? '?'}`);

    const uid = u.userId ?? doc.id;
    const babySnap = await db.collection('Baby').where('members', 'array-contains', uid).get();
    if (babySnap.empty) {
      const babySnap2 = await db.collection('Baby').where('userId', '==', uid).get();
      for (const b of babySnap2.docs) {
        const d = b.data();
        console.log(`   🍼 Bébé : ${d.name ?? '(sans nom)'}  |  tasks: ${(d.tasks ?? []).length}`);
      }
    } else {
      for (const b of babySnap.docs) {
        const d = b.data();
        console.log(`   🍼 Bébé : ${d.name ?? '(sans nom)'}  |  tasks: ${(d.tasks ?? []).length}`);
      }
    }
  }
}

run().catch(err => { console.error(err); process.exit(1); });
