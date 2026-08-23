// find-baby-by-name.js
// Usage : node find-baby-by-name.js <nom>

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const NAME = (process.argv[2] ?? '').toLowerCase();

async function run() {
  const snap = await db.collection('Baby').get();
  const matches = snap.docs.filter(d => (d.data().name ?? '').toLowerCase().includes(NAME));

  if (matches.length === 0) {
    console.log(`❌ Aucun bébé trouvé avec "${NAME}"`);
    // Afficher tous les bébés pour debug
    console.log(`\nTous les bébés (${snap.docs.length}) :`);
    for (const doc of snap.docs) {
      const d = doc.data();
      console.log(`  - ${d.name ?? '(sans nom)'}  |  code: ${d.id ?? doc.id}  |  members: ${JSON.stringify(d.members ?? [])}  |  tasks: ${(d.tasks ?? []).length}`);
    }
    return;
  }

  for (const doc of matches) {
    const d = doc.data();
    console.log(`🍼 Bébé : ${d.name}  |  code: ${d.id ?? doc.id}  |  members: ${JSON.stringify(d.members ?? [])}  |  tasks: ${(d.tasks ?? []).length}`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
