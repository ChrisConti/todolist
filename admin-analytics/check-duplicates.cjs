const admin = require('firebase-admin');
const sa = require('./serviceAccount.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('Users').get();
  const byEmail = {};
  for (const doc of snap.docs) {
    const d = doc.data();
    const key = (d.email || '').toLowerCase();
    if (!key) continue;
    if (!byEmail[key]) byEmail[key] = [];
    byEmail[key].push({ id: doc.id, ...d });
  }
  for (const [email, docs] of Object.entries(byEmail)) {
    if (docs.length > 1) {
      console.log('=== DOUBLON:', email, '===');
      docs.forEach(d => console.log('  ', d.id, '| userId:', d.userId, '| isPremium:', d.isPremium, '| creationDate:', d.creationDate?.toDate?.()));
    }
  }
  console.log('--- Mel specifically ---');
  const mel = snap.docs.filter(doc => (doc.data().email||'').toLowerCase() === 'melissataline@hotmail.fr' || doc.data().userId === 'PHIHFGd1tTSLPK1PQLFyM6wJ1mC3');
  mel.forEach(doc => console.log(doc.id, JSON.stringify(doc.data(), null, 2)));
})();
