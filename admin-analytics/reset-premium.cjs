const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const snap = await db.collection('Users').where('email', '==', 'londondon@london.com').get();
  if (snap.empty) { console.log('User not found'); return; }
  const ref = snap.docs[0].ref;
  await ref.update({ isPremium: false });
  console.log('Done — isPremium set to false for londondon@london.com');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
