// find-baby-by-email.js
// Usage : node find-baby-by-email.js <email>

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const EMAIL = process.argv[2];
if (!EMAIL) { console.error('Usage: node find-baby-by-email.js <email>'); process.exit(1); }

async function run() {
  // 1. Trouver le userId via Firebase Auth
  const user = await admin.auth().getUserByEmail(EMAIL).catch(() => null);
  if (!user) { console.error(`❌ Aucun compte Auth pour ${EMAIL}`); process.exit(1); }
  console.log(`✅ Utilisateur Auth : ${user.uid} (${user.email})`);

  // 2. Chercher les bébés où le userId est dans le tableau members
  const snap = await db.collection('Baby').where('members', 'array-contains', user.uid).get();
  if (snap.empty) {
    // Fallback : chercher par createdBy ou userId
    const snap2 = await db.collection('Baby').where('userId', '==', user.uid).get();
    if (snap2.empty) {
      console.error(`❌ Aucun bébé trouvé pour cet utilisateur`);
      process.exit(1);
    }
    for (const doc of snap2.docs) {
      const d = doc.data();
      console.log(`🍼 Bébé : ${d.name ?? '(sans nom)'}  |  code: ${d.id ?? doc.id}  |  tasks: ${(d.tasks ?? []).length}`);
    }
    return;
  }

  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`🍼 Bébé : ${d.name ?? '(sans nom)'}  |  code: ${d.id ?? doc.id}  |  tasks: ${(d.tasks ?? []).length}`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
