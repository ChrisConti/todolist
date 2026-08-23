// Distribution quotidienne des signups avril→juin pour diagnostiquer le pic de mai
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TEST_EMAILS = new Set(['android@android.com', 'test@apple.com']);

function toDate(v) {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d) ? null : d; }
  return null;
}

async function main() {
  const snap = await db.collection('Users').get();
  const days = {};
  snap.docs.forEach(doc => {
    const u = doc.data();
    if (TEST_EMAILS.has(u.email)) return;
    const d = toDate(u.creationDate);
    if (!d) return;
    const iso = d.toISOString().slice(0, 10);
    if (iso < '2026-04-01' || iso > '2026-07-13') return;
    days[iso] = days[iso] || { n: 0, ios: 0, android: 0, versions: {} };
    days[iso].n++;
    const p = (u.platform || u.signupPlatform || '').toLowerCase();
    if (p === 'ios') days[iso].ios++;
    if (p === 'android') days[iso].android++;
    if (u.appVersion) days[iso].versions[u.appVersion] = (days[iso].versions[u.appVersion] || 0) + 1;
  });
  Object.keys(days).sort().forEach(k => {
    const d = days[k];
    const bar = '█'.repeat(d.n);
    const vs = Object.entries(d.versions).map(([v, c]) => `${v}:${c}`).join(' ');
    console.log(`${k}  ${String(d.n).padStart(3)}  ios:${String(d.ios).padStart(2)} and:${String(d.android).padStart(2)}  ${bar}  ${vs}`);
  });
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
