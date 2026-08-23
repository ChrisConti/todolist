// find-real-purchasers.js
// Trouve les users isPremium:true dont le compte a été créé APRÈS le cutoff du batch
// grant-premium-launch.js (2026-06-10) → forcément un vrai achat, pas le batch.
// Usage : node find-real-purchasers.js

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const CUTOFF = new Date('2026-06-10');

async function run() {
  const snap = await db.collection('Users').where('isPremium', '==', true).get();

  const realPurchasers = snap.docs.filter(doc => {
    const d = doc.data();
    if (!d.creationDate) return true; // pas de date = pas couvert par le batch
    return d.creationDate.toDate() >= CUTOFF;
  });

  if (realPurchasers.length === 0) {
    console.log('Aucun vrai achat trouvé (tous les isPremium:true viennent du batch early adopter).');
    return;
  }

  for (const doc of realPurchasers) {
    const u = doc.data();
    const uid = u.userId ?? doc.id;
    console.log('─────────────────────────────');
    console.log(`👤 ${u.username ?? '(sans nom)'}  |  ${u.email ?? '?'}`);
    console.log(`   userId: ${uid}`);
    console.log(`   creationDate: ${u.creationDate?.toDate?.().toISOString() ?? '?'}`);
    console.log(`   premiumDate: ${u.premiumDate?.toDate?.().toISOString() ?? '(absent)'}`);

    let babySnap = await db.collection('Baby').where('members', 'array-contains', uid).get();
    if (babySnap.empty) babySnap = await db.collection('Baby').where('userId', '==', uid).get();

    if (babySnap.empty) {
      console.log('   🍼 Aucun bébé trouvé pour cet utilisateur');
    } else {
      for (const b of babySnap.docs) {
        const d = b.data();
        console.log(`   🍼 Bébé : ${d.name ?? '(sans nom)'}  |  tasks: ${(d.tasks ?? []).length}`);
      }
    }
  }
}

run().catch(err => { console.error(err); process.exit(1); });
