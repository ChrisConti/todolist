// Analyse croissance : installs / comptes / bébés par mois (5 derniers mois)
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TEST_EMAILS = new Set(['android@android.com', 'test@apple.com']);
const START = new Date('2026-02-01T00:00:00Z');

function toDate(v) {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d) ? null : d; }
  if (typeof v === 'number') return new Date(v);
  return null;
}
const monthKey = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

async function main() {
  const [installsSnap, usersSnap, babiesSnap] = await Promise.all([
    db.collection('AppInstalls').get().catch(() => ({ docs: [] })),
    db.collection('Users').get(),
    db.collection('Baby').get(),
  ]);

  // --- Installs par mois / plateforme ---
  const installs = {};
  let installsTotal = 0, installsNoDate = 0;
  installsSnap.docs.forEach(doc => {
    const d = doc.data();
    const t = toDate(d.timestamp) || toDate(d.date) || toDate(d.createdAt);
    installsTotal++;
    if (!t) { installsNoDate++; return; }
    const k = monthKey(t);
    installs[k] = installs[k] || { ios: 0, android: 0, other: 0 };
    const p = (d.platform || 'other').toLowerCase();
    installs[k][p === 'ios' ? 'ios' : p === 'android' ? 'android' : 'other']++;
  });

  // --- Users ---
  const testUserIds = new Set();
  const users = [];
  usersSnap.docs.forEach(doc => {
    const u = { userId: doc.id, ...doc.data() };
    if (TEST_EMAILS.has(u.email)) { testUserIds.add(doc.id); return; }
    users.push(u);
  });
  const usersByMonth = {};
  let usersNoDate = 0;
  users.forEach(u => {
    const d = toDate(u.creationDate);
    if (!d) { usersNoDate++; return; }
    const k = monthKey(d);
    usersByMonth[k] = usersByMonth[k] || { total: 0, deleted: 0, google: 0, apple: 0, email: 0, ios: 0, android: 0, unknownPlatform: 0, countries: {} };
    const m = usersByMonth[k];
    m.total++;
    if (u.deleted) m.deleted++;
    if (u.provider === 'google') m.google++;
    else if (u.provider === 'apple') m.apple++;
    else m.email++;
    const plat = (u.platform || u.signupPlatform || '').toLowerCase();
    if (plat === 'ios') m.ios++; else if (plat === 'android') m.android++; else m.unknownPlatform++;
    if (u.country) m.countries[u.country] = (m.countries[u.country] || 0) + 1;
  });

  // --- Babies ---
  const babiesByMonth = {};
  const userIdsWithBaby = new Set();
  babies = [];
  babiesSnap.docs.forEach(doc => {
    const b = { id: doc.id, ...doc.data() };
    if (b.admin && testUserIds.has(b.admin)) return;
    babies.push(b);
    (b.user || []).forEach(uid => userIdsWithBaby.add(uid));
    const d = toDate(b.createdDate) || toDate(b.CreatedDate);
    if (!d) return;
    const k = monthKey(d);
    babiesByMonth[k] = babiesByMonth[k] || { total: 0, gt1: 0, gt5: 0, gt30: 0, gt100: 0, multiParent: 0, activeLast14d: 0 };
    const m = babiesByMonth[k];
    m.total++;
    const n = (b.tasks || []).length;
    if (n > 1) m.gt1++;
    if (n > 5) m.gt5++;
    if (n > 30) m.gt30++;
    if (n > 100) m.gt100++;
    if ((b.user || []).length > 1) m.multiParent++;
    const last = (b.tasks || []).map(t => toDate(t.date)).filter(Boolean).sort((a, b2) => b2 - a)[0];
    if (last && (Date.now() - last.getTime()) < 14 * 86400e3) m.activeLast14d++;
  });

  // --- Activation par cohorte mensuelle (users -> ont un bébé) ---
  const activationByMonth = {};
  users.forEach(u => {
    const d = toDate(u.creationDate);
    if (!d || d < START) return;
    const k = monthKey(d);
    activationByMonth[k] = activationByMonth[k] || { signups: 0, withBaby: 0 };
    activationByMonth[k].signups++;
    if (userIdsWithBaby.has(u.userId)) activationByMonth[k].withBaby++;
  });

  const months = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
  const out = {
    generatedAt: new Date().toISOString(),
    totals: { users: users.length, babies: babies.length, installs: installsTotal, installsNoDate, usersNoDate },
    months: months.map(k => ({
      month: k,
      installs: installs[k] || null,
      users: usersByMonth[k] || null,
      babies: babiesByMonth[k] || null,
      activation: activationByMonth[k] || null,
    })),
    allInstallMonths: installs,
    allUserMonths: Object.fromEntries(Object.entries(usersByMonth).map(([k, v]) => [k, v.total])),
    allBabyMonths: Object.fromEntries(Object.entries(babiesByMonth).map(([k, v]) => [k, v.total])),
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
