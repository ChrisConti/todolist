const admin = require('firebase-admin');
const sa = require('./serviceAccount.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const UID = 'PHIHFGd1tTSLPK1PQLFyM6wJ1mC3';
const EMAIL = 'melissataline@hotmail.fr';

(async () => {
  const snap = await db.collection('Baby').get();
  for (const doc of snap.docs) {
    const d = doc.data();
    const str = JSON.stringify(d).toLowerCase();
    if (str.includes(UID.toLowerCase()) || str.includes(EMAIL.toLowerCase()) || (d.name||'').toLowerCase() === 'baby') {
      console.log('---', doc.id, '---');
      console.log(JSON.stringify(d, null, 2).slice(0, 2000));
    }
  }
})();
